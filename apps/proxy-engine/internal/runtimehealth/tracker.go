package runtimehealth

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	enginemetrics "github.com/proxy-system/proxy-engine/internal/metrics"
	"github.com/proxy-system/proxy-engine/internal/pool"
	"github.com/proxy-system/proxy-engine/pkg/rabbitmq"
	"github.com/redis/go-redis/v9"
	"github.com/rs/zerolog"
)

type Tracker struct {
	db               *pgxpool.Pool
	rdb              *redis.Client
	repo             *pool.Repository
	rmq              *rabbitmq.Client
	metrics          *enginemetrics.Metrics
	log              zerolog.Logger
	threshold        int
	window           time.Duration
	autoRecheck      bool
	autoRecheckDelay time.Duration
	autoRecheckMax   int
	autoRetryDelay   time.Duration
	mu               sync.RWMutex
}

type RuntimeConfig struct {
	Threshold        int
	Window           time.Duration
	AutoRecheck      bool
	AutoRecheckDelay time.Duration
	AutoRecheckMax   int
	AutoRetryDelay   time.Duration
}

type runtimeSnapshot struct {
	threshold        int
	window           time.Duration
	autoRecheck      bool
	autoRecheckDelay time.Duration
	autoRecheckMax   int
	autoRetryDelay   time.Duration
}

type healthCheckJob struct {
	ProxyEntryID int64  `json:"proxyEntryId"`
	RunID        int64  `json:"runId"`
	Host         string `json:"host"`
	Port         int    `json:"port"`
	Protocol     string `json:"protocol"`
	Username     string `json:"username"`
	Password     string `json:"password"`
	Mode         string `json:"mode"`
}

func New(
	db *pgxpool.Pool,
	rdb *redis.Client,
	repo *pool.Repository,
	rmq *rabbitmq.Client,
	metrics *enginemetrics.Metrics,
	threshold int,
	window time.Duration,
	autoRecheck bool,
	autoRecheckDelay time.Duration,
	autoRecheckMax int,
	autoRetryDelay time.Duration,
	log zerolog.Logger,
) *Tracker {
	return &Tracker{
		db:               db,
		rdb:              rdb,
		repo:             repo,
		rmq:              rmq,
		metrics:          metrics,
		log:              log,
		threshold:        threshold,
		window:           window,
		autoRecheck:      autoRecheck,
		autoRecheckDelay: autoRecheckDelay,
		autoRecheckMax:   autoRecheckMax,
		autoRetryDelay:   autoRetryDelay,
	}
}

func (t *Tracker) Enabled() bool {
	if t == nil || t.db == nil || t.rdb == nil || t.repo == nil {
		return false
	}
	snapshot := t.snapshot()
	return snapshot.threshold > 0 && snapshot.window > 0
}

func (t *Tracker) ObserveSuccess(ctx context.Context, upstreamID int64) {
	if !t.Enabled() || upstreamID <= 0 {
		return
	}
	_ = t.rdb.Del(ctx, t.failureKey(upstreamID)).Err()
}

func (t *Tracker) ObserveFailure(ctx context.Context, listID int64, upstream pool.Upstream, err error) {
	if !t.Enabled() || upstream.ID <= 0 || err == nil {
		return
	}

	key := t.failureKey(upstream.ID)
	count, rerr := t.rdb.Incr(ctx, key).Result()
	if rerr != nil {
		t.log.Warn().Err(rerr).Int64("upstream_id", upstream.ID).Msg("runtime failure counter increment failed")
		return
	}
	if count == 1 {
		_ = t.rdb.Expire(ctx, key, t.windowDuration()).Err()
	}

	status := classify(err)
	if t.metrics != nil {
		t.metrics.ObserveRuntimeFailure(status, "observed")
	}
	var runtimeResultID int64
	t.log.Warn().
		Err(err).
		Int64("list", listID).
		Int64("upstream_id", upstream.ID).
		Int64("failure_count", count).
		Str("status", status).
		Msg("runtime upstream failure observed")

	if int(count) < t.failureThreshold() {
		return
	}

	now := time.Now().UTC()
	errMsg := truncate(err.Error(), 2000)
	tx, txErr := t.db.Begin(ctx)
	if txErr != nil {
		t.log.Error().Err(txErr).Int64("upstream_id", upstream.ID).Msg("runtime failure transaction begin failed")
		return
	}
	defer tx.Rollback(ctx)

	if _, execErr := tx.Exec(ctx,
		`UPDATE proxy_entries
		   SET status = $1,
		       last_checked_at = $2,
		       updated_at = $2
		 WHERE id = $3`,
		status, now, upstream.ID,
	); execErr != nil {
		t.log.Error().Err(execErr).Int64("upstream_id", upstream.ID).Msg("runtime failure status update failed")
		return
	}

	if execErr := tx.QueryRow(ctx,
		`INSERT INTO health_results
		   (proxy_entry_id, mode, healthy, latency_ms, returned_ip, status_code, error_message, checked_at, created_at, updated_at)
		 VALUES ($1, $2, false, NULL, NULL, NULL, $3, $4, $4, $4)
		 RETURNING id`,
		upstream.ID, "request", "[runtime] "+errMsg, now,
	).Scan(&runtimeResultID); execErr != nil {
		t.log.Error().Err(execErr).Int64("upstream_id", upstream.ID).Msg("runtime failure health result insert failed")
		return
	}

	if commitErr := tx.Commit(ctx); commitErr != nil {
		t.log.Error().Err(commitErr).Int64("upstream_id", upstream.ID).Msg("runtime failure transaction commit failed")
		return
	}

	_ = t.rdb.Del(ctx, key).Err()
	t.repo.Invalidate(listID)
	if t.metrics != nil {
		t.metrics.ObserveRuntimeFailure(status, "quarantined")
	}
	t.log.Warn().
		Int64("list", listID).
		Int64("upstream_id", upstream.ID).
		Str("status", status).
		Msg("proxy entry marked unhealthy from runtime failures")
	t.scheduleAutoRecheck(listID, upstream, status, runtimeResultID)
}

func classify(err error) string {
	if err == nil {
		return "unhealthy"
	}
	msg := strings.ToLower(err.Error())
	if strings.Contains(msg, "timeout") || strings.Contains(msg, "deadline") {
		return "timeout"
	}
	return "unhealthy"
}

func (t *Tracker) failureKey(upstreamID int64) string {
	return fmt.Sprintf("runtime-health:fail:%d", upstreamID)
}

func (t *Tracker) autoRecheckKey(upstreamID int64) string {
	return fmt.Sprintf("runtime-health:recheck:%d", upstreamID)
}

func (t *Tracker) scheduleAutoRecheck(listID int64, upstream pool.Upstream, status string, runtimeResultID int64) {
	snapshot := t.snapshot()
	if !snapshot.autoRecheck || t.rmq == nil || listID <= 0 || upstream.ID <= 0 {
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	hold := t.autoRecheckHold()
	scheduled, err := t.rdb.SetNX(ctx, t.autoRecheckKey(upstream.ID), "1", hold).Result()
	if err != nil {
		t.log.Warn().Err(err).Int64("upstream_id", upstream.ID).Msg("runtime auto recheck dedupe failed")
		return
	}
	if !scheduled {
		return
	}

	runID, listName, err := t.createAutoRecheckRun(ctx, listID, upstream.ID, status, runtimeResultID, 1, nil)
	if err != nil {
		_ = t.rdb.Del(context.Background(), t.autoRecheckKey(upstream.ID)).Err()
		t.log.Error().Err(err).Int64("upstream_id", upstream.ID).Msg("runtime auto recheck run create failed")
		return
	}

	job := healthCheckJob{
		ProxyEntryID: upstream.ID,
		RunID:        runID,
		Host:         upstream.Host,
		Port:         upstream.Port,
		Protocol:     upstream.Protocol,
		Username:     upstream.Username,
		Password:     upstream.Password,
		Mode:         "request",
	}

	t.log.Info().
		Int64("list", listID).
		Str("list_name", listName).
		Int64("upstream_id", upstream.ID).
		Int64("run_id", runID).
		Int("attempt", 1).
		Int("max_attempts", t.autoRecheckMaxAttempts()).
		Dur("delay", snapshot.autoRecheckDelay).
		Msg("runtime auto recheck scheduled")

	time.AfterFunc(snapshot.autoRecheckDelay, func() {
		publishCtx, publishCancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer publishCancel()

		if err := t.rmq.PublishJSON(publishCtx, "healthcheck.jobs", job); err != nil {
			_ = t.markRunError(context.Background(), runID, fmt.Sprintf("Runtime auto recheck enqueue failed: %v", err))
			t.scheduleRetryAttempt(listID, upstream, status, runtimeResultID, 2, runID)
			t.log.Error().
				Err(err).
				Int64("run_id", runID).
				Int64("upstream_id", upstream.ID).
				Msg("runtime auto recheck publish failed")
			return
		}

		if err := t.markRunQueued(context.Background(), runID); err != nil {
			t.log.Warn().Err(err).Int64("run_id", runID).Msg("runtime auto recheck queued stage update failed")
		}
		t.scheduleRetryAttempt(listID, upstream, status, runtimeResultID, 2, runID)

		t.log.Info().
			Int64("run_id", runID).
			Int64("upstream_id", upstream.ID).
			Int("attempt", 1).
			Msg("runtime auto recheck published")
	})
}

func (t *Tracker) createAutoRecheckRun(
	ctx context.Context,
	listID int64,
	proxyEntryID int64,
	requestedStatus string,
	runtimeResultID int64,
	retryAttempt int,
	previousRunID *int64,
) (int64, string, error) {
	var teamID int64
	var listName string
	if err := t.db.QueryRow(ctx,
		`SELECT team_id, name
		   FROM proxy_lists
		  WHERE id = $1`,
		listID,
	).Scan(&teamID, &listName); err != nil {
		return 0, "", err
	}

	meta := map[string]any{
		"trigger":           "runtime_auto_recheck",
		"stage":             "scheduled",
		"listName":          listName,
		"requestedStatus":   requestedStatus,
		"runtimeResultId":   runtimeResultID,
		"scheduledDelaySec": int(t.delayForAttempt(retryAttempt) / time.Second),
		"proxyEntryId":      proxyEntryID,
		"retryAttempt":      retryAttempt,
		"retryMax":          t.autoRecheckMaxAttempts(),
		"retryKind":         t.retryKind(retryAttempt),
	}
	if retryAttempt > 1 {
		meta["retryDelaySec"] = int(t.autoRetryDelay / time.Second)
	}
	if previousRunID != nil && *previousRunID > 0 {
		meta["previousRunId"] = *previousRunID
	}

	encodedMeta, err := json.Marshal(meta)
	if err != nil {
		return 0, "", err
	}

	now := time.Now().UTC()
	var runID int64
	if err := t.db.QueryRow(ctx,
		`INSERT INTO health_check_runs
		   (team_id, proxy_list_id, source_type, status, mode, target_url, total_inputs,
		    checked_count, healthy_count, unhealthy_count, timeout_count, invalid_count,
		    error_message, meta, started_at, finished_at, created_at, updated_at)
		 VALUES ($1, $2, 'proxy_list_bulk', 'running', 'request', NULL, 1,
		         0, 0, 0, 0, 0,
		         NULL, $3, $4, NULL, $4, $4)
		 RETURNING id`,
		teamID, listID, encodedMeta, now,
	).Scan(&runID); err != nil {
		return 0, "", err
	}

	return runID, listName, nil
}

func (t *Tracker) scheduleRetryAttempt(
	listID int64,
	upstream pool.Upstream,
	requestedStatus string,
	runtimeResultID int64,
	attempt int,
	previousRunID int64,
) {
	if attempt > t.autoRecheckMaxAttempts() || t.retryDelay() <= 0 {
		return
	}

	t.log.Info().
		Int64("upstream_id", upstream.ID).
		Int64("previous_run_id", previousRunID).
		Int("attempt", attempt).
		Dur("delay", t.retryDelay()).
		Msg("runtime auto recheck retry scheduled")

	time.AfterFunc(t.retryDelay(), func() {
		shouldRetry, reason, err := t.shouldRetryAttempt(context.Background(), upstream.ID, previousRunID)
		if err != nil {
			t.log.Warn().
				Err(err).
				Int64("upstream_id", upstream.ID).
				Int64("previous_run_id", previousRunID).
				Int("attempt", attempt).
				Msg("runtime auto recheck retry evaluation failed")
			return
		}
		if !shouldRetry {
			t.log.Info().
				Int64("upstream_id", upstream.ID).
				Int64("previous_run_id", previousRunID).
				Int("attempt", attempt).
				Str("reason", reason).
				Msg("runtime auto recheck retry skipped")
			return
		}

		runCtx, runCancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer runCancel()

		runID, listName, err := t.createAutoRecheckRun(
			runCtx,
			listID,
			upstream.ID,
			requestedStatus,
			runtimeResultID,
			attempt,
			&previousRunID,
		)
		if err != nil {
			t.log.Error().
				Err(err).
				Int64("upstream_id", upstream.ID).
				Int64("previous_run_id", previousRunID).
				Int("attempt", attempt).
				Msg("runtime auto recheck retry run create failed")
			return
		}

		job := healthCheckJob{
			ProxyEntryID: upstream.ID,
			RunID:        runID,
			Host:         upstream.Host,
			Port:         upstream.Port,
			Protocol:     upstream.Protocol,
			Username:     upstream.Username,
			Password:     upstream.Password,
			Mode:         "request",
		}

		publishCtx, publishCancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer publishCancel()

		if err := t.rmq.PublishJSON(publishCtx, "healthcheck.jobs", job); err != nil {
			_ = t.markRunError(context.Background(), runID, fmt.Sprintf("Runtime auto recheck retry enqueue failed: %v", err))
			t.log.Error().
				Err(err).
				Int64("run_id", runID).
				Int64("upstream_id", upstream.ID).
				Int("attempt", attempt).
				Msg("runtime auto recheck retry publish failed")
			return
		}

		if err := t.markRunQueued(context.Background(), runID); err != nil {
			t.log.Warn().
				Err(err).
				Int64("run_id", runID).
				Int("attempt", attempt).
				Msg("runtime auto recheck retry queued stage update failed")
		}

		t.log.Info().
			Int64("list", listID).
			Str("list_name", listName).
			Int64("run_id", runID).
			Int64("previous_run_id", previousRunID).
			Int64("upstream_id", upstream.ID).
			Int("attempt", attempt).
			Msg("runtime auto recheck retry published")
	})
}

func (t *Tracker) shouldRetryAttempt(ctx context.Context, proxyEntryID int64, previousRunID int64) (bool, string, error) {
	if proxyEntryID <= 0 || previousRunID <= 0 {
		return false, "invalid_retry_context", nil
	}

	runCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var unresolvedExists bool
	if err := t.db.QueryRow(runCtx,
		`SELECT EXISTS (
			SELECT 1
			  FROM health_results
			 WHERE proxy_entry_id = $1
			   AND resolved_at IS NULL
			   AND error_message LIKE '[runtime]%'
		)`,
		proxyEntryID,
	).Scan(&unresolvedExists); err != nil {
		return false, "", err
	}
	if !unresolvedExists {
		return false, "runtime_quarantine_already_resolved", nil
	}

	var status string
	var checkedCount int
	var healthyCount int
	var unhealthyCount int
	var timeoutCount int
	if err := t.db.QueryRow(runCtx,
		`SELECT status, checked_count, healthy_count, unhealthy_count, timeout_count
		   FROM health_check_runs
		  WHERE id = $1`,
		previousRunID,
	).Scan(&status, &checkedCount, &healthyCount, &unhealthyCount, &timeoutCount); err != nil {
		return false, "", err
	}

	switch status {
	case "running":
		return false, "previous_run_still_running", nil
	case "error":
		return true, "previous_run_error", nil
	}

	if healthyCount > 0 {
		return false, "previous_run_recovered_proxy", nil
	}
	if checkedCount == 0 {
		return true, "previous_run_without_results", nil
	}
	if unhealthyCount > 0 || timeoutCount > 0 {
		return true, "previous_run_still_unhealthy", nil
	}

	return false, "no_retry_needed", nil
}

func (t *Tracker) markRunQueued(ctx context.Context, runID int64) error {
	_, err := t.db.Exec(ctx,
		`UPDATE health_check_runs
		    SET meta = jsonb_set(COALESCE(meta, '{}'::jsonb), '{stage}', '"queued"'::jsonb, true),
		        updated_at = $2
		  WHERE id = $1`,
		runID, time.Now().UTC(),
	)
	return err
}

func (t *Tracker) autoRecheckHold() time.Duration {
	snapshot := t.snapshot()
	hold := snapshot.window
	totalDelay := snapshot.autoRecheckDelay
	if t.autoRecheckMaxAttempts() > 1 {
		totalDelay += time.Duration(t.autoRecheckMaxAttempts()-1) * snapshot.autoRetryDelay
	}
	if totalDelay+time.Minute > hold {
		hold = totalDelay + time.Minute
	}
	return hold
}

func (t *Tracker) autoRecheckMaxAttempts() int {
	snapshot := t.snapshot()
	if snapshot.autoRecheckMax <= 1 {
		return 1
	}
	return snapshot.autoRecheckMax
}

func (t *Tracker) delayForAttempt(attempt int) time.Duration {
	if attempt <= 1 {
		return t.autoRecheckDelayDuration()
	}
	return t.retryDelay()
}

func (t *Tracker) retryKind(attempt int) string {
	if attempt <= 1 {
		return "initial"
	}
	return "retry"
}

func (t *Tracker) markRunError(ctx context.Context, runID int64, message string) error {
	now := time.Now().UTC()
	_, err := t.db.Exec(ctx,
		`UPDATE health_check_runs
		    SET status = 'error',
		        error_message = $2,
		        finished_at = $3,
		        meta = jsonb_set(COALESCE(meta, '{}'::jsonb), '{stage}', '"publish_error"'::jsonb, true),
		        updated_at = $3
		  WHERE id = $1`,
		runID, truncate(message, 2000), now,
	)
	return err
}

func (t *Tracker) UpdateConfig(cfg RuntimeConfig) {
	t.mu.Lock()
	t.threshold = cfg.Threshold
	t.window = cfg.Window
	t.autoRecheck = cfg.AutoRecheck
	t.autoRecheckDelay = cfg.AutoRecheckDelay
	t.autoRecheckMax = cfg.AutoRecheckMax
	t.autoRetryDelay = cfg.AutoRetryDelay
	t.mu.Unlock()
}

func (t *Tracker) snapshot() runtimeSnapshot {
	t.mu.RLock()
	defer t.mu.RUnlock()
	return runtimeSnapshot{
		threshold:        t.threshold,
		window:           t.window,
		autoRecheck:      t.autoRecheck,
		autoRecheckDelay: t.autoRecheckDelay,
		autoRecheckMax:   t.autoRecheckMax,
		autoRetryDelay:   t.autoRetryDelay,
	}
}

func (t *Tracker) failureThreshold() int {
	return t.snapshot().threshold
}

func (t *Tracker) windowDuration() time.Duration {
	return t.snapshot().window
}

func (t *Tracker) autoRecheckDelayDuration() time.Duration {
	return t.snapshot().autoRecheckDelay
}

func (t *Tracker) retryDelay() time.Duration {
	return t.snapshot().autoRetryDelay
}

func truncate(value string, max int) string {
	if max <= 0 || len(value) <= max {
		return value
	}
	return value[:max]
}

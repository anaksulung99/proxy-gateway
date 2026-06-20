package runtimehealth

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/proxy-system/proxy-engine/internal/pool"
	"github.com/redis/go-redis/v9"
	"github.com/rs/zerolog"
)

type Tracker struct {
	db        *pgxpool.Pool
	rdb       *redis.Client
	repo      *pool.Repository
	log       zerolog.Logger
	threshold int
	window    time.Duration
}

func New(db *pgxpool.Pool, rdb *redis.Client, repo *pool.Repository, threshold int, window time.Duration, log zerolog.Logger) *Tracker {
	return &Tracker{
		db:        db,
		rdb:       rdb,
		repo:      repo,
		log:       log,
		threshold: threshold,
		window:    window,
	}
}

func (t *Tracker) Enabled() bool {
	return t != nil && t.db != nil && t.rdb != nil && t.repo != nil && t.threshold > 0 && t.window > 0
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
		_ = t.rdb.Expire(ctx, key, t.window).Err()
	}

	status := classify(err)
	t.log.Warn().
		Err(err).
		Int64("list", listID).
		Int64("upstream_id", upstream.ID).
		Int64("failure_count", count).
		Str("status", status).
		Msg("runtime upstream failure observed")

	if int(count) < t.threshold {
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

	if _, execErr := tx.Exec(ctx,
		`INSERT INTO health_results
		   (proxy_entry_id, mode, healthy, latency_ms, returned_ip, status_code, error_message, checked_at, created_at, updated_at)
		 VALUES ($1, $2, false, NULL, NULL, NULL, $3, $4, $4, $4)`,
		upstream.ID, "request", "[runtime] "+errMsg, now,
	); execErr != nil {
		t.log.Error().Err(execErr).Int64("upstream_id", upstream.ID).Msg("runtime failure health result insert failed")
		return
	}

	if commitErr := tx.Commit(ctx); commitErr != nil {
		t.log.Error().Err(commitErr).Int64("upstream_id", upstream.ID).Msg("runtime failure transaction commit failed")
		return
	}

	_ = t.rdb.Del(ctx, key).Err()
	t.repo.Invalidate(listID)
	t.log.Warn().
		Int64("list", listID).
		Int64("upstream_id", upstream.ID).
		Str("status", status).
		Msg("proxy entry marked unhealthy from runtime failures")
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

func truncate(value string, max int) string {
	if max <= 0 || len(value) <= max {
		return value
	}
	return value[:max]
}

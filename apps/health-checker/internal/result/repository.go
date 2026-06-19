package result

import (
	"context"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/proxy-system/health-checker/internal/checker"
	"github.com/rs/zerolog"
)

type Repository struct {
	pool *pgxpool.Pool
	log  zerolog.Logger
}

func NewRepository(pool *pgxpool.Pool, log zerolog.Logger) *Repository {
	return &Repository{pool: pool, log: log}
}

func classify(res checker.CheckResult) string {
	if res.Healthy {
		return "healthy"
	}
	e := strings.ToLower(res.ErrorMessage)
	if strings.Contains(e, "timeout") || strings.Contains(e, "deadline") {
		return "timeout"
	}
	return "unhealthy"
}

// Save persists a check outcome: updates the proxy_entries row and appends a
// health_results record. Runs in a single transaction.
func (r *Repository) Save(ctx context.Context, proxyEntryID int64, res checker.CheckResult) error {
	status := classify(res)

	var latency *int64
	if res.Latency > 0 {
		ms := res.Latency.Milliseconds()
		latency = &ms
	}
	var ip *string
	if res.ReturnedIP != "" {
		v := res.ReturnedIP
		if len(v) > 45 {
			v = v[:45]
		}
		ip = &v
	}
	var statusCode *int
	if res.StatusCode != 0 {
		statusCode = &res.StatusCode
	}
	var errMsg *string
	if res.ErrorMessage != "" {
		errMsg = &res.ErrorMessage
	}
	now := time.Now()

	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx,
		`UPDATE proxy_entries
		   SET status = $1, latency_ms = $2,
		       returned_ip = COALESCE($3, returned_ip),
		       last_checked_at = $4, updated_at = $4
		 WHERE id = $5`,
		status, latency, ip, now, proxyEntryID,
	); err != nil {
		return err
	}

	if _, err := tx.Exec(ctx,
		`INSERT INTO health_results
		   (proxy_entry_id, mode, healthy, latency_ms, returned_ip, status_code, error_message, checked_at, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8, $8)`,
		proxyEntryID, string(res.Mode), res.Healthy, latency, ip, statusCode, errMsg, now,
	); err != nil {
		return err
	}

	return tx.Commit(ctx)
}

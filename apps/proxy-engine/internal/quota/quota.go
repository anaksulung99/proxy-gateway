package quota

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

// Quota tracks monthly bandwidth (downstream bytes) per team and per API key in
// Redis counters, and answers whether a caller is within its limit. Counters
// reset naturally each month (keyed by YYYYMM, with a TTL safety net).
type Quota struct {
	rdb *redis.Client
}

func New(rdb *redis.Client) *Quota {
	return &Quota{rdb: rdb}
}

func period() string {
	return time.Now().UTC().Format("200601")
}

func teamKey(teamID int64) string {
	return fmt.Sprintf("quota:team:%d:%s", teamID, period())
}

func keyKey(keyID int64) string {
	return fmt.Sprintf("quota:key:%d:%s", keyID, period())
}

func (q *Quota) used(ctx context.Context, redisKey string) int64 {
	if q.rdb == nil {
		return 0
	}
	v, err := q.rdb.Get(ctx, redisKey).Int64()
	if err != nil {
		return 0
	}
	return v
}

func (q *Quota) TeamUsed(ctx context.Context, teamID int64) int64 {
	return q.used(ctx, teamKey(teamID))
}

func (q *Quota) KeyUsed(ctx context.Context, keyID int64) int64 {
	return q.used(ctx, keyKey(keyID))
}

// Allowed reports whether the caller is still under its team and key limits
// (limit 0 = unlimited). Returns a human reason when blocked.
func (q *Quota) Allowed(ctx context.Context, teamID, teamLimit, keyID, keyLimit int64) (bool, string) {
	if q.rdb == nil {
		return true, ""
	}
	if teamLimit > 0 && teamID > 0 && q.TeamUsed(ctx, teamID) >= teamLimit {
		return false, "team monthly bandwidth quota exceeded"
	}
	if keyLimit > 0 && keyID > 0 && q.KeyUsed(ctx, keyID) >= keyLimit {
		return false, "api key monthly bandwidth quota exceeded"
	}
	return true, ""
}

// Add records consumed bytes against the team + key counters for this month.
func (q *Quota) Add(ctx context.Context, teamID, keyID, bytes int64) {
	if q.rdb == nil || bytes <= 0 {
		return
	}
	const ttl = 40 * 24 * time.Hour
	if teamID > 0 {
		k := teamKey(teamID)
		q.rdb.IncrBy(ctx, k, bytes)
		q.rdb.Expire(ctx, k, ttl)
	}
	if keyID > 0 {
		k := keyKey(keyID)
		q.rdb.IncrBy(ctx, k, bytes)
		q.rdb.Expire(ctx, k, ttl)
	}
}

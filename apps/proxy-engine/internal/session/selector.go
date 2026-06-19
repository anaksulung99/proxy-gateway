package session

import (
	"context"
	"errors"
	"fmt"
	"math/rand"
	"strconv"
	"sync"
	"time"

	"github.com/proxy-system/proxy-engine/internal/pool"
	"github.com/redis/go-redis/v9"
)

var ErrNoProxies = errors.New("no proxies available for this list/filters")

type Selector struct {
	rdb *redis.Client
	mu  sync.Mutex
	rnd *rand.Rand
}

func NewSelector(rdb *redis.Client) *Selector {
	return &Selector{
		rdb: rdb,
		rnd: rand.New(rand.NewSource(time.Now().UnixNano())),
	}
}

func findByID(candidates []pool.Upstream, id int64) (pool.Upstream, bool) {
	for _, u := range candidates {
		if u.ID == id {
			return u, true
		}
	}
	return pool.Upstream{}, false
}

func (s *Selector) pickRandom(candidates []pool.Upstream) pool.Upstream {
	s.mu.Lock()
	defer s.mu.Unlock()
	return candidates[s.rnd.Intn(len(candidates))]
}

// Pick chooses an upstream honouring the rotation mode.
//   - per_request: random every call
//   - sticky:      one IP per session id, kept for sticky_duration (Redis TTL)
//   - interval:    one IP per list, rotated every interval_minutes (Redis TTL)
func (s *Selector) Pick(ctx context.Context, listID int64, rot pool.Rotation, sessionID string, candidates []pool.Upstream) (pool.Upstream, error) {
	if len(candidates) == 0 {
		return pool.Upstream{}, ErrNoProxies
	}

	switch rot.Type {
	case "sticky":
		if sessionID == "" {
			return s.pickRandom(candidates), nil
		}
		key := s.rotationKey(listID, rot.Type, sessionID)
		ttl := time.Duration(maxInt(rot.StickyMinutes, 1)) * time.Minute
		return s.pinned(ctx, key, ttl, candidates)

	case "interval":
		key := s.rotationKey(listID, rot.Type, sessionID)
		ttl := time.Duration(clamp(rot.IntervalMinutes, 1, 30)) * time.Minute
		return s.pinned(ctx, key, ttl, candidates)

	default: // per_request
		return s.pickRandom(candidates), nil
	}
}

// pinned reuses the Redis-stored upstream if it is still in the pool, else
// picks a fresh one and stores it with the given TTL.
func (s *Selector) pinned(ctx context.Context, key string, ttl time.Duration, candidates []pool.Upstream) (pool.Upstream, error) {
	if s.rdb == nil {
		return s.pickRandom(candidates), nil
	}
	if v, err := s.rdb.Get(ctx, key).Result(); err == nil {
		if id, perr := strconv.ParseInt(v, 10, 64); perr == nil {
			if u, ok := findByID(candidates, id); ok {
				return u, nil
			}
		}
	}
	chosen := s.pickRandom(candidates)
	_ = s.rdb.Set(ctx, key, chosen.ID, ttl).Err()
	return chosen, nil
}

func (s *Selector) Invalidate(ctx context.Context, listID int64, rot pool.Rotation, sessionID string) {
	if s.rdb == nil {
		return
	}
	key := s.rotationKey(listID, rot.Type, sessionID)
	if key == "" {
		return
	}
	_ = s.rdb.Del(ctx, key).Err()
}

func (s *Selector) rotationKey(listID int64, rotationType, sessionID string) string {
	switch rotationType {
	case "sticky":
		if sessionID == "" {
			return ""
		}
		return fmt.Sprintf("session:%d:%s", listID, sessionID)
	case "interval":
		return fmt.Sprintf("rotation:%d", listID)
	default:
		return ""
	}
}

func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}

func clamp(v, lo, hi int) int {
	if v < lo {
		return lo
	}
	if v > hi {
		return hi
	}
	return v
}

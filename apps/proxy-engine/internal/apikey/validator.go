package apikey

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"sync"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Validator authenticates the gateway password against team-scoped API keys
// stored (hashed) in api_keys. Results are cached briefly so each proxied
// request doesn't hit the DB.
type Validator struct {
	db  *pgxpool.Pool
	ttl time.Duration

	mu    sync.RWMutex
	cache map[string]cacheItem // keyed by token hash

	touchMu   sync.Mutex
	lastTouch map[int64]time.Time
}

type cacheItem struct {
	teamID int64
	keyID  int64
	ok     bool
	exp    time.Time
}

func New(db *pgxpool.Pool) *Validator {
	return &Validator{
		db:        db,
		ttl:       30 * time.Second,
		cache:     map[string]cacheItem{},
		lastTouch: map[int64]time.Time{},
	}
}

func hashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

// Validate returns the owning team + key id for a plaintext token. Both
// positive and negative results are cached to blunt brute-force lookups.
func (v *Validator) Validate(ctx context.Context, token string) (teamID, keyID int64, ok bool) {
	if token == "" {
		return 0, 0, false
	}
	h := hashToken(token)

	v.mu.RLock()
	if it, found := v.cache[h]; found && time.Now().Before(it.exp) {
		v.mu.RUnlock()
		return it.teamID, it.keyID, it.ok
	}
	v.mu.RUnlock()

	var tID, kID int64
	err := v.db.QueryRow(ctx,
		`SELECT id, team_id FROM api_keys WHERE token_hash=$1 AND revoked_at IS NULL`, h).
		Scan(&kID, &tID)

	item := cacheItem{exp: time.Now().Add(v.ttl)}
	if err == nil {
		item.teamID, item.keyID, item.ok = tID, kID, true
	} else if err != pgx.ErrNoRows {
		// On DB errors don't cache; just fail this request.
		return 0, 0, false
	}

	v.mu.Lock()
	v.cache[h] = item
	v.mu.Unlock()
	return item.teamID, item.keyID, item.ok
}

// TouchLastUsed updates api_keys.last_used_at at most once per minute per key.
func (v *Validator) TouchLastUsed(keyID int64) {
	if keyID == 0 {
		return
	}
	v.touchMu.Lock()
	if time.Since(v.lastTouch[keyID]) < time.Minute {
		v.touchMu.Unlock()
		return
	}
	v.lastTouch[keyID] = time.Now()
	v.touchMu.Unlock()

	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_, _ = v.db.Exec(ctx, `UPDATE api_keys SET last_used_at=NOW() WHERE id=$1`, keyID)
	}()
}

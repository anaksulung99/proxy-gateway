package pool

import (
	"context"
	"errors"
	"sync"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrListNotFound = errors.New("list not found")

type Upstream struct {
	ID          int64
	Host        string
	Port        int
	Protocol    string
	Username    string
	Password    string
	CountryCode string
	ASN         int
}

type Rotation struct {
	Type             string // sticky | per_request | interval
	StickyMinutes    int
	IntervalMinutes  int
	Protocol         string // http | https | socks5 | any
	GeoTarget        string
	ExcludeCountries []string
	ExcludeASN       []int
}

type ListConfig struct {
	ID       int64
	TeamID   int64
	Name     string
	IsActive bool
	Rotation Rotation
	Proxies  []Upstream
}

type cacheItem struct {
	cfg *ListConfig
	exp time.Time
}

// Repository loads a list's gateway config (rotation + healthy pool) from
// Postgres with a short in-memory cache so each proxied request doesn't hit DB.
type Repository struct {
	db  *pgxpool.Pool
	ttl time.Duration
	mu  sync.RWMutex
	c   map[int64]cacheItem
}

func NewRepository(db *pgxpool.Pool, ttl time.Duration) *Repository {
	return &Repository{db: db, ttl: ttl, c: map[int64]cacheItem{}}
}

func (r *Repository) CacheSize() int {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return len(r.c)
}

func (r *Repository) Invalidate(listIDs ...int64) int {
	if len(listIDs) == 0 {
		return 0
	}
	r.mu.Lock()
	defer r.mu.Unlock()

	removed := 0
	for _, listID := range listIDs {
		if _, ok := r.c[listID]; ok {
			delete(r.c, listID)
			removed++
		}
	}
	return removed
}

func (r *Repository) Flush() int {
	r.mu.Lock()
	defer r.mu.Unlock()
	removed := len(r.c)
	r.c = map[int64]cacheItem{}
	return removed
}

func (r *Repository) Load(ctx context.Context, listID int64) (*ListConfig, error) {
	r.mu.RLock()
	if it, ok := r.c[listID]; ok && time.Now().Before(it.exp) {
		r.mu.RUnlock()
		return it.cfg, nil
	}
	r.mu.RUnlock()

	cfg, err := r.loadFromDB(ctx, listID)
	if err != nil {
		return nil, err
	}
	r.mu.Lock()
	r.c[listID] = cacheItem{cfg: cfg, exp: time.Now().Add(r.ttl)}
	r.mu.Unlock()
	return cfg, nil
}

func (r *Repository) loadFromDB(ctx context.Context, listID int64) (*ListConfig, error) {
	cfg := &ListConfig{ID: listID, Rotation: Rotation{Type: "per_request", Protocol: "any"}}

	// list
	err := r.db.QueryRow(ctx, `SELECT team_id, name, is_active FROM proxy_lists WHERE id=$1`, listID).
		Scan(&cfg.TeamID, &cfg.Name, &cfg.IsActive)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrListNotFound
	}
	if err != nil {
		return nil, err
	}

	// rotation config (optional)
	var (
		rtype       *string
		sticky      *int
		interval    *int
		protocol    *string
		geoTarget   *string
		exCountries []string
		exASN       []int32
	)
	err = r.db.QueryRow(ctx,
		`SELECT rotation_type, sticky_duration_minutes, interval_minutes, protocol,
		        geo_target, exclude_countries, exclude_asn
		   FROM rotation_configs WHERE proxy_list_id=$1`, listID).
		Scan(&rtype, &sticky, &interval, &protocol, &geoTarget, &exCountries, &exASN)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}
	if rtype != nil {
		cfg.Rotation.Type = *rtype
	}
	if protocol != nil {
		cfg.Rotation.Protocol = *protocol
	}
	if sticky != nil {
		cfg.Rotation.StickyMinutes = *sticky
	}
	if interval != nil {
		cfg.Rotation.IntervalMinutes = *interval
	}
	if geoTarget != nil {
		cfg.Rotation.GeoTarget = *geoTarget
	}
	cfg.Rotation.ExcludeCountries = exCountries
	for _, a := range exASN {
		cfg.Rotation.ExcludeASN = append(cfg.Rotation.ExcludeASN, int(a))
	}

	// healthy pool
	rows, err := r.db.Query(ctx,
		`SELECT id, host, port, protocol, COALESCE(username,''), COALESCE(password,''),
		        COALESCE(country_code,''), COALESCE(asn_number,0)
		   FROM proxy_entries
		  WHERE proxy_list_id=$1 AND status='healthy'`, listID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var u Upstream
		if err := rows.Scan(&u.ID, &u.Host, &u.Port, &u.Protocol, &u.Username, &u.Password, &u.CountryCode, &u.ASN); err != nil {
			return nil, err
		}
		cfg.Proxies = append(cfg.Proxies, u)
	}
	return cfg, rows.Err()
}

package usage

import (
	"context"
	"sync/atomic"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog"
)

type Event struct {
	TeamID           int64
	ProxyListID      int64
	ProxyEntryID     int64
	RequestMethod    string
	TargetHost       string
	TargetPort       int
	TargetScheme     string
	IsTunnel         bool
	Success          bool
	StatusCode       int
	AttemptCount     int
	DurationMs       int64
	ResponseBytes    int64
	SessionKey       string
	CountryOverride  string
	SelectedProtocol string
	SelectedCountry  string
	SelectedASN      int
	ErrorMessage     string
	RequestedAt      time.Time
}

type Sink struct {
	db          *pgxpool.Pool
	log         zerolog.Logger
	ch          chan Event
	flushEvery  time.Duration
	batchSize   int
	dropped     atomic.Uint64
	shutdownCtx context.Context
	cancel      context.CancelFunc
}

func NewSink(db *pgxpool.Pool, log zerolog.Logger) *Sink {
	ctx, cancel := context.WithCancel(context.Background())
	s := &Sink{
		db:          db,
		log:         log,
		ch:          make(chan Event, 2048),
		flushEvery:  2 * time.Second,
		batchSize:   100,
		shutdownCtx: ctx,
		cancel:      cancel,
	}
	go s.loop()
	return s
}

func (s *Sink) Record(event Event) {
	select {
	case s.ch <- event:
	default:
		s.dropped.Add(1)
	}
}

func (s *Sink) DroppedCount() uint64 {
	return s.dropped.Load()
}

func (s *Sink) Close(ctx context.Context) error {
	s.cancel()
	done := make(chan struct{})
	go func() {
		defer close(done)
		s.flushRemaining()
	}()

	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-done:
		return nil
	}
}

func (s *Sink) loop() {
	ticker := time.NewTicker(s.flushEvery)
	defer ticker.Stop()

	batch := make([]Event, 0, s.batchSize)
	for {
		select {
		case <-s.shutdownCtx.Done():
			s.insert(batch)
			return
		case event := <-s.ch:
			batch = append(batch, event)
			if len(batch) >= s.batchSize {
				s.insert(batch)
				batch = batch[:0]
			}
		case <-ticker.C:
			if len(batch) > 0 {
				s.insert(batch)
				batch = batch[:0]
			}
		}
	}
}

func (s *Sink) flushRemaining() {
	batch := make([]Event, 0, s.batchSize)
	for {
		select {
		case event := <-s.ch:
			batch = append(batch, event)
			if len(batch) >= s.batchSize {
				s.insert(batch)
				batch = batch[:0]
			}
		default:
			s.insert(batch)
			return
		}
	}
}

func (s *Sink) insert(events []Event) {
	if len(events) == 0 {
		return
	}
	batch := &pgx.Batch{}
	for _, event := range events {
		batch.Queue(
			`INSERT INTO proxy_usage_logs
				(team_id, proxy_list_id, proxy_entry_id, request_method, target_host, target_port,
				 target_scheme, is_tunnel, success, status_code, attempt_count, duration_ms,
				 response_bytes, session_key, country_override, selected_protocol,
				 selected_country, selected_asn, error_message, requested_at, created_at, updated_at)
			 VALUES
				($1, $2, $3, $4, $5, $6,
				 $7, $8, $9, $10, $11, $12,
				 $13, $14, $15, $16,
				 $17, $18, $19, $20, NOW(), NOW())`,
			nullIntValue(event.TeamID),
			nullIntValue(event.ProxyListID),
			nullIntValue(event.ProxyEntryID),
			event.RequestMethod,
			nullString(event.TargetHost),
			nullIntValue(int64(event.TargetPort)),
			nullString(event.TargetScheme),
			event.IsTunnel,
			event.Success,
			nullIntValue(int64(event.StatusCode)),
			event.AttemptCount,
			event.DurationMs,
			event.ResponseBytes,
			nullString(event.SessionKey),
			nullString(event.CountryOverride),
			nullString(event.SelectedProtocol),
			nullString(event.SelectedCountry),
			nullIntValue(int64(event.SelectedASN)),
			nullString(event.ErrorMessage),
			event.RequestedAt,
		)
	}

	br := s.db.SendBatch(context.Background(), batch)
	defer br.Close()
	for range events {
		if _, err := br.Exec(); err != nil {
			s.log.Warn().Err(err).Int("events", len(events)).Msg("proxy usage batch insert failed")
			return
		}
	}
}

func nullIntValue(value int64) any {
	if value == 0 {
		return nil
	}
	return value
}

func nullString(value string) any {
	if value == "" {
		return nil
	}
	return value
}

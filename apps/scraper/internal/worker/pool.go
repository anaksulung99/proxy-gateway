package worker

import (
	"context"
	"encoding/json"
	"time"

	"github.com/proxy-system/scraper/internal/adapters"
	"github.com/proxy-system/scraper/internal/metrics"
	"github.com/proxy-system/scraper/pkg/config"
	"github.com/proxy-system/scraper/pkg/rabbitmq"
	redispkg "github.com/proxy-system/scraper/pkg/redis"
	amqp "github.com/rabbitmq/amqp091-go"
	"github.com/redis/go-redis/v9"
	"github.com/rs/zerolog"
)

// ScrapeJob represents a job consumed from RabbitMQ
type ScrapeJob struct {
	JobID    string `json:"job_id"`
	SourceID string `json:"source_id"`
	Source   string `json:"source"`  // e.g. "proxyscrape", "geonode"
	ListID   string `json:"list_id"` // target proxy list to populate
}

type Pool struct {
	cfg       *config.Config
	log       zerolog.Logger
	redis     *redis.Client
	rmq       *rabbitmq.Client
	workerSem chan struct{}
	done      chan struct{}
	adapters  map[string]adapters.Adapter
}

func NewPool(cfg *config.Config, log zerolog.Logger, redis *redis.Client, rmq *rabbitmq.Client) *Pool {
	p := &Pool{
		cfg:       cfg,
		log:       log,
		redis:     redis,
		rmq:       rmq,
		workerSem: make(chan struct{}, cfg.Workers),
		done:      make(chan struct{}),
	}
	p.adapters = adapters.RegisterAll(log)
	return p
}

func (p *Pool) Start() {
	msgs, err := p.rmq.Channel().Consume(
		"scraper.jobs",
		"scraper-worker",
		false, // manual ack
		false,
		false,
		false,
		nil,
	)
	if err != nil {
		p.log.Fatal().Err(err).Msg("Failed to consume scraper.jobs")
	}

	p.log.Info().Int("workers", p.cfg.Workers).Msg("Scraper worker pool started")

	for {
		select {
		case <-p.done:
			return
		case msg, ok := <-msgs:
			if !ok {
				return
			}
			p.workerSem <- struct{}{} // acquire worker slot
			go p.processJob(msg)
		}
	}
}

func (p *Pool) processJob(msg amqp.Delivery) {
	defer func() { <-p.workerSem }() // release slot

	var job ScrapeJob
	if err := json.Unmarshal(msg.Body, &job); err != nil {
		p.log.Error().Err(err).Msg("Invalid job payload")
		msg.Nack(false, false) // discard to DLQ
		return
	}

	log := p.log.With().Str("source", job.Source).Str("job_id", job.JobID).Logger()
	log.Info().Msg("Processing scrape job")
	startedAt := time.Now()

	adapter, ok := p.adapters[job.Source]
	if !ok {
		metrics.ObserveSourceRun(job.Source, "worker", "unknown_source", startedAt, 0)
		log.Error().Msg("Unknown source adapter")
		msg.Nack(false, false)
		return
	}

	entries, err := adapter.Scrape()
	if err != nil {
		metrics.ObserveSourceRun(job.Source, "worker", "error", startedAt, 0)
		log.Error().Err(err).Dur("duration", time.Since(startedAt)).Msg("Scrape failed")
		msg.Nack(false, true) // requeue once
		return
	}

	metrics.ObserveSourceRun(job.Source, "worker", "success", startedAt, len(entries))
	log.Info().Int("count", len(entries)).Dur("duration", time.Since(startedAt)).Msg("Scraped proxies")
	// TODO Phase 3: dedup, store, enqueue to health checker
	msg.Ack(false)
}

func (p *Pool) Stop(ctx context.Context) {
	close(p.done)
}

// keep linter happy
var _ = redispkg.NewClient

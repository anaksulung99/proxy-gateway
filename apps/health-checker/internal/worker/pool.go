package worker

import (
	"context"
	"encoding/json"
	"strconv"

	"github.com/proxy-system/health-checker/internal/checker"
	"github.com/proxy-system/health-checker/internal/result"
	"github.com/proxy-system/health-checker/pkg/config"
	"github.com/proxy-system/health-checker/pkg/rabbitmq"
	amqp "github.com/rabbitmq/amqp091-go"
	"github.com/rs/zerolog"
)

// incomingJob mirrors the payload published by the AdonisJS app
// (RabbitmqPublisherService.HealthCheckJob).
type incomingJob struct {
	ProxyEntryID int64  `json:"proxyEntryId"`
	RunID        int64  `json:"runId"`
	Host         string `json:"host"`
	Port         int    `json:"port"`
	Protocol     string `json:"protocol"`
	Username     string `json:"username"`
	Password     string `json:"password"`
	Mode         string `json:"mode"`
}

type Pool struct {
	cfg       *config.Config
	log       zerolog.Logger
	svc       *checker.Service
	repo      *result.Repository
	rmq       *rabbitmq.Client
	workerSem chan struct{}
	done      chan struct{}
}

func NewPool(cfg *config.Config, log zerolog.Logger, svc *checker.Service, repo *result.Repository, rmq *rabbitmq.Client) *Pool {
	return &Pool{
		cfg:       cfg,
		log:       log,
		svc:       svc,
		repo:      repo,
		rmq:       rmq,
		workerSem: make(chan struct{}, cfg.Workers),
		done:      make(chan struct{}),
	}
}

func (p *Pool) Start() {
	ch := p.rmq.Channel()
	// durable queue (idempotent) + fair dispatch
	if _, err := ch.QueueDeclare("healthcheck.jobs", true, false, false, false, nil); err != nil {
		p.log.Error().Err(err).Msg("declare healthcheck.jobs failed")
		return
	}
	_ = ch.Qos(p.cfg.Workers, 0, false)

	msgs, err := ch.Consume("healthcheck.jobs", "health-checker-worker", false, false, false, false, nil)
	if err != nil {
		p.log.Error().Err(err).Msg("Failed to consume healthcheck.jobs")
		return
	}

	p.log.Info().Int("workers", p.cfg.Workers).Msg("Health-check consumer started")

	for {
		select {
		case <-p.done:
			return
		case msg, ok := <-msgs:
			if !ok {
				return
			}
			p.workerSem <- struct{}{}
			go p.processJob(msg)
		}
	}
}

func (p *Pool) processJob(msg amqp.Delivery) {
	defer func() { <-p.workerSem }()

	var in incomingJob
	if err := json.Unmarshal(msg.Body, &in); err != nil {
		p.log.Error().Err(err).Msg("invalid check job payload")
		_ = msg.Nack(false, false) // drop malformed
		return
	}

	protocol := in.Protocol
	if protocol == "" || protocol == "any" {
		protocol = "http"
	}

	job := checker.CheckJob{
		ProxyID:  strconv.FormatInt(in.ProxyEntryID, 10),
		JobID:    strconv.FormatInt(in.ProxyEntryID, 10),
		Host:     in.Host,
		Port:     strconv.Itoa(in.Port),
		Protocol: protocol,
		Username: in.Username,
		Password: in.Password,
		Mode:     checker.CheckMode(in.Mode),
	}

	res := p.svc.Run(job)

	ctx, cancel := context.WithTimeout(context.Background(), 10_000_000_000) // 10s
	defer cancel()
	if err := p.repo.Save(ctx, in.RunID, in.ProxyEntryID, res); err != nil {
		p.log.Error().Err(err).Int64("proxy_entry_id", in.ProxyEntryID).Msg("persist result failed")
	} else {
		p.log.Info().
			Int64("proxy_entry_id", in.ProxyEntryID).
			Bool("healthy", res.Healthy).
			Dur("latency", res.Latency).
			Str("mode", string(res.Mode)).
			Msg("check persisted")
	}

	_ = msg.Ack(false) // ack regardless to avoid poison-message loops
}

func (p *Pool) Stop(_ context.Context) {
	close(p.done)
}

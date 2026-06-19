package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/proxy-system/health-checker/internal/checker"
	"github.com/proxy-system/health-checker/internal/result"
	"github.com/proxy-system/health-checker/internal/server"
	"github.com/proxy-system/health-checker/internal/worker"
	"github.com/proxy-system/health-checker/pkg/config"
	"github.com/proxy-system/health-checker/pkg/logger"
	"github.com/proxy-system/health-checker/pkg/postgres"
	"github.com/proxy-system/health-checker/pkg/rabbitmq"
)

func main() {
	cfg := config.Load()
	log := logger.New(cfg.Env)
	log.Info().Str("service", "health-checker").Msg("Starting health checker service")

	// Broker-independent checker (request / crawlee / playwright modes).
	svc := checker.NewService(log, cfg.TimeoutSeconds, cfg.TestURL)

	// Optional async consumer: import-triggered jobs from RabbitMQ -> check -> DB.
	// Supervised with auto-reconnect so a broker blip doesn't permanently stop
	// consumption. Non-fatal: the synchronous HTTP API always runs.
	if cfg.ConsumerEnabled {
		pg, err := postgres.New(cfg.Postgres)
		if err != nil {
			log.Error().Err(err).Msg("Postgres unavailable — async consumer disabled")
		} else {
			repo := result.NewRepository(pg, log)
			go func() {
				for {
					rmq, err := rabbitmq.NewClient(cfg.RabbitMQ)
					if err != nil {
						log.Error().Err(err).Msg("RabbitMQ dial failed — retrying in 5s")
						time.Sleep(5 * time.Second)
						continue
					}
					log.Info().Msg("RabbitMQ consumer connected")
					pool := worker.NewPool(cfg, log, svc, repo, rmq)
					pool.Start() // blocks until the consume channel closes
					rmq.Close()
					log.Warn().Msg("consumer stopped — reconnecting in 5s")
					time.Sleep(5 * time.Second)
				}
			}()
		}
	}

	srv := server.New(cfg, log, svc)
	go func() {
		if err := srv.Start(); err != nil {
			log.Fatal().Err(err).Msg("Server failed")
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
	<-quit

	log.Info().Msg("Shutting down health checker...")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	srv.Shutdown(ctx)
	log.Info().Msg("Health checker stopped")
}

package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/proxy-system/proxy-engine/internal/apikey"
	internalconfig "github.com/proxy-system/proxy-engine/internal/config"
	"github.com/proxy-system/proxy-engine/internal/gateway"
	enginemetrics "github.com/proxy-system/proxy-engine/internal/metrics"
	"github.com/proxy-system/proxy-engine/internal/pool"
	"github.com/proxy-system/proxy-engine/internal/quota"
	"github.com/proxy-system/proxy-engine/internal/runtimehealth"
	"github.com/proxy-system/proxy-engine/internal/server"
	"github.com/proxy-system/proxy-engine/internal/session"
	"github.com/proxy-system/proxy-engine/internal/usage"
	"github.com/proxy-system/proxy-engine/pkg/config"
	"github.com/proxy-system/proxy-engine/pkg/logger"
	"github.com/proxy-system/proxy-engine/pkg/postgres"
	"github.com/proxy-system/proxy-engine/pkg/rabbitmq"
	"github.com/proxy-system/proxy-engine/pkg/redis"
)

func main() {
	cfg := config.Load()
	log := logger.New(cfg.Env)
	log.Info().Str("service", "proxy-engine").Str("env", cfg.Env).Msg("Starting proxy engine")

	pg, err := postgres.New(cfg.Postgres)
	if err != nil {
		log.Fatal().Err(err).Msg("Postgres connection failed")
	}
	defer pg.Close()

	rdb, err := redis.NewClient(cfg.Redis)
	if err != nil {
		log.Fatal().Err(err).Msg("Redis connection failed")
	}

	var rmq *rabbitmq.Client
	if cfg.RuntimeAutoRecheckEnabled {
		// Lazy/self-healing publisher: connects on first use and re-dials after a
		// broker restart, so a slow broker at boot no longer permanently disables
		// auto-recheck (the connection is established when the first job publishes).
		rmq = rabbitmq.NewClient(cfg.RabbitMQ)
		defer rmq.Close()
	}

	repo := pool.NewRepository(pg, 10*time.Second)
	sel := session.NewSelector(rdb)
	usageSink := usage.NewSink(pg, log)
	metrics := enginemetrics.Default(usageSink)
	keyValidator := apikey.New(pg)
	quotaTracker := quota.New(rdb)
	runtimeTracker := runtimehealth.New(
		pg,
		rdb,
		repo,
		rmq,
		metrics,
		cfg.RuntimeFailureThreshold,
		time.Duration(cfg.RuntimeFailureWindowSec)*time.Second,
		cfg.RuntimeAutoRecheckEnabled && rmq != nil,
		time.Duration(cfg.RuntimeAutoRecheckDelaySec)*time.Second,
		cfg.RuntimeAutoRecheckMax,
		time.Duration(cfg.RuntimeAutoRetryDelaySec)*time.Second,
		log,
	)
	metrics.ApplyRuntimeConfig(cfg, cfg.RuntimeAutoRecheckEnabled && rmq != nil)
	gw := gateway.New(repo, sel, cfg.GatewaySecret, keyValidator, quotaTracker, usageSink, runtimeTracker, metrics, log)

	// HTTP forward-proxy listener
	go func() {
		if err := gw.ListenAndServe(":" + cfg.GatewayPort); err != nil {
			log.Fatal().Err(err).Msg("Gateway failed")
		}
	}()

	// SOCKS5 inbound listener
	socks := gateway.NewSocks5Server(gw)
	go func() {
		if err := socks.ListenAndServe(":" + cfg.SocksPort); err != nil {
			log.Error().Err(err).Msg("SOCKS5 listener stopped")
		}
	}()

	// Admin/health (Fiber)
	srv := server.New(cfg, log, repo, usageSink, metrics)
	go func() {
		if err := srv.Start(); err != nil {
			log.Fatal().Err(err).Msg("Admin server failed")
		}
	}()

	watchCtx, watchCancel := context.WithCancel(context.Background())
	defer watchCancel()

	watcher := internalconfig.NewWatcher(log, 5*time.Second)
	if watcher.Enabled() {
		go watcher.Start(watchCtx, func(next *config.Config) {
			gw.UpdateSecret(next.GatewaySecret)
			srv.UpdateInternalSecret(next.InternalSecret)
			runtimeTracker.UpdateConfig(runtimehealth.RuntimeConfig{
				Threshold:        next.RuntimeFailureThreshold,
				Window:           time.Duration(next.RuntimeFailureWindowSec) * time.Second,
				AutoRecheck:      next.RuntimeAutoRecheckEnabled && rmq != nil,
				AutoRecheckDelay: time.Duration(next.RuntimeAutoRecheckDelaySec) * time.Second,
				AutoRecheckMax:   next.RuntimeAutoRecheckMax,
				AutoRetryDelay:   time.Duration(next.RuntimeAutoRetryDelaySec) * time.Second,
			})
			metrics.ApplyRuntimeConfig(next, next.RuntimeAutoRecheckEnabled && rmq != nil)
			metrics.ObserveConfigReload("env_watcher")

			log.Info().
				Bool("gateway_secret_updated", next.GatewaySecret != "").
				Bool("internal_secret_updated", next.InternalSecret != "").
				Int("runtime_failure_threshold", next.RuntimeFailureThreshold).
				Int("runtime_failure_window_sec", next.RuntimeFailureWindowSec).
				Bool("runtime_auto_recheck_enabled", next.RuntimeAutoRecheckEnabled && rmq != nil).
				Int("runtime_auto_recheck_delay_sec", next.RuntimeAutoRecheckDelaySec).
				Int("runtime_auto_recheck_max_attempts", next.RuntimeAutoRecheckMax).
				Int("runtime_auto_retry_delay_sec", next.RuntimeAutoRetryDelaySec).
				Str("note", "listener port changes still require restart").
				Msg("runtime config reloaded from watcher")
		})
	} else {
		log.Info().Msg("config watcher skipped because no .env file was found")
	}

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
	<-quit

	log.Info().Msg("Shutting down proxy engine...")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := gw.Shutdown(ctx); err != nil {
		log.Error().Err(err).Msg("Gateway shutdown error")
	}
	if err := socks.Close(); err != nil {
		log.Error().Err(err).Msg("SOCKS5 shutdown error")
	}
	if err := usageSink.Close(ctx); err != nil {
		log.Error().Err(err).Msg("Usage sink shutdown error")
	}
	if err := srv.Shutdown(ctx); err != nil {
		log.Error().Err(err).Msg("Shutdown error")
	}
	log.Info().Msg("Proxy engine stopped")
}

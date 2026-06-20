package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/proxy-system/proxy-engine/internal/apikey"
	"github.com/proxy-system/proxy-engine/internal/gateway"
	"github.com/proxy-system/proxy-engine/internal/pool"
	"github.com/proxy-system/proxy-engine/internal/quota"
	"github.com/proxy-system/proxy-engine/internal/server"
	"github.com/proxy-system/proxy-engine/internal/session"
	"github.com/proxy-system/proxy-engine/internal/usage"
	"github.com/proxy-system/proxy-engine/pkg/config"
	"github.com/proxy-system/proxy-engine/pkg/logger"
	"github.com/proxy-system/proxy-engine/pkg/postgres"
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

	repo := pool.NewRepository(pg, 10*time.Second)
	sel := session.NewSelector(rdb)
	usageSink := usage.NewSink(pg, log)
	keyValidator := apikey.New(pg)
	quotaTracker := quota.New(rdb)
	gw := gateway.New(repo, sel, cfg.GatewaySecret, keyValidator, quotaTracker, usageSink, log)

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
	srv := server.New(cfg, log, repo, usageSink)
	go func() {
		if err := srv.Start(); err != nil {
			log.Fatal().Err(err).Msg("Admin server failed")
		}
	}()

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

package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/proxy-system/scraper/internal/server"
	"github.com/proxy-system/scraper/pkg/config"
	"github.com/proxy-system/scraper/pkg/logger"
)

func main() {
	cfg := config.Load()
	log := logger.New(cfg.Env)
	log.Info().Str("service", "scraper").Msg("Starting scraper service")

	srv := server.New(cfg, log)
	go func() {
		if err := srv.Start(); err != nil {
			log.Fatal().Err(err).Msg("Server failed")
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
	<-quit

	log.Info().Msg("Shutting down scraper...")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	srv.Shutdown(ctx)
	log.Info().Msg("Scraper stopped")
}

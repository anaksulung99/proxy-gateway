package server

import (
	"context"
	"errors"
	"sort"
	"sync"
	"time"

	"github.com/gofiber/adaptor/v2"
	"github.com/gofiber/fiber/v2"
	recovermw "github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/proxy-system/scraper/internal/adapters"
	"github.com/proxy-system/scraper/internal/metrics"
	"github.com/proxy-system/scraper/pkg/config"
	"github.com/rs/zerolog"
)

var (
	errUnknownSource = errors.New("unknown source")
	errPanic         = errors.New("adapter panicked")
)

type Server struct {
	app      *fiber.App
	cfg      *config.Config
	log      zerolog.Logger
	adapters map[string]adapters.Adapter
}

func New(cfg *config.Config, log zerolog.Logger) *Server {
	app := fiber.New(fiber.Config{
		AppName:      "scraper",
		ReadTimeout:  60 * time.Second,
		WriteTimeout: 120 * time.Second,
	})
	app.Use(recovermw.New())
	srv := &Server{app: app, cfg: cfg, log: log, adapters: adapters.RegisterAll(log)}
	srv.registerRoutes()
	return srv
}

func (s *Server) registerRoutes() {
	s.app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok", "service": "scraper"})
	})
	s.app.Get("/metrics", adaptor.HTTPHandler(promhttp.Handler()))
	s.app.Get("/sources", s.handleSources)
	s.app.Post("/scrape", s.handleScrape)
}

func (s *Server) handleSources(c *fiber.Ctx) error {
	keys := make([]string, 0, len(s.adapters))
	for k := range s.adapters {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	return c.JSON(fiber.Map{"sources": keys})
}

type scrapeRequest struct {
	Sources []string `json:"sources"`
}

type proxyOut struct {
	Host     string `json:"host"`
	Port     string `json:"port"`
	Protocol string `json:"protocol"`
	Country  string `json:"country"`
}

func (s *Server) handleScrape(c *fiber.Ctx) error {
	var req scrapeRequest
	_ = c.BodyParser(&req)

	// default: all sources
	targets := req.Sources
	if len(targets) == 0 {
		for k := range s.adapters {
			targets = append(targets, k)
		}
	}

	type res struct {
		key     string
		proxies []adapters.ProxyEntry
		err     error
		took    time.Duration
	}
	results := make([]res, len(targets))
	var wg sync.WaitGroup
	for i, key := range targets {
		ad, ok := s.adapters[key]
		if !ok {
			metrics.ObserveSourceRun(key, "http", "unknown_source", time.Now(), 0)
			results[i] = res{key: key, err: errUnknownSource}
			continue
		}
		wg.Add(1)
		go func(idx int, k string, a adapters.Adapter) {
			defer wg.Done()
			startedAt := time.Now()
			defer func() {
				if r := recover(); r != nil {
					results[idx] = res{key: k, err: errPanic, took: time.Since(startedAt)}
					metrics.ObserveSourceRun(k, "http", "panic", startedAt, 0)
				}
			}()
			p, err := a.Scrape()
			result := "success"
			if err != nil {
				result = "error"
			}
			metrics.ObserveSourceRun(k, "http", result, startedAt, len(p))
			results[idx] = res{key: k, proxies: p, err: err, took: time.Since(startedAt)}
		}(i, key, ad)
	}
	wg.Wait()

	// merge + dedup across sources
	bySource := fiber.Map{}
	seen := map[string]bool{}
	merged := make([]proxyOut, 0, 1024)
	for _, r := range results {
		if r.err != nil {
			bySource[r.key] = fiber.Map{"count": 0, "error": r.err.Error(), "durationMs": r.took.Milliseconds()}
			continue
		}
		bySource[r.key] = fiber.Map{"count": len(r.proxies), "durationMs": r.took.Milliseconds()}
		for _, p := range r.proxies {
			key := p.Host + ":" + p.Port
			if seen[key] {
				continue
			}
			seen[key] = true
			merged = append(merged, proxyOut{Host: p.Host, Port: p.Port, Protocol: p.Protocol, Country: p.Country})
		}
	}

	return c.JSON(fiber.Map{
		"bySource": bySource,
		"total":    len(merged),
		"proxies":  merged,
	})
}

func (s *Server) Start() error {
	s.log.Info().Str("port", s.cfg.Port).Msg("scraper listening")
	return s.app.Listen(":" + s.cfg.Port)
}

func (s *Server) Shutdown(_ context.Context) error {
	return s.app.Shutdown()
}

package server

import (
	"context"
	"time"

	"github.com/gofiber/adaptor/v2"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/proxy-system/proxy-engine/internal/middleware"
	"github.com/proxy-system/proxy-engine/internal/pool"
	"github.com/proxy-system/proxy-engine/internal/usage"
	"github.com/proxy-system/proxy-engine/pkg/config"
	"github.com/rs/zerolog"
)

type Server struct {
	app       *fiber.App
	cfg       *config.Config
	log       zerolog.Logger
	repo      *pool.Repository
	usage     *usage.Sink
	startedAt time.Time
}

func New(cfg *config.Config, log zerolog.Logger, repo *pool.Repository, usageSink *usage.Sink) *Server {
	app := fiber.New(fiber.Config{
		AppName:      "proxy-engine",
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	})

	app.Use(recover.New())
	app.Use(middleware.Logger(log))

	srv := &Server{app: app, cfg: cfg, log: log, repo: repo, usage: usageSink, startedAt: time.Now()}
	srv.registerRoutes()
	return srv
}

func (s *Server) registerRoutes() {
	s.app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok", "service": "proxy-engine"})
	})
	s.app.Get("/metrics", middleware.InternalAuth(s.cfg.InternalSecret), adaptor.HTTPHandler(promhttp.Handler()))
	s.app.Get("/runtime", middleware.InternalAuth(s.cfg.InternalSecret), func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status":              "ok",
			"service":             "proxy-engine",
			"env":                 s.cfg.Env,
			"gatewayPort":         s.cfg.GatewayPort,
			"adminPort":           s.cfg.Port,
			"workers":             s.cfg.Workers,
			"internalAuthEnabled": s.cfg.InternalSecret != "",
			"cacheSize":           s.repo.CacheSize(),
			"usageDropped":        s.usage.DroppedCount(),
			"uptimeSeconds":       int(time.Since(s.startedAt).Seconds()),
			"timestamp":           time.Now().UTC().Format(time.RFC3339),
		})
	})
	s.app.Post("/cache/invalidate", middleware.InternalAuth(s.cfg.InternalSecret), func(c *fiber.Ctx) error {
		var body struct {
			All     bool    `json:"all"`
			ListIDs []int64 `json:"listIds"`
		}
		if err := c.BodyParser(&body); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "invalid payload",
			})
		}

		var invalidated int
		if body.All {
			invalidated = s.repo.Flush()
		} else {
			invalidated = s.repo.Invalidate(body.ListIDs...)
		}

		return c.JSON(fiber.Map{
			"status":      "ok",
			"invalidated": invalidated,
			"cacheSize":   s.repo.CacheSize(),
			"all":         body.All,
			"listIds":     body.ListIDs,
			"timestamp":   time.Now().UTC().Format(time.RFC3339),
		})
	})
}

func (s *Server) Start() error {
	s.log.Info().Str("port", s.cfg.Port).Msg("admin server listening")
	return s.app.Listen(":" + s.cfg.Port)
}

func (s *Server) Shutdown(ctx context.Context) error {
	return s.app.ShutdownWithContext(ctx)
}

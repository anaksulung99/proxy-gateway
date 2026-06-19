package server

import (
	"context"
	"time"

	"github.com/gofiber/adaptor/v2"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/proxy-system/health-checker/internal/checker"
	"github.com/proxy-system/health-checker/pkg/config"
	"github.com/rs/zerolog"
)

type Server struct {
	app *fiber.App
	cfg *config.Config
	log zerolog.Logger
	svc *checker.Service
}

func New(cfg *config.Config, log zerolog.Logger, svc *checker.Service) *Server {
	app := fiber.New(fiber.Config{
		AppName:      "health-checker",
		ReadTimeout:  60 * time.Second,
		WriteTimeout: 60 * time.Second,
	})
	app.Use(recover.New())
	srv := &Server{app: app, cfg: cfg, log: log, svc: svc}
	srv.registerRoutes()
	return srv
}

type proxyInput struct {
	ProxyID  string `json:"proxyId"`
	Host     string `json:"host"`
	Port     string `json:"port"`
	Protocol string `json:"protocol"`
	Username string `json:"username"`
	Password string `json:"password"`
}

type singleRequest struct {
	proxyInput
	Mode      string `json:"mode"`
	TargetURL string `json:"targetUrl"`
}

type batchRequest struct {
	Mode      string       `json:"mode"`
	TargetURL string       `json:"targetUrl"`
	Proxies   []proxyInput `json:"proxies"`
}

type checkResponse struct {
	ProxyID    string `json:"proxyId"`
	Healthy    bool   `json:"healthy"`
	LatencyMs  int64  `json:"latencyMs"`
	ReturnedIP string `json:"returnedIp"`
	StatusCode int    `json:"statusCode"`
	Error      string `json:"error"`
	Mode       string `json:"mode"`
}

func toJob(p proxyInput, mode, target string) checker.CheckJob {
	return checker.CheckJob{
		JobID:     p.ProxyID,
		ProxyID:   p.ProxyID,
		Host:      p.Host,
		Port:      p.Port,
		Protocol:  p.Protocol,
		Username:  p.Username,
		Password:  p.Password,
		Mode:      checker.CheckMode(mode),
		TargetURL: target,
	}
}

func toResponse(r checker.CheckResult) checkResponse {
	return checkResponse{
		ProxyID:    r.ProxyID,
		Healthy:    r.Healthy,
		LatencyMs:  r.Latency.Milliseconds(),
		ReturnedIP: r.ReturnedIP,
		StatusCode: r.StatusCode,
		Error:      r.ErrorMessage,
		Mode:       string(r.Mode),
	}
}

func (s *Server) registerRoutes() {
	s.app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok", "service": "health-checker"})
	})
	s.app.Get("/metrics", adaptor.HTTPHandler(promhttp.Handler()))

	s.app.Post("/check", s.handleCheck)
	s.app.Post("/check/batch", s.handleBatch)
}

func (s *Server) handleCheck(c *fiber.Ctx) error {
	var req singleRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid body"})
	}
	res := s.svc.Run(toJob(req.proxyInput, req.Mode, req.TargetURL))
	return c.JSON(toResponse(res))
}

func (s *Server) handleBatch(c *fiber.Ctx) error {
	var req batchRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid body"})
	}
	jobs := make([]checker.CheckJob, len(req.Proxies))
	for i, p := range req.Proxies {
		jobs[i] = toJob(p, req.Mode, req.TargetURL)
	}
	results := s.svc.RunBatch(jobs, s.cfg.Workers)
	out := make([]checkResponse, len(results))
	for i, r := range results {
		out[i] = toResponse(r)
	}
	return c.JSON(fiber.Map{"results": out})
}

func (s *Server) Start() error {
	s.log.Info().Str("port", s.cfg.Port).Msg("health-checker listening")
	return s.app.Listen(":" + s.cfg.Port)
}

func (s *Server) Shutdown(_ context.Context) error {
	return s.app.Shutdown()
}

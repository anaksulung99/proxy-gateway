package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
)

func TestInternalAuth(t *testing.T) {
	app := fiber.New()
	app.Get("/internal", InternalAuth("secret-token"), func(c *fiber.Ctx) error {
		return c.SendStatus(fiber.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/internal", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.StatusCode != fiber.StatusUnauthorized {
		t.Fatalf("expected unauthorized without secret, got %d", resp.StatusCode)
	}

	req = httptest.NewRequest(http.MethodGet, "/internal", nil)
	req.Header.Set("X-Internal-Secret", "secret-token")
	resp, err = app.Test(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.StatusCode != fiber.StatusOK {
		t.Fatalf("expected ok with secret, got %d", resp.StatusCode)
	}
}

func TestInternalAuthRequiresConfiguration(t *testing.T) {
	app := fiber.New()
	app.Get("/internal", InternalAuth(""), func(c *fiber.Ctx) error {
		return c.SendStatus(fiber.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/internal", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.StatusCode != fiber.StatusServiceUnavailable {
		t.Fatalf("expected service unavailable when auth is not configured, got %d", resp.StatusCode)
	}
}

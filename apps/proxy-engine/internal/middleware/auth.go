package middleware

import (
	"crypto/subtle"

	"github.com/gofiber/fiber/v2"
)

// InternalAuth validates the shared internal secret between AdonisJS and Go services
func InternalAuth(secret string) fiber.Handler {
	return InternalAuthFunc(func() string { return secret })
}

func InternalAuthFunc(secret func() string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		currentSecret := ""
		if secret != nil {
			currentSecret = secret()
		}
		if currentSecret == "" {
			return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
				"error": "internal auth is not configured",
			})
		}
		token := c.Get("X-Internal-Secret")
		if subtle.ConstantTimeCompare([]byte(token), []byte(currentSecret)) != 1 {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "unauthorized",
			})
		}
		return c.Next()
	}
}

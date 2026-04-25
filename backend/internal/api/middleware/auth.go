package middleware

import (
	"github.com/gofiber/fiber/v2"

	"flowra/internal/repository"
)

func APIKeyAuth(repo repository.TenantRepository) fiber.Handler {
	return func(c *fiber.Ctx) error {

		apiKey := c.Get("X-API-Key")
		if apiKey == "" {
			return fiber.ErrUnauthorized
		}

		tenant, err := repo.GetByAPIKey(c.Context(), apiKey)
		if err != nil {
			return fiber.ErrUnauthorized
		}

		c.Locals("tenant", tenant)

		return c.Next()
	}
}

package middleware

import (
	"github.com/gofiber/fiber/v2"

	"flowra/internal/models"
)

func MockUser() fiber.Handler {
	return func(c *fiber.Ctx) error {

		// TODO: replace with real auth (JWT)
		user := &models.User{
			ID:    "user-1",
			Email: "test@flowra.io",
		}

		c.Locals("user", user)

		return c.Next()
	}
}

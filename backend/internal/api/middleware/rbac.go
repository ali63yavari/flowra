package middleware

import (
	"github.com/gofiber/fiber/v2"

	"flowra/internal/models"
	"flowra/internal/rbac"
	"flowra/internal/repository"
)

func RequirePermission(
	action rbac.Action,
	membershipRepo repository.MembershipRepository,
) fiber.Handler {

	return func(c *fiber.Ctx) error {

		user := c.Locals("user").(*models.User)
		tenant := c.Locals("tenant").(*models.Tenant)

		membership, err := membershipRepo.GetUserMembership(
			c.Context(),
			user.ID,
			tenant.ID,
		)
		if err != nil {
			return fiber.ErrForbidden
		}

		if !rbac.HasPermission(membership.Role, action) {
			return fiber.ErrForbidden
		}

		return c.Next()
	}
}

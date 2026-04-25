package main

import (
	"log"

	"github.com/gofiber/fiber/v2"

	"flowra/internal/api/handlers"
	"flowra/internal/api/middleware"
	"flowra/internal/database"
	"flowra/internal/queue"
	"flowra/internal/rbac"
	"flowra/internal/repository"
)

func main() {
	app := fiber.New()

	db := database.NewDB("postgres://user:pass@localhost:5432/flowra")

	jobRepo := repository.NewJobRepository(db)
	tenantRepo := repository.NewTenantRepository(db)
	membershipRepo := repository.NewMembershipRepository(db)

	q := queue.NewRedisQueue("localhost:6379", "flowra_jobs")

	app.Use(middleware.RequestID())
	app.Use(middleware.MockUser())
	app.Use(middleware.APIKeyAuth(tenantRepo))
	app.Use(middleware.RateLimit())

	execHandler := handlers.NewExecuteHandler(q, jobRepo)

	app.Post(
		"/execute/:id",
		middleware.RequirePermission(rbac.ActionExecuteIntegration, membershipRepo),
		execHandler.Execute,
	)

	log.Fatal(app.Listen(":3000"))
}

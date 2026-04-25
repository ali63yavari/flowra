package main

import (
	"log"

	"github.com/gofiber/fiber/v2"

	"flowra/internal/api/handlers"
	"flowra/internal/api/middleware"
	"flowra/internal/database"
	"flowra/internal/execution"
	"flowra/internal/queue"
	"flowra/internal/repository"
)

func main() {
	app := fiber.New()

	db := database.NewDB("postgres://user:pass@localhost:5432/flowra")

	jobRepo := repository.NewJobRepository(db)
	tenantRepo := repository.NewTenantRepository(db)

	q := queue.NewRedisQueue("localhost:6379", "flowra_jobs")
	execService := execution.NewService()

	app.Use(middleware.RequestID())
	app.Use(middleware.APIKeyAuth(tenantRepo))
	app.Use(middleware.RateLimit())

	execHandler := handlers.NewExecuteHandler(q, jobRepo)
	directHandler := handlers.NewExecuteDirectHandler(execService)

	app.Post("/execute/:id", execHandler.Execute)
	app.Post("/execute-direct", directHandler.Execute)

	log.Fatal(app.Listen(":3000"))
}

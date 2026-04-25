package main

import (
	"log"

	"github.com/gofiber/fiber/v2"

	"flowra/internal/api/handlers"
	"flowra/internal/database"
	"flowra/internal/queue"
	"flowra/internal/repository"
)

func main() {
	app := fiber.New()

	db := database.NewDB("postgres://user:pass@localhost:5432/flowra")

	jobRepo := repository.NewJobRepository(db)
	q := queue.NewRedisQueue("localhost:6379", "flowra_jobs")

	execHandler := handlers.NewExecuteHandler(q, jobRepo)
	jobHandler := handlers.NewJobHandler(jobRepo)

	app.Post("/execute/:id", execHandler.Execute)
	app.Get("/jobs/:id", jobHandler.Get)

	log.Fatal(app.Listen(":3000"))
}

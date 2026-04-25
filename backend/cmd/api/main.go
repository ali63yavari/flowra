package main

import (
	"log"

	"github.com/gofiber/fiber/v2"

	"flowra/internal/api/handlers"
	"flowra/internal/queue"
)

func main() {
	app := fiber.New()

	q := queue.NewRedisQueue("localhost:6379", "flowra_jobs")

	handler := handlers.NewExecuteHandler(q)

	app.Post("/execute/:id", handler.Execute)

	log.Fatal(app.Listen(":3000"))
}

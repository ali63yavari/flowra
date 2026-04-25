package main

import (
	"context"
	"log"

	"flowra/internal/database"
	"flowra/internal/execution"
	"flowra/internal/queue"
	"flowra/internal/repository"
	"flowra/internal/worker"
)

func main() {
	ctx := context.Background()

	db := database.NewDB("postgres://user:pass@localhost:5432/flowra")

	jobRepo := repository.NewJobRepository(db)
	integrationRepo := repository.NewIntegrationRepository(db)

	q := queue.NewRedisQueue("localhost:6379", "flowra_jobs")
	service := execution.NewService()

	w := worker.NewWorker(q, service, jobRepo, integrationRepo)

	log.Println("Worker started...")
	log.Fatal(w.Start(ctx))
}

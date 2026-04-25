package main

import (
	"context"
	"log"

	"flowra/internal/execution"
	"flowra/internal/queue"
	"flowra/internal/worker"
)

func main() {
	ctx := context.Background()

	q := queue.NewRedisQueue("localhost:6379", "flowra_jobs")
	service := execution.NewService()

	w := worker.NewWorker(q, service)

	log.Println("Worker started...")
	if err := w.Start(ctx); err != nil {
		log.Fatal(err)
	}
}

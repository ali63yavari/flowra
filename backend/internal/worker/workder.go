package worker

import (
	"context"
	"log"

	"flowra/internal/execution"
	"flowra/internal/queue"
)

type Worker struct {
	queue   queue.Queue
	service *execution.Service
}

func NewWorker(q queue.Queue, svc *execution.Service) *Worker {
	return &Worker{
		queue:   q,
		service: svc,
	}
}

func (w *Worker) Start(ctx context.Context) error {
	return w.queue.Consume(
		ctx, func(ctx context.Context, job queue.Job) error {
			log.Printf("Processing job: %s", job.ID)

			_, err := w.service.Execute(ctx, jobToDefinition(job), job.Input)
			if err != nil {
				log.Printf("Job failed: %s error: %v", job.ID, err)
				return err
			}

			log.Printf("Job completed: %s", job.ID)
			return nil
		},
	)
}

// Placeholder: replace with DB fetch later
func jobToDefinition(job queue.Job) executionDefinition {
	return executionDefinition{}
}

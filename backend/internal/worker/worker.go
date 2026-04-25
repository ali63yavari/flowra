package worker

import (
	"context"
	"encoding/json"
	"log"

	"flowra/internal/execution"
	"flowra/internal/models"
	"flowra/internal/queue"
	"flowra/internal/repository"
	"flowra/internal/workflow"
)

type Worker struct {
	queue           queue.Queue
	service         *execution.Service
	jobRepo         repository.JobRepository
	integrationRepo repository.IntegrationRepository
}

func NewWorker(
	q queue.Queue,
	svc *execution.Service,
	jobRepo repository.JobRepository,
	integrationRepo repository.IntegrationRepository,
) *Worker {
	return &Worker{
		queue:           q,
		service:         svc,
		jobRepo:         jobRepo,
		integrationRepo: integrationRepo,
	}
}

func (w *Worker) Start(ctx context.Context) error {
	return w.queue.Consume(
		ctx, func(ctx context.Context, job queue.Job) error {

			// 1. mark running
			_ = w.jobRepo.UpdateStatus(ctx, job.ID, models.JobRunning, nil, nil)

			// 2. load integration
			integration, err := w.integrationRepo.GetByID(ctx, job.IntegrationID)
			if err != nil {
				errStr := err.Error()
				_ = w.jobRepo.UpdateStatus(
					ctx,
					job.ID,
					models.JobFailed,
					nil,
					&errStr,
				)
				return err
			}

			// 3. parse DSL → WorkflowDefinition
			var def workflow.WorkflowDefinition
			if err := json.Unmarshal(integration.Config, &def); err != nil {
				errStr := err.Error()
				_ = w.jobRepo.UpdateStatus(
					ctx,
					job.ID,
					models.JobFailed,
					nil,
					&errStr,
				)
				return err
			}

			// 4. execute
			result, err := w.service.Execute(ctx, def, job.Input)
			if err != nil {
				errStr := err.Error()
				_ = w.jobRepo.UpdateStatus(
					ctx,
					job.ID,
					models.JobFailed,
					nil,
					&errStr,
				)
				log.Printf("Job failed: %s", job.ID)
				return err
			}

			// 5. save result
			outputBytes, _ := json.Marshal(result)

			_ = w.jobRepo.UpdateStatus(
				ctx,
				job.ID,
				models.JobSuccess,
				outputBytes,
				nil,
			)

			log.Printf("Job success: %s", job.ID)
			return nil
		},
	)
}

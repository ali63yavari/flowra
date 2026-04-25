package worker

import (
	"context"
	"encoding/json"
	"log"
	"time"

	"flowra/internal/models"
	"flowra/internal/queue"
	"flowra/internal/repository"
	"flowra/internal/workflow"
)

type Worker struct {
	queue           *queue.RedisQueue
	service         ExecutionService
	jobRepo         repository.JobRepository
	integrationRepo repository.IntegrationRepository
}

type ExecutionService interface {
	Execute(
		ctx context.Context,
		def workflow.WorkflowDefinition,
		input map[string]interface{},
	) (map[string]interface{}, error)
}

func NewWorker(
	q *queue.RedisQueue,
	svc ExecutionService,
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

			dbJob, err := w.jobRepo.GetByID(ctx, job.ID)
			if err != nil {
				return err
			}

			// Idempotency: skip if already done
			if dbJob.Status == models.JobSuccess {
				return nil
			}

			_ = w.jobRepo.IncrementAttempts(ctx, job.ID)

			_ = w.jobRepo.UpdateStatus(ctx, job.ID, models.JobRunning, nil, nil)

			integration, err := w.integrationRepo.GetByID(ctx, job.IntegrationID)
			if err != nil {
				return w.failJob(ctx, job, err)
			}

			var def workflow.WorkflowDefinition
			if err := json.Unmarshal(integration.Config, &def); err != nil {
				return w.failJob(ctx, job, err)
			}

			result, err := w.service.Execute(ctx, def, job.Input)
			if err != nil {
				return w.retryOrDead(ctx, job, dbJob, err)
			}

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

func (w *Worker) retryOrDead(
	ctx context.Context,
	job queue.Job,
	dbJob *models.Job,
	err error,
) error {

	if dbJob.Attempts+1 >= dbJob.MaxAttempts {
		errStr := err.Error()
		_ = w.jobRepo.UpdateStatus(ctx, job.ID, models.JobDead, nil, &errStr)
		_ = w.queue.PublishToDLQ(ctx, job)

		log.Printf("Job moved to DLQ: %s", job.ID)
		return err
	}

	// retry with delay
	time.Sleep(2 * time.Second)

	_ = w.jobRepo.UpdateStatus(ctx, job.ID, models.JobRetrying, nil, nil)
	_ = w.queue.Publish(ctx, job)

	log.Printf("Retrying job: %s", job.ID)
	return err
}

func (w *Worker) failJob(ctx context.Context, job queue.Job, err error) error {
	errStr := err.Error()
	_ = w.jobRepo.UpdateStatus(ctx, job.ID, models.JobFailed, nil, &errStr)
	return err
}

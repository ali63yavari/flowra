package worker

import (
	"context"
	"encoding/json"

	"github.com/google/uuid"

	"flowra/internal/models"
	"flowra/internal/observability"
	"flowra/internal/queue"
	"flowra/internal/repository"
	"flowra/internal/workflow"
)

type Worker struct {
	queue           *queue.RedisQueue
	service         ExecutionService
	jobRepo         repository.JobRepository
	integrationRepo repository.IntegrationRepository
	logRepo         repository.ExecutionLogRepository
	logger          *observability.Logger
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
	logRepo repository.ExecutionLogRepository,
) *Worker {
	return &Worker{
		queue:           q,
		service:         svc,
		jobRepo:         jobRepo,
		integrationRepo: integrationRepo,
		logRepo:         logRepo,
		logger:          observability.NewLogger(),
	}
}

func (w *Worker) Start(ctx context.Context) error {
	return w.queue.Consume(
		ctx, func(ctx context.Context, job queue.Job) error {

			w.logger.Info(
				"job started", map[string]interface{}{
					"job_id": job.ID,
				},
			)

			_ = w.jobRepo.UpdateStatus(ctx, job.ID, models.JobRunning, nil, nil)

			integration, err := w.integrationRepo.GetByID(ctx, job.IntegrationID)
			if err != nil {
				return w.fail(ctx, job.ID, err)
			}

			var def workflow.WorkflowDefinition
			if err := json.Unmarshal(integration.Config, &def); err != nil {
				return w.fail(ctx, job.ID, err)
			}

			result, err := w.service.Execute(ctx, def, job.Input)
			if err != nil {
				return w.fail(ctx, job.ID, err)
			}

			outputBytes, _ := json.Marshal(result)

			_ = w.jobRepo.UpdateStatus(
				ctx,
				job.ID,
				models.JobSuccess,
				outputBytes,
				nil,
			)

			observability.JobsProcessed.WithLabelValues("success").Inc()

			w.logRepo.Create(
				ctx, &models.ExecutionLog{
					ID:      uuid.NewString(),
					JobID:   job.ID,
					Level:   "info",
					Message: "job completed successfully",
				},
			)

			w.logger.Info(
				"job success", map[string]interface{}{
					"job_id": job.ID,
				},
			)

			return nil
		},
	)
}

func (w *Worker) fail(ctx context.Context, jobID string, err error) error {
	errStr := err.Error()

	_ = w.jobRepo.UpdateStatus(ctx, jobID, models.JobFailed, nil, &errStr)

	observability.JobsProcessed.WithLabelValues("failed").Inc()

	w.logRepo.Create(
		ctx, &models.ExecutionLog{
			ID:      uuid.NewString(),
			JobID:   jobID,
			Level:   "error",
			Message: errStr,
		},
	)

	w.logger.Error(
		"job failed", map[string]interface{}{
			"job_id": jobID,
			"error":  errStr,
		},
	)

	return err
}

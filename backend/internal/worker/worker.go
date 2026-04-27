package worker

import (
	"context"
	"encoding/json"

	"github.com/google/uuid"

	"flowra/internal/execution"
	"flowra/internal/models"
	"flowra/internal/observability"
	"flowra/internal/queue"
	"flowra/internal/repository"
	"flowra/internal/workflow"
)

type Worker struct {
	queue        *queue.RedisQueue
	service      ExecutionService
	jobRepo      repository.JobRepository
	workflowRepo repository.WorkflowRepository
	logRepo      repository.ExecutionLogRepository
	traceRepo    repository.ExecutionTraceRepository
	variables    VariableResolver
	logger       *observability.Logger
}

type ExecutionService interface {
	ExecuteWithOptions(
		ctx context.Context,
		def workflow.WorkflowDefinition,
		input map[string]interface{},
		options execution.Options,
	) (*execution.Result, error)
}

type VariableResolver interface {
	RuntimeVariables(ctx context.Context, tenantID string, collectionID string, environmentName string) (map[string]interface{}, error)
}

func NewWorker(
	q *queue.RedisQueue,
	svc ExecutionService,
	jobRepo repository.JobRepository,
	workflowRepo repository.WorkflowRepository,
	logRepo repository.ExecutionLogRepository,
	traceRepo repository.ExecutionTraceRepository,
	variables VariableResolver,
) *Worker {
	return &Worker{
		queue:        q,
		service:      svc,
		jobRepo:      jobRepo,
		workflowRepo: workflowRepo,
		logRepo:      logRepo,
		traceRepo:    traceRepo,
		variables:    variables,
		logger:       observability.NewLogger(),
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

			workflowModel, err := w.workflowRepo.GetByID(ctx, job.TenantID, job.WorkflowID)
			if err != nil {
				return w.fail(ctx, job.ID, err)
			}

			var def workflow.WorkflowDefinition
			if err := json.Unmarshal(workflowModel.Definition, &def); err != nil {
				return w.fail(ctx, job.ID, err)
			}

			runtimeVariables, err := w.variables.RuntimeVariables(ctx, job.TenantID, workflowModel.CollectionID, job.Environment)
			if err != nil {
				return w.fail(ctx, job.ID, err)
			}

			result, traces, err := w.executeWithTrace(ctx, def, job.Input, runtimeVariables)
			if err != nil {
				_ = w.persistTraces(ctx, job.ID, traces)
				return w.fail(ctx, job.ID, err)
			}
			_ = w.persistTraces(ctx, job.ID, traces)

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

func (w *Worker) executeWithTrace(
	ctx context.Context,
	def workflow.WorkflowDefinition,
	input map[string]interface{},
	variables map[string]interface{},
) (map[string]interface{}, []workflow.ExecutionTraceEntry, error) {
	result, err := w.service.ExecuteWithOptions(ctx, def, input, execution.Options{
		Variables: variables,
		Trace:     true,
	})
	if err != nil {
		if result != nil {
			return nil, result.Traces, err
		}
		return nil, nil, err
	}
	return result.Data, result.Traces, nil
}

func (w *Worker) persistTraces(ctx context.Context, jobID string, traces []workflow.ExecutionTraceEntry) error {
	modelsToCreate := make([]models.ExecutionTraceEntry, 0, len(traces))
	for _, trace := range traces {
		modelsToCreate = append(modelsToCreate, models.ExecutionTraceEntry{
			ID:            uuid.NewString(),
			JobID:         jobID,
			StepID:        trace.StepID,
			Type:          trace.Type,
			Status:        trace.Status,
			StartedAt:     trace.StartedAt,
			DurationMs:    trace.DurationMs,
			OutputPreview: trace.OutputPreview,
			Error:         trace.Error,
		})
	}
	return w.traceRepo.CreateMany(ctx, modelsToCreate)
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

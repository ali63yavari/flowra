package handlers

import (
	"context"
	"encoding/json"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"flowra/internal/models"
	"flowra/internal/queue"
	"flowra/internal/repository"
	"flowra/internal/usage"
)

type ExecuteHandler struct {
	queue     queue.Queue
	repo      repository.JobRepository
	workflows repository.WorkflowRepository
}

func NewExecuteHandler(
	q queue.Queue,
	repo repository.JobRepository,
	workflows repository.WorkflowRepository,
) *ExecuteHandler {
	return &ExecuteHandler{
		queue:     q,
		repo:      repo,
		workflows: workflows,
	}
}

func (h *ExecuteHandler) Execute(c *fiber.Ctx) error {
	var input map[string]interface{}
	if err := c.BodyParser(&input); err != nil {
		return err
	}

	tenant := c.Locals("tenant").(*models.Tenant)
	workflowID := c.Params("id")
	if _, err := h.workflows.GetByID(context.Background(), tenant.ID, workflowID); err != nil {
		return err
	}

	inputBytes, _ := json.Marshal(input)

	jobID := uuid.NewString()

	job := &models.Job{
		ID:            jobID,
		TenantID:      tenant.ID,
		IntegrationID: workflowID,
		WorkflowID:    workflowID,
		Environment:   c.Get("X-Flowra-Environment"),
		Status:        models.JobQueued,
		Input:         inputBytes,
		MaxAttempts:   3,
		Attempts:      0,
	}

	if err := h.repo.Create(context.Background(), job); err != nil {
		return err
	}

	_ = h.queue.Publish(
		context.Background(), queue.Job{
			ID:            jobID,
			TenantID:      tenant.ID,
			IntegrationID: workflowID,
			WorkflowID:    workflowID,
			Environment:   job.Environment,
			Input:         input,
		},
	)

	usage.TrackExecution(tenant.ID, job.WorkflowID)

	return c.JSON(
		fiber.Map{
			"status": "queued",
			"job_id": jobID,
		},
	)
}

package handlers

import (
	"context"
	"encoding/json"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"flowra/internal/models"
	"flowra/internal/queue"
	"flowra/internal/repository"
)

type ExecuteHandler struct {
	queue queue.Queue
	repo  repository.JobRepository
}

func NewExecuteHandler(
	q queue.Queue,
	repo repository.JobRepository,
) *ExecuteHandler {
	return &ExecuteHandler{
		queue: q,
		repo:  repo,
	}
}

func (h *ExecuteHandler) Execute(c *fiber.Ctx) error {
	var input map[string]interface{}
	if err := c.BodyParser(&input); err != nil {
		return err
	}

	inputBytes, _ := json.Marshal(input)

	jobID := uuid.NewString()

	job := &models.Job{
		ID:            jobID,
		IntegrationID: c.Params("id"),
		Status:        models.JobQueued,
		Input:         inputBytes,
	}

	if err := h.repo.Create(context.Background(), job); err != nil {
		return err
	}

	err := h.queue.Publish(
		context.Background(), queue.Job{
			ID:            jobID,
			IntegrationID: job.IntegrationID,
			Input:         input,
		},
	)
	if err != nil {
		return err
	}

	return c.JSON(
		fiber.Map{
			"status": "queued",
			"job_id": jobID,
		},
	)
}

package handlers

import (
	"context"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"flowra/internal/queue"
)

type ExecuteHandler struct {
	queue queue.Queue
}

func NewExecuteHandler(q queue.Queue) *ExecuteHandler {
	return &ExecuteHandler{queue: q}
}

func (h *ExecuteHandler) Execute(c *fiber.Ctx) error {
	var input map[string]interface{}
	if err := c.BodyParser(&input); err != nil {
		return err
	}

	job := queue.Job{
		ID:            uuid.NewString(),
		IntegrationID: c.Params("id"),
		Input:         input,
	}

	if err := h.queue.Publish(context.Background(), job); err != nil {
		return err
	}

	return c.JSON(
		fiber.Map{
			"status": "queued",
			"job_id": job.ID,
		},
	)
}

package handlers

import (
	"context"

	"github.com/gofiber/fiber/v2"

	"flowra/internal/repository"
)

type JobHandler struct {
	repo   repository.JobRepository
	traces repository.ExecutionTraceRepository
}

func NewJobHandler(repo repository.JobRepository, traces repository.ExecutionTraceRepository) *JobHandler {
	return &JobHandler{repo: repo, traces: traces}
}

func (h *JobHandler) Get(c *fiber.Ctx) error {
	id := c.Params("id")

	job, err := h.repo.GetByID(context.Background(), id)
	if err != nil {
		return err
	}

	traceEntries, err := h.traces.ListByJob(context.Background(), id)
	if err != nil {
		return err
	}

	return c.JSON(fiber.Map{
		"job":    job,
		"traces": traceEntries,
	})
}

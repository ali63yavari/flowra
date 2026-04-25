package handlers

import (
	"context"

	"github.com/gofiber/fiber/v2"

	"flowra/internal/repository"
)

type JobHandler struct {
	repo repository.JobRepository
}

func NewJobHandler(repo repository.JobRepository) *JobHandler {
	return &JobHandler{repo: repo}
}

func (h *JobHandler) Get(c *fiber.Ctx) error {
	id := c.Params("id")

	job, err := h.repo.GetByID(context.Background(), id)
	if err != nil {
		return err
	}

	return c.JSON(job)
}

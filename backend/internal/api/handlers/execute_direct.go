package handlers

import (
	"context"

	"github.com/gofiber/fiber/v2"

	"flowra/internal/execution"
	"flowra/internal/workflow"
)

type ExecuteDirectHandler struct {
	service *execution.Service
}

func NewExecuteDirectHandler(svc *execution.Service) *ExecuteDirectHandler {
	return &ExecuteDirectHandler{
		service: svc,
	}
}

type ExecuteDirectRequest struct {
	Workflow workflow.WorkflowDefinition `json:"workflow"`
	Input    map[string]interface{}      `json:"input"`
}

func (h *ExecuteDirectHandler) Execute(c *fiber.Ctx) error {
	var req ExecuteDirectRequest

	if err := c.BodyParser(&req); err != nil {
		return err
	}

	result, err := h.service.Execute(context.Background(), req.Workflow, req.Input)
	if err != nil {
		return c.Status(500).JSON(
			fiber.Map{
				"status": "error",
				"error":  err.Error(),
			},
		)
	}

	return c.JSON(
		fiber.Map{
			"status": "success",
			"data":   result,
		},
	)
}

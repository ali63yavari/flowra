package handlers

import (
	"github.com/gofiber/fiber/v2"

	"flowra/internal/workflow"
)

type ValidationHandler struct{}

func NewValidationHandler() *ValidationHandler {
	return &ValidationHandler{}
}

type validationRequest struct {
	Workflow  workflow.WorkflowDefinition `json:"workflow"`
	Variables map[string]string           `json:"variables"`
}

func (h *ValidationHandler) Validate(c *fiber.Ctx) error {
	var req validationRequest
	if err := c.BodyParser(&req); err != nil {
		return err
	}
	variableKeys := map[string]bool{}
	for key := range req.Variables {
		variableKeys[key] = true
	}
	if req.Variables == nil {
		variableKeys = nil
	}
	return c.JSON(fiber.Map{
		"issues": workflow.ValidateDefinition(req.Workflow, variableKeys),
	})
}

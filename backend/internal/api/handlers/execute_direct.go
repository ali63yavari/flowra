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
	Workflow            workflow.WorkflowDefinition `json:"workflow"`
	Input               map[string]interface{}      `json:"input"`
	Environment         string                      `json:"environment"`
	TenantVariables     map[string]interface{}      `json:"tenant_variables"`
	CollectionVariables map[string]interface{}      `json:"collection_variables"`
	Trace               bool                        `json:"trace"`
}

func (h *ExecuteDirectHandler) Execute(c *fiber.Ctx) error {
	var req ExecuteDirectRequest

	if err := c.BodyParser(&req); err != nil {
		return err
	}

	result, err := h.service.ExecuteWithOptions(
		context.Background(),
		req.Workflow,
		req.Input,
		execution.Options{
			Variables: mergeDirectVariables(req.TenantVariables, req.CollectionVariables),
			Trace:     req.Trace,
		},
	)
	if err != nil {
		return c.Status(500).JSON(
			fiber.Map{
				"status": "error",
				"error":  err.Error(),
				"traces": resultTraces(result),
			},
		)
	}

	return c.JSON(
		fiber.Map{
			"status": "success",
			"data":   result.Data,
			"traces": result.Traces,
		},
	)
}

func mergeDirectVariables(
	tenantVariables map[string]interface{},
	collectionVariables map[string]interface{},
) map[string]interface{} {
	variables := map[string]interface{}{}
	for key, value := range tenantVariables {
		variables[key] = value
	}
	tenantState := &workflow.ExecutionState{Variables: variables}
	for key, value := range collectionVariables {
		if text, ok := value.(string); ok {
			variables[key] = workflow.ResolveTemplate(text, tenantState)
		} else {
			variables[key] = value
		}
	}
	return variables
}

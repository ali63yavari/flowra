package handlers

import (
	"context"
	"encoding/json"

	"github.com/gofiber/fiber/v2"

	"flowra/internal/execution"
	"flowra/internal/models"
	"flowra/internal/repository"
	"flowra/internal/workflow"
	"flowra/internal/workspace"
)

type WorkflowExecutionHandler struct {
	workflows repository.WorkflowRepository
	variables *workspace.VariableService
	service   *execution.Service
}

func NewWorkflowExecutionHandler(
	workflows repository.WorkflowRepository,
	variables *workspace.VariableService,
	service *execution.Service,
) *WorkflowExecutionHandler {
	return &WorkflowExecutionHandler{
		workflows: workflows,
		variables: variables,
		service:   service,
	}
}

type workflowExecutionRequest struct {
	Input       map[string]interface{} `json:"input"`
	Environment string                 `json:"environment"`
	Trace       bool                   `json:"trace"`
}

func (h *WorkflowExecutionHandler) ExecuteDirect(c *fiber.Ctx) error {
	tenant := c.Locals("tenant").(*models.Tenant)
	workflowModel, err := h.workflows.GetByID(context.Background(), tenant.ID, c.Params("id"))
	if err != nil {
		return err
	}

	var req workflowExecutionRequest
	if err := c.BodyParser(&req); err != nil {
		return err
	}
	if req.Input == nil {
		req.Input = map[string]interface{}{}
	}
	environment := req.Environment
	if environment == "" {
		environment = c.Get("X-Flowra-Environment")
	}

	var def workflow.WorkflowDefinition
	if err := json.Unmarshal(workflowModel.Definition, &def); err != nil {
		return err
	}
	runtimeVariables, err := h.variables.RuntimeVariables(
		context.Background(),
		tenant.ID,
		workflowModel.CollectionID,
		environment,
	)
	if err != nil {
		return err
	}
	result, err := h.service.ExecuteWithOptions(
		context.Background(),
		def,
		req.Input,
		execution.Options{
			Variables: runtimeVariables,
			Trace:     req.Trace,
		},
	)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"status": "error",
			"error":  err.Error(),
			"traces": resultTraces(result),
		})
	}
	return c.JSON(fiber.Map{
		"status": "success",
		"data":   result.Data,
		"traces": result.Traces,
	})
}

func resultTraces(result *execution.Result) []workflow.ExecutionTraceEntry {
	if result == nil {
		return nil
	}
	return result.Traces
}

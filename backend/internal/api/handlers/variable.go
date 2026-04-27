package handlers

import (
	"context"

	"github.com/gofiber/fiber/v2"

	"flowra/internal/models"
	"flowra/internal/workspace"
)

type VariableHandler struct {
	variables *workspace.VariableService
}

func NewVariableHandler(variables *workspace.VariableService) *VariableHandler {
	return &VariableHandler{variables: variables}
}

type variablesRequest struct {
	Variables map[string]string `json:"variables"`
}

type variableBulkDeleteRequest struct {
	Scope        string   `json:"scope"`
	CollectionID string   `json:"collection_id"`
	Environment  string   `json:"environment"`
	Keys         []string `json:"keys"`
}

func (h *VariableHandler) List(c *fiber.Ctx) error {
	tenant := c.Locals("tenant").(*models.Tenant)
	collectionID, err := collectionScope(c)
	if err != nil {
		return err
	}
	variables, err := h.variables.List(
		context.Background(),
		tenant.ID,
		collectionID,
		c.Query("environment"),
		c.QueryBool("reveal"),
	)
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"variables": variables})
}

func (h *VariableHandler) Replace(c *fiber.Ctx) error {
	tenant := c.Locals("tenant").(*models.Tenant)
	collectionID, err := collectionScope(c)
	if err != nil {
		return err
	}
	var req variablesRequest
	if err := c.BodyParser(&req); err != nil {
		return err
	}
	if req.Variables == nil {
		req.Variables = map[string]string{}
	}
	if err := h.variables.Replace(
		context.Background(),
		tenant.ID,
		collectionID,
		c.Query("environment"),
		req.Variables,
	); err != nil {
		return err
	}
	return c.JSON(fiber.Map{"status": "success"})
}

func (h *VariableHandler) DeleteBulk(c *fiber.Ctx) error {
	tenant := c.Locals("tenant").(*models.Tenant)
	var req variableBulkDeleteRequest
	if err := c.BodyParser(&req); err != nil {
		return err
	}
	collectionID, err := collectionScopeFromValues(req.Scope, req.CollectionID)
	if err != nil {
		return err
	}
	if err := h.variables.DeleteBulk(
		context.Background(),
		tenant.ID,
		collectionID,
		req.Environment,
		req.Keys,
	); err != nil {
		return err
	}
	return c.JSON(fiber.Map{"status": "success"})
}

func (h *VariableHandler) Export(c *fiber.Ctx) error {
	tenant := c.Locals("tenant").(*models.Tenant)
	collectionID, err := collectionScope(c)
	if err != nil {
		return err
	}
	payload, err := h.variables.Export(
		context.Background(),
		tenant.ID,
		collectionID,
		c.Query("environment"),
		c.Query("mode", "active"),
		c.QueryBool("reveal"),
	)
	if err != nil {
		return err
	}
	return c.JSON(payload)
}

func collectionScope(c *fiber.Ctx) (*string, error) {
	return collectionScopeFromValues(c.Query("scope", "tenant"), c.Query("collection_id"))
}

func collectionScopeFromValues(scope string, collectionID string) (*string, error) {
	switch scope {
	case "tenant", "":
		return nil, nil
	case "collection":
		if collectionID == "" {
			return nil, fiber.NewError(fiber.StatusBadRequest, "collection_id is required for collection scope")
		}
		return &collectionID, nil
	default:
		return nil, fiber.NewError(fiber.StatusBadRequest, "scope must be tenant or collection")
	}
}

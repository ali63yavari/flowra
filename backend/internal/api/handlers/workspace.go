package handlers

import (
	"context"
	"encoding/json"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/datatypes"

	"flowra/internal/models"
	"flowra/internal/repository"
	"flowra/internal/workflow"
)

type WorkspaceHandler struct {
	collections repository.CollectionRepository
	workflows   repository.WorkflowRepository
}

func NewWorkspaceHandler(
	collections repository.CollectionRepository,
	workflows repository.WorkflowRepository,
) *WorkspaceHandler {
	return &WorkspaceHandler{
		collections: collections,
		workflows:   workflows,
	}
}

type collectionRequest struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	IsOnline    *bool  `json:"is_online"`
	AccessRole  string `json:"access_role"`
}

type workflowRequest struct {
	ID          string                      `json:"id"`
	Name        string                      `json:"name"`
	Description string                      `json:"description"`
	Definition  workflow.WorkflowDefinition `json:"definition"`
}

func (h *WorkspaceHandler) ListCollections(c *fiber.Ctx) error {
	tenant := c.Locals("tenant").(*models.Tenant)
	collections, err := h.collections.List(context.Background(), tenant.ID)
	if err != nil {
		return err
	}
	response := make([]fiber.Map, 0, len(collections))
	for _, collection := range collections {
		workflows, err := h.workflows.ListByCollection(context.Background(), tenant.ID, collection.ID)
		if err != nil {
			return err
		}
		response = append(response, fiber.Map{
			"id":          collection.ID,
			"name":        collection.Name,
			"description": collection.Description,
			"is_online":   collection.IsOnline,
			"access_role": accessRoleOrDefault(collection.AccessRole),
			"created_at":  collection.CreatedAt,
			"updated_at":  collection.UpdatedAt,
			"workflows":   workflows,
		})
	}
	return c.JSON(fiber.Map{"collections": response})
}

func (h *WorkspaceHandler) CreateCollection(c *fiber.Ctx) error {
	tenant := c.Locals("tenant").(*models.Tenant)
	var req collectionRequest
	if err := c.BodyParser(&req); err != nil {
		return err
	}
	if req.Name == "" {
		return fiber.NewError(fiber.StatusBadRequest, "collection name is required")
	}
	collection := &models.Collection{
		ID:          idOrNew(req.ID),
		TenantID:    tenant.ID,
		Name:        req.Name,
		Description: req.Description,
		IsOnline:    boolOrFalse(req.IsOnline),
		AccessRole:  accessRoleOrDefault(req.AccessRole),
	}
	if err := h.collections.Create(context.Background(), collection); err != nil {
		return err
	}
	return c.Status(fiber.StatusCreated).JSON(collection)
}

func (h *WorkspaceHandler) UpdateCollection(c *fiber.Ctx) error {
	tenant := c.Locals("tenant").(*models.Tenant)
	var req collectionRequest
	if err := c.BodyParser(&req); err != nil {
		return err
	}
	updates := map[string]interface{}{}
	if req.Name != "" {
		updates["name"] = req.Name
	}
	updates["description"] = req.Description
	if req.IsOnline != nil {
		updates["is_online"] = *req.IsOnline
	}
	if req.AccessRole != "" {
		updates["access_role"] = req.AccessRole
	}
	if err := h.collections.Update(context.Background(), tenant.ID, c.Params("id"), updates); err != nil {
		return err
	}
	collection, err := h.collections.GetByID(context.Background(), tenant.ID, c.Params("id"))
	if err != nil {
		return err
	}
	return c.JSON(collection)
}

func (h *WorkspaceHandler) DeleteCollection(c *fiber.Ctx) error {
	tenant := c.Locals("tenant").(*models.Tenant)
	if err := h.collections.Delete(context.Background(), tenant.ID, c.Params("id")); err != nil {
		return err
	}
	return c.SendStatus(fiber.StatusNoContent)
}

func (h *WorkspaceHandler) CreateWorkflow(c *fiber.Ctx) error {
	tenant := c.Locals("tenant").(*models.Tenant)
	collectionID := c.Params("collectionId")
	if _, err := h.collections.GetByID(context.Background(), tenant.ID, collectionID); err != nil {
		return err
	}
	var req workflowRequest
	if err := c.BodyParser(&req); err != nil {
		return err
	}
	if req.Name == "" {
		return fiber.NewError(fiber.StatusBadRequest, "workflow name is required")
	}
	definition, err := json.Marshal(req.Definition)
	if err != nil {
		return err
	}
	workflowModel := &models.Workflow{
		ID:           idOrNew(req.ID),
		TenantID:     tenant.ID,
		CollectionID: collectionID,
		Name:         req.Name,
		Description:  req.Description,
		Definition:   datatypes.JSON(definition),
	}
	if err := h.workflows.Create(context.Background(), workflowModel); err != nil {
		return err
	}
	return c.Status(fiber.StatusCreated).JSON(workflowModel)
}

func (h *WorkspaceHandler) GetWorkflow(c *fiber.Ctx) error {
	tenant := c.Locals("tenant").(*models.Tenant)
	workflowModel, err := h.workflows.GetByID(context.Background(), tenant.ID, c.Params("id"))
	if err != nil {
		return err
	}
	return c.JSON(workflowModel)
}

func (h *WorkspaceHandler) UpdateWorkflow(c *fiber.Ctx) error {
	tenant := c.Locals("tenant").(*models.Tenant)
	var req workflowRequest
	if err := c.BodyParser(&req); err != nil {
		return err
	}
	updates := map[string]interface{}{}
	if req.Name != "" {
		updates["name"] = req.Name
	}
	updates["description"] = req.Description
	if req.Definition.Steps != nil {
		definition, err := json.Marshal(req.Definition)
		if err != nil {
			return err
		}
		updates["definition"] = datatypes.JSON(definition)
	}
	if err := h.workflows.Update(context.Background(), tenant.ID, c.Params("id"), updates); err != nil {
		return err
	}
	workflowModel, err := h.workflows.GetByID(context.Background(), tenant.ID, c.Params("id"))
	if err != nil {
		return err
	}
	return c.JSON(workflowModel)
}

func (h *WorkspaceHandler) DeleteWorkflow(c *fiber.Ctx) error {
	tenant := c.Locals("tenant").(*models.Tenant)
	if err := h.workflows.Delete(context.Background(), tenant.ID, c.Params("id")); err != nil {
		return err
	}
	return c.SendStatus(fiber.StatusNoContent)
}

func (h *WorkspaceHandler) DuplicateWorkflow(c *fiber.Ctx) error {
	tenant := c.Locals("tenant").(*models.Tenant)
	var req workflowRequest
	_ = c.BodyParser(&req)
	source, err := h.workflows.GetByID(context.Background(), tenant.ID, c.Params("id"))
	if err != nil {
		return err
	}
	copy := &models.Workflow{
		ID:           idOrNew(req.ID),
		TenantID:     tenant.ID,
		CollectionID: source.CollectionID,
		Name:         source.Name + " copy",
		Description:  source.Description,
		Definition:   source.Definition,
	}
	if err := h.workflows.Create(context.Background(), copy); err != nil {
		return err
	}
	return c.Status(fiber.StatusCreated).JSON(copy)
}

func idOrNew(id string) string {
	if id != "" {
		return id
	}
	return uuid.NewString()
}

func accessRoleOrDefault(role string) string {
	if role == "" {
		return "Collection"
	}
	return role
}

func boolOrFalse(value *bool) bool {
	return value != nil && *value
}

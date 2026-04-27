package handlers

import (
	"context"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"flowra/internal/models"
	"flowra/internal/repository"
)

type EnvironmentHandler struct {
	environments repository.EnvironmentRepository
}

func NewEnvironmentHandler(environments repository.EnvironmentRepository) *EnvironmentHandler {
	return &EnvironmentHandler{environments: environments}
}

type environmentRequest struct {
	Name      string `json:"name"`
	IsDefault bool   `json:"is_default"`
}

func (h *EnvironmentHandler) List(c *fiber.Ctx) error {
	tenant := c.Locals("tenant").(*models.Tenant)
	environments, err := h.environments.List(context.Background(), tenant.ID)
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"environments": environments})
}

func (h *EnvironmentHandler) Create(c *fiber.Ctx) error {
	tenant := c.Locals("tenant").(*models.Tenant)
	var req environmentRequest
	if err := c.BodyParser(&req); err != nil {
		return err
	}
	if req.Name == "" {
		return fiber.NewError(fiber.StatusBadRequest, "environment name is required")
	}
	environment := &models.Environment{
		ID:        uuid.NewString(),
		TenantID:  tenant.ID,
		Name:      req.Name,
		IsDefault: req.IsDefault,
	}
	if err := h.environments.Create(context.Background(), environment); err != nil {
		return err
	}
	return c.Status(fiber.StatusCreated).JSON(environment)
}

func (h *EnvironmentHandler) Update(c *fiber.Ctx) error {
	tenant := c.Locals("tenant").(*models.Tenant)
	var req environmentRequest
	if err := c.BodyParser(&req); err != nil {
		return err
	}
	updates := map[string]interface{}{}
	if req.Name != "" {
		updates["name"] = req.Name
	}
	updates["is_default"] = req.IsDefault
	if err := h.environments.Update(context.Background(), tenant.ID, c.Params("id"), updates); err != nil {
		return err
	}
	environment, err := h.environments.GetByID(context.Background(), tenant.ID, c.Params("id"))
	if err != nil {
		return err
	}
	return c.JSON(environment)
}

func (h *EnvironmentHandler) Delete(c *fiber.Ctx) error {
	tenant := c.Locals("tenant").(*models.Tenant)
	if err := h.environments.Delete(context.Background(), tenant.ID, c.Params("id")); err != nil {
		return err
	}
	return c.SendStatus(fiber.StatusNoContent)
}

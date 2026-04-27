package repository

import (
	"context"

	"flowra/internal/models"

	"gorm.io/gorm"
)

type WorkflowRepository interface {
	ListByCollection(ctx context.Context, tenantID, collectionID string) ([]models.Workflow, error)
	Create(ctx context.Context, workflow *models.Workflow) error
	GetByID(ctx context.Context, tenantID, id string) (*models.Workflow, error)
	Update(ctx context.Context, tenantID, id string, updates map[string]interface{}) error
	Delete(ctx context.Context, tenantID, id string) error
}

type workflowRepository struct {
	db *gorm.DB
}

func NewWorkflowRepository(db *gorm.DB) WorkflowRepository {
	return &workflowRepository{db: db}
}

func (r *workflowRepository) ListByCollection(
	ctx context.Context,
	tenantID string,
	collectionID string,
) ([]models.Workflow, error) {
	var workflows []models.Workflow
	err := r.db.WithContext(ctx).
		Where("tenant_id = ? AND collection_id = ?", tenantID, collectionID).
		Order("created_at asc").
		Find(&workflows).Error
	return workflows, err
}

func (r *workflowRepository) Create(ctx context.Context, workflow *models.Workflow) error {
	return r.db.WithContext(ctx).Create(workflow).Error
}

func (r *workflowRepository) GetByID(ctx context.Context, tenantID, id string) (*models.Workflow, error) {
	var workflow models.Workflow
	err := r.db.WithContext(ctx).First(&workflow, "tenant_id = ? AND id = ?", tenantID, id).Error
	return &workflow, err
}

func (r *workflowRepository) Update(ctx context.Context, tenantID, id string, updates map[string]interface{}) error {
	return r.db.WithContext(ctx).
		Model(&models.Workflow{}).
		Where("tenant_id = ? AND id = ?", tenantID, id).
		Updates(updates).Error
}

func (r *workflowRepository) Delete(ctx context.Context, tenantID, id string) error {
	return r.db.WithContext(ctx).Where("tenant_id = ? AND id = ?", tenantID, id).Delete(&models.Workflow{}).Error
}

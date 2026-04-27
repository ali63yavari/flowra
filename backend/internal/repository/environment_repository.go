package repository

import (
	"context"

	"flowra/internal/models"

	"gorm.io/gorm"
)

type EnvironmentRepository interface {
	List(ctx context.Context, tenantID string) ([]models.Environment, error)
	Create(ctx context.Context, environment *models.Environment) error
	GetByName(ctx context.Context, tenantID, name string) (*models.Environment, error)
	GetByID(ctx context.Context, tenantID, id string) (*models.Environment, error)
	Update(ctx context.Context, tenantID, id string, updates map[string]interface{}) error
	Delete(ctx context.Context, tenantID, id string) error
}

type environmentRepository struct {
	db *gorm.DB
}

func NewEnvironmentRepository(db *gorm.DB) EnvironmentRepository {
	return &environmentRepository{db: db}
}

func (r *environmentRepository) List(ctx context.Context, tenantID string) ([]models.Environment, error) {
	var environments []models.Environment
	err := r.db.WithContext(ctx).Where("tenant_id = ?", tenantID).Order("created_at asc").Find(&environments).Error
	return environments, err
}

func (r *environmentRepository) Create(ctx context.Context, environment *models.Environment) error {
	return r.db.WithContext(ctx).Create(environment).Error
}

func (r *environmentRepository) GetByName(ctx context.Context, tenantID, name string) (*models.Environment, error) {
	var environment models.Environment
	err := r.db.WithContext(ctx).First(&environment, "tenant_id = ? AND name = ?", tenantID, name).Error
	return &environment, err
}

func (r *environmentRepository) GetByID(ctx context.Context, tenantID, id string) (*models.Environment, error) {
	var environment models.Environment
	err := r.db.WithContext(ctx).First(&environment, "tenant_id = ? AND id = ?", tenantID, id).Error
	return &environment, err
}

func (r *environmentRepository) Update(ctx context.Context, tenantID, id string, updates map[string]interface{}) error {
	return r.db.WithContext(ctx).
		Model(&models.Environment{}).
		Where("tenant_id = ? AND id = ?", tenantID, id).
		Updates(updates).Error
}

func (r *environmentRepository) Delete(ctx context.Context, tenantID, id string) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("tenant_id = ? AND environment_id = ?", tenantID, id).Delete(&models.Variable{}).Error; err != nil {
			return err
		}
		return tx.Where("tenant_id = ? AND id = ?", tenantID, id).Delete(&models.Environment{}).Error
	})
}

package repository

import (
	"context"

	"flowra/internal/models"

	"gorm.io/gorm"
)

type IntegrationRepository interface {
	GetByID(ctx context.Context, id string) (*models.Integration, error)
}

type integrationRepository struct {
	db *gorm.DB
}

func NewIntegrationRepository(db *gorm.DB) IntegrationRepository {
	return &integrationRepository{db: db}
}

func (r *integrationRepository) GetByID(
	ctx context.Context,
	id string,
) (*models.Integration, error) {
	var integration models.Integration
	err := r.db.WithContext(ctx).First(&integration, "id = ?", id).Error
	return &integration, err
}

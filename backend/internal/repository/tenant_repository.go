package repository

import (
	"context"

	"flowra/internal/models"

	"gorm.io/gorm"
)

type TenantRepository interface {
	GetByAPIKey(ctx context.Context, apiKey string) (*models.Tenant, error)
}

type tenantRepository struct {
	db *gorm.DB
}

func NewTenantRepository(db *gorm.DB) TenantRepository {
	return &tenantRepository{db: db}
}

func (r *tenantRepository) GetByAPIKey(
	ctx context.Context,
	apiKey string,
) (*models.Tenant, error) {
	var tenant models.Tenant
	err := r.db.WithContext(ctx).
		First(&tenant, "api_key = ?", apiKey).Error
	return &tenant, err
}

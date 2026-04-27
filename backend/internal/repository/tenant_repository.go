package repository

import (
	"context"

	"flowra/internal/models"

	"gorm.io/gorm"
)

type TenantRepository interface {
	GetByAPIKey(ctx context.Context, apiKey string) (*models.Tenant, error)
	Upsert(ctx context.Context, tenant *models.Tenant) error
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

func (r *tenantRepository) Upsert(ctx context.Context, tenant *models.Tenant) error {
	var existing models.Tenant
	found, err := r.findSeedTenant(ctx, tenant.ID, tenant.APIKey, &existing)
	if err != nil {
		return err
	}
	if found {
		existing.Name = tenant.Name
		existing.APIKey = tenant.APIKey
		existing.RateLimitPerMinute = tenant.RateLimitPerMinute
		return r.db.WithContext(ctx).Save(&existing).Error
	}
	return r.db.WithContext(ctx).Create(tenant).Error
}

func (r *tenantRepository) findSeedTenant(
	ctx context.Context,
	id string,
	apiKey string,
	tenant *models.Tenant,
) (bool, error) {
	result := r.db.WithContext(ctx).Where(map[string]interface{}{"id": id}).Limit(1).Find(tenant)
	if result.Error != nil {
		return false, result.Error
	}
	if result.RowsAffected > 0 {
		return true, nil
	}
	result = r.db.WithContext(ctx).Where(map[string]interface{}{"api_key": apiKey}).Limit(1).Find(tenant)
	if result.Error != nil {
		return false, result.Error
	}
	return result.RowsAffected > 0, nil
}

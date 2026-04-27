package repository

import (
	"context"

	"flowra/internal/models"

	"gorm.io/gorm"
)

type VariableRepository interface {
	List(ctx context.Context, tenantID string, collectionID *string, environmentID string) ([]models.Variable, error)
	ReplaceScope(ctx context.Context, tenantID string, collectionID *string, environmentID string, variables []models.Variable) error
	DeleteBulk(ctx context.Context, tenantID string, collectionID *string, environmentID string, keys []string) error
	ListByEnvironment(ctx context.Context, tenantID string, collectionID *string) ([]models.Variable, error)
}

type variableRepository struct {
	db *gorm.DB
}

func NewVariableRepository(db *gorm.DB) VariableRepository {
	return &variableRepository{db: db}
}

func (r *variableRepository) List(
	ctx context.Context,
	tenantID string,
	collectionID *string,
	environmentID string,
) ([]models.Variable, error) {
	var variables []models.Variable
	query := r.db.WithContext(ctx).
		Where("tenant_id = ? AND environment_id = ?", tenantID, environmentID)
	query = scopeQuery(query, collectionID)
	err := query.Order("key asc").Find(&variables).Error
	return variables, err
}

func (r *variableRepository) ReplaceScope(
	ctx context.Context,
	tenantID string,
	collectionID *string,
	environmentID string,
	variables []models.Variable,
) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		query := tx.Where("tenant_id = ? AND environment_id = ?", tenantID, environmentID)
		query = scopeQuery(query, collectionID)
		if err := query.Delete(&models.Variable{}).Error; err != nil {
			return err
		}
		if len(variables) == 0 {
			return nil
		}
		return tx.Create(&variables).Error
	})
}

func (r *variableRepository) DeleteBulk(
	ctx context.Context,
	tenantID string,
	collectionID *string,
	environmentID string,
	keys []string,
) error {
	query := r.db.WithContext(ctx).
		Where("tenant_id = ? AND environment_id = ? AND key IN ?", tenantID, environmentID, keys)
	query = scopeQuery(query, collectionID)
	return query.Delete(&models.Variable{}).Error
}

func (r *variableRepository) ListByEnvironment(
	ctx context.Context,
	tenantID string,
	collectionID *string,
) ([]models.Variable, error) {
	var variables []models.Variable
	query := r.db.WithContext(ctx).Where("tenant_id = ?", tenantID)
	query = scopeQuery(query, collectionID)
	err := query.Order("environment_id asc, key asc").Find(&variables).Error
	return variables, err
}

func scopeQuery(query *gorm.DB, collectionID *string) *gorm.DB {
	if collectionID == nil {
		return query.Where("collection_id IS NULL")
	}
	return query.Where("collection_id = ?", *collectionID)
}

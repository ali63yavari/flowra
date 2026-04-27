package repository

import (
	"context"

	"flowra/internal/models"

	"gorm.io/gorm"
)

type CollectionRepository interface {
	List(ctx context.Context, tenantID string) ([]models.Collection, error)
	Create(ctx context.Context, collection *models.Collection) error
	GetByID(ctx context.Context, tenantID, id string) (*models.Collection, error)
	Update(ctx context.Context, tenantID, id string, updates map[string]interface{}) error
	Delete(ctx context.Context, tenantID, id string) error
}

type collectionRepository struct {
	db *gorm.DB
}

func NewCollectionRepository(db *gorm.DB) CollectionRepository {
	return &collectionRepository{db: db}
}

func (r *collectionRepository) List(ctx context.Context, tenantID string) ([]models.Collection, error) {
	var collections []models.Collection
	err := r.db.WithContext(ctx).Where("tenant_id = ?", tenantID).Order("created_at asc").Find(&collections).Error
	return collections, err
}

func (r *collectionRepository) Create(ctx context.Context, collection *models.Collection) error {
	return r.db.WithContext(ctx).Create(collection).Error
}

func (r *collectionRepository) GetByID(ctx context.Context, tenantID, id string) (*models.Collection, error) {
	var collection models.Collection
	err := r.db.WithContext(ctx).First(&collection, "tenant_id = ? AND id = ?", tenantID, id).Error
	return &collection, err
}

func (r *collectionRepository) Update(
	ctx context.Context,
	tenantID string,
	id string,
	updates map[string]interface{},
) error {
	return r.db.WithContext(ctx).
		Model(&models.Collection{}).
		Where("tenant_id = ? AND id = ?", tenantID, id).
		Updates(updates).Error
}

func (r *collectionRepository) Delete(ctx context.Context, tenantID, id string) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("tenant_id = ? AND collection_id = ?", tenantID, id).Delete(&models.Workflow{}).Error; err != nil {
			return err
		}
		if err := tx.Where("tenant_id = ? AND collection_id = ?", tenantID, id).Delete(&models.Variable{}).Error; err != nil {
			return err
		}
		return tx.Where("tenant_id = ? AND id = ?", tenantID, id).Delete(&models.Collection{}).Error
	})
}

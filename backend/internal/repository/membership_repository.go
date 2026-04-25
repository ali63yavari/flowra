package repository

import (
	"context"

	"flowra/internal/models"

	"gorm.io/gorm"
)

type MembershipRepository interface {
	GetUserMembership(
		ctx context.Context,
		userID, tenantID string,
	) (*models.Membership, error)
}

type membershipRepo struct {
	db *gorm.DB
}

func NewMembershipRepository(db *gorm.DB) MembershipRepository {
	return &membershipRepo{db: db}
}

func (r *membershipRepo) GetUserMembership(
	ctx context.Context,
	userID, tenantID string,
) (*models.Membership, error) {
	var m models.Membership
	err := r.db.WithContext(ctx).
		Where("user_id = ? AND tenant_id = ?", userID, tenantID).
		First(&m).Error

	return &m, err
}

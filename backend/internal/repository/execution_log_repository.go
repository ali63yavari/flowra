package repository

import (
	"context"

	"flowra/internal/models"

	"gorm.io/gorm"
)

type ExecutionLogRepository interface {
	Create(ctx context.Context, log *models.ExecutionLog) error
}

type executionLogRepo struct {
	db *gorm.DB
}

func NewExecutionLogRepository(db *gorm.DB) ExecutionLogRepository {
	return &executionLogRepo{db: db}
}

func (r *executionLogRepo) Create(
	ctx context.Context,
	logEntry *models.ExecutionLog,
) error {
	return r.db.WithContext(ctx).Create(logEntry).Error
}

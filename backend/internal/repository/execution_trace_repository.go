package repository

import (
	"context"

	"flowra/internal/models"

	"gorm.io/gorm"
)

type ExecutionTraceRepository interface {
	CreateMany(ctx context.Context, traces []models.ExecutionTraceEntry) error
	ListByJob(ctx context.Context, jobID string) ([]models.ExecutionTraceEntry, error)
}

type executionTraceRepository struct {
	db *gorm.DB
}

func NewExecutionTraceRepository(db *gorm.DB) ExecutionTraceRepository {
	return &executionTraceRepository{db: db}
}

func (r *executionTraceRepository) CreateMany(ctx context.Context, traces []models.ExecutionTraceEntry) error {
	if len(traces) == 0 {
		return nil
	}
	return r.db.WithContext(ctx).Create(&traces).Error
}

func (r *executionTraceRepository) ListByJob(ctx context.Context, jobID string) ([]models.ExecutionTraceEntry, error) {
	var traces []models.ExecutionTraceEntry
	err := r.db.WithContext(ctx).Where("job_id = ?", jobID).Order("started_at asc").Find(&traces).Error
	return traces, err
}

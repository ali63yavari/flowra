package repository

import (
	"context"

	"flowra/internal/models"

	"gorm.io/gorm"
)

type JobRepository interface {
	Create(ctx context.Context, job *models.Job) error
	UpdateStatus(
		ctx context.Context,
		id string,
		status models.JobStatus,
		output []byte,
		errMsg *string,
	) error
	IncrementAttempts(ctx context.Context, id string) error
	GetByID(ctx context.Context, id string) (*models.Job, error)
}

type jobRepository struct {
	db *gorm.DB
}

func NewJobRepository(db *gorm.DB) JobRepository {
	return &jobRepository{db: db}
}

func (r *jobRepository) Create(ctx context.Context, job *models.Job) error {
	return r.db.WithContext(ctx).Create(job).Error
}

func (r *jobRepository) UpdateStatus(
	ctx context.Context,
	id string,
	status models.JobStatus,
	output []byte,
	errMsg *string,
) error {
	return r.db.WithContext(ctx).Model(&models.Job{}).
		Where("id = ?", id).
		Updates(
			map[string]interface{}{
				"status": status,
				"output": output,
				"error":  errMsg,
			},
		).Error
}

func (r *jobRepository) IncrementAttempts(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).
		Model(&models.Job{}).
		Where("id = ?", id).
		Update("attempts", gorm.Expr("attempts + 1")).Error
}

func (r *jobRepository) GetByID(ctx context.Context, id string) (
	*models.Job, error,
) {
	var job models.Job
	err := r.db.WithContext(ctx).First(&job, "id = ?", id).Error
	return &job, err
}

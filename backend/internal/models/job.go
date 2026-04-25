package models

import (
	"time"

	"gorm.io/datatypes"
)

type JobStatus string

const (
	JobQueued   JobStatus = "queued"
	JobRunning  JobStatus = "running"
	JobSuccess  JobStatus = "success"
	JobFailed   JobStatus = "failed"
	JobRetrying JobStatus = "retrying"
	JobDead     JobStatus = "dead"
)

type Job struct {
	ID            string `gorm:"primaryKey"`
	TenantID      string `gorm:"index"`
	IntegrationID string `gorm:"index"`

	Status JobStatus

	Input  datatypes.JSON
	Output datatypes.JSON
	Error  *string

	Attempts    int
	MaxAttempts int

	CreatedAt time.Time
	UpdatedAt time.Time
}

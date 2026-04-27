package models

import "time"

type ExecutionTraceEntry struct {
	ID    string `gorm:"primaryKey" json:"id"`
	JobID string `gorm:"index;not null" json:"job_id"`

	StepID        string    `json:"step_id"`
	Type          string    `json:"type"`
	Status        string    `json:"status"`
	StartedAt     time.Time `json:"started_at"`
	DurationMs    int64     `json:"duration_ms"`
	OutputPreview string    `gorm:"type:text" json:"output_preview"`
	Error         string    `gorm:"type:text" json:"error"`

	CreatedAt time.Time `json:"created_at"`
}

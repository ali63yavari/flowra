package models

import "time"

type ExecutionLog struct {
	ID    string `gorm:"primaryKey"`
	JobID string `gorm:"index"`

	Level   string
	Message string

	CreatedAt time.Time
}

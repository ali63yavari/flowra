package models

import (
	"time"

	"gorm.io/datatypes"
)

type Integration struct {
	ID       string `gorm:"primaryKey"`
	TenantID string `gorm:"index"`

	Name string

	Config datatypes.JSON // <-- your DSL stored here

	CreatedAt time.Time
	UpdatedAt time.Time
}

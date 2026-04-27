package models

import (
	"time"

	"gorm.io/datatypes"
)

type Workflow struct {
	ID           string `gorm:"primaryKey" json:"id"`
	TenantID     string `gorm:"index;not null" json:"tenant_id"`
	CollectionID string `gorm:"index;not null" json:"collection_id"`

	Name        string         `gorm:"not null" json:"name"`
	Description string         `json:"description"`
	Definition  datatypes.JSON `json:"definition"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

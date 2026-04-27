package models

import "time"

type Collection struct {
	ID       string `gorm:"primaryKey" json:"id"`
	TenantID string `gorm:"index;not null" json:"tenant_id"`

	Name        string `gorm:"not null" json:"name"`
	Description string `json:"description"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

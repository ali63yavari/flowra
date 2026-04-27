package models

import "time"

type Environment struct {
	ID       string `gorm:"primaryKey" json:"id"`
	TenantID string `gorm:"index;not null" json:"tenant_id"`

	Name      string `gorm:"not null" json:"name"`
	IsDefault bool   `json:"is_default"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

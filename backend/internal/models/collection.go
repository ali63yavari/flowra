package models

import "time"

type Collection struct {
	ID       string `gorm:"primaryKey" json:"id"`
	TenantID string `gorm:"index;not null" json:"tenant_id"`

	Name        string `gorm:"not null" json:"name"`
	Description string `json:"description"`
	IsOnline    bool   `json:"is_online"`
	AccessRole  string `gorm:"default:Collection" json:"access_role"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

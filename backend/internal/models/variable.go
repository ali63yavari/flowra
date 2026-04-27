package models

import "time"

type Variable struct {
	ID            string  `gorm:"primaryKey" json:"id"`
	TenantID      string  `gorm:"index;not null" json:"tenant_id"`
	CollectionID  *string `gorm:"index" json:"collection_id"`
	EnvironmentID string  `gorm:"index;not null" json:"environment_id"`

	Key            string `gorm:"not null" json:"key"`
	EncryptedValue string `gorm:"type:text;not null" json:"-"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

package models

import "time"

type Tenant struct {
	ID   string `gorm:"primaryKey"`
	Name string

	APIKey string `gorm:"uniqueIndex"`

	RateLimitPerMinute int

	CreatedAt time.Time
	UpdatedAt time.Time
}

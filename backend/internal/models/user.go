package models

import "time"

type User struct {
	ID    string `gorm:"primaryKey"`
	Email string `gorm:"uniqueIndex"`

	CreatedAt time.Time
}

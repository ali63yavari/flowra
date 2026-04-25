package models

import "time"

type Role string

const (
	RoleOwner  Role = "owner"
	RoleAdmin  Role = "admin"
	RoleMember Role = "member"
	RoleViewer Role = "viewer"
)

type Membership struct {
	ID       string `gorm:"primaryKey"`
	UserID   string `gorm:"index"`
	TenantID string `gorm:"index"`

	Role Role

	CreatedAt time.Time
}

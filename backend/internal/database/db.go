package database

import (
	"log"

	"flowra/internal/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func NewDB(dsn string) *gorm.DB {
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal(err)
	}

	err = db.AutoMigrate(
		&models.Tenant{},
		&models.User{},
		&models.Membership{},
		&models.Job{},
		&models.Integration{},
		&models.Collection{},
		&models.Workflow{},
		&models.Environment{},
		&models.Variable{},
		&models.ExecutionLog{},
		&models.ExecutionTraceEntry{},
	)
	if err != nil {
		log.Fatal(err)
	}

	return db
}

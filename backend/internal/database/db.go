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

	return db
}

func AutoMigrate(db *gorm.DB) {
	modelsToMigrate := []interface{}{
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
	}

	allTablesExist := true
	for _, model := range modelsToMigrate {
		if !db.Migrator().HasTable(model) {
			allTablesExist = false
			break
		}
	}
	if allTablesExist {
		return
	}

	err := db.AutoMigrate(
		modelsToMigrate...,
	)
	if err != nil {
		log.Fatal(err)
	}
}

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
		&models.Job{},
		&models.Integration{},
	)
	if err != nil {
		log.Fatal(err)
	}

	return db
}

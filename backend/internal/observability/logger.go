package observability

import (
	"log"
)

type Logger struct{}

func NewLogger() *Logger {
	return &Logger{}
}

func (l *Logger) Info(msg string, fields map[string]interface{}) {
	log.Printf("[INFO] %s %v\n", msg, fields)
}

func (l *Logger) Error(msg string, fields map[string]interface{}) {
	log.Printf("[ERROR] %s %v\n", msg, fields)
}

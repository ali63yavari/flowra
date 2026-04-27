package main

import (
	"context"
	"log"

	"flowra/internal/config"
	"flowra/internal/database"
	"flowra/internal/execution"
	"flowra/internal/queue"
	"flowra/internal/repository"
	"flowra/internal/security"
	"flowra/internal/worker"
	"flowra/internal/workspace"
)

func main() {
	ctx := context.Background()
	cfg := config.Load()

	db := database.NewDB(cfg.DatabaseDSN)

	jobRepo := repository.NewJobRepository(db)
	workflowRepo := repository.NewWorkflowRepository(db)
	environmentRepo := repository.NewEnvironmentRepository(db)
	variableRepo := repository.NewVariableRepository(db)
	logRepo := repository.NewExecutionLogRepository(db)
	traceRepo := repository.NewExecutionTraceRepository(db)
	secretBox, err := security.NewSecretBoxFromEnv()
	if err != nil {
		log.Fatal(err)
	}
	variableService := workspace.NewVariableService(environmentRepo, variableRepo, secretBox)

	q := queue.NewRedisQueue(cfg.RedisAddr, cfg.RedisQueue)
	service := execution.NewService()

	w := worker.NewWorker(q, service, jobRepo, workflowRepo, logRepo, traceRepo, variableService)

	log.Println("Worker started...")
	log.Fatal(w.Start(ctx))
}

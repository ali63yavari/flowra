package main

import (
	"log"

	"github.com/gofiber/fiber/v2"

	"flowra/internal/api/handlers"
	"flowra/internal/api/middleware"
	"flowra/internal/database"
	"flowra/internal/execution"
	"flowra/internal/queue"
	"flowra/internal/repository"
	"flowra/internal/security"
	"flowra/internal/workspace"
)

func main() {
	app := fiber.New()

	db := database.NewDB("postgres://user:pass@localhost:5432/flowra")

	jobRepo := repository.NewJobRepository(db)
	tenantRepo := repository.NewTenantRepository(db)
	collectionRepo := repository.NewCollectionRepository(db)
	workflowRepo := repository.NewWorkflowRepository(db)
	environmentRepo := repository.NewEnvironmentRepository(db)
	variableRepo := repository.NewVariableRepository(db)
	traceRepo := repository.NewExecutionTraceRepository(db)
	secretBox, err := security.NewSecretBoxFromEnv()
	if err != nil {
		log.Fatal(err)
	}
	variableService := workspace.NewVariableService(environmentRepo, variableRepo, secretBox)

	q := queue.NewRedisQueue("localhost:6379", "flowra_jobs")
	execService := execution.NewService()

	app.Use(middleware.RequestID())
	app.Use(middleware.APIKeyAuth(tenantRepo))
	app.Use(middleware.RateLimit())

	execHandler := handlers.NewExecuteHandler(q, jobRepo, workflowRepo)
	directHandler := handlers.NewExecuteDirectHandler(execService)
	workspaceHandler := handlers.NewWorkspaceHandler(collectionRepo, workflowRepo)
	environmentHandler := handlers.NewEnvironmentHandler(environmentRepo)
	variableHandler := handlers.NewVariableHandler(variableService)
	workflowExecutionHandler := handlers.NewWorkflowExecutionHandler(workflowRepo, variableService, execService)
	validationHandler := handlers.NewValidationHandler()
	jobHandler := handlers.NewJobHandler(jobRepo, traceRepo)

	app.Post("/execute/:id", execHandler.Execute)
	app.Post("/execute-direct", directHandler.Execute)
	app.Get("/jobs/:id", jobHandler.Get)

	app.Get("/collections", workspaceHandler.ListCollections)
	app.Post("/collections", workspaceHandler.CreateCollection)
	app.Patch("/collections/:id", workspaceHandler.UpdateCollection)
	app.Delete("/collections/:id", workspaceHandler.DeleteCollection)
	app.Post("/collections/:collectionId/workflows", workspaceHandler.CreateWorkflow)
	app.Post("/workflows/validate", validationHandler.Validate)
	app.Get("/workflows/:id", workspaceHandler.GetWorkflow)
	app.Patch("/workflows/:id", workspaceHandler.UpdateWorkflow)
	app.Delete("/workflows/:id", workspaceHandler.DeleteWorkflow)
	app.Post("/workflows/:id/duplicate", workspaceHandler.DuplicateWorkflow)
	app.Post("/workflows/:id/execute-direct", workflowExecutionHandler.ExecuteDirect)

	app.Get("/environments", environmentHandler.List)
	app.Post("/environments", environmentHandler.Create)
	app.Patch("/environments/:id", environmentHandler.Update)
	app.Delete("/environments/:id", environmentHandler.Delete)
	app.Get("/variables", variableHandler.List)
	app.Put("/variables", variableHandler.Replace)
	app.Delete("/variables/bulk", variableHandler.DeleteBulk)
	app.Get("/variables/export", variableHandler.Export)

	log.Fatal(app.Listen(":3000"))
}

package execution

import (
	"context"
	"time"

	"flowra/internal/workflow"
	"flowra/internal/workflow/steps"
)

type Service struct {
	runtime *workflow.Runtime
}

func NewService() *Service {
	runtime := workflow.NewRuntime()
	steps.RegisterAll()

	return &Service{
		runtime: runtime,
	}
}

func (s *Service) Execute(
	ctx context.Context,
	def workflow.WorkflowDefinition,
	input map[string]interface{},
) (map[string]interface{}, error) {

	limits := workflow.Limits{
		MaxSteps: 50,
		Timeout:  30 * time.Second,
	}

	engine, err := workflow.NewEngine(def, s.runtime, limits)
	if err != nil {
		return nil, err
	}

	state := &workflow.ExecutionState{
		Input:     input,
		Variables: make(map[string]interface{}),
		Extracted: make(map[string]interface{}),
	}

	if err := engine.Execute(ctx, state); err != nil {
		return nil, err
	}

	return state.Variables, nil
}

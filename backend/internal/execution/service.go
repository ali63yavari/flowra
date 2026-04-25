package execution

import (
	"context"

	"flowra/internal/httpclient"
	"flowra/internal/workflow"
	"flowra/internal/workflow/steps"
)

type Service struct {
	runtime *workflow.Runtime
}

func NewService() *Service {
	httpClient := httpclient.NewDefaultClient()

	runtime := workflow.NewRuntime(httpClient)

	// Register steps
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
	engine, err := workflow.NewEngine(def, s.runtime)
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

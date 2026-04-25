package workflow

import (
	"context"
	"fmt"
)

type Engine struct {
	steps   map[string]Step
	start   string
	runtime *Runtime
}

func NewEngine(def WorkflowDefinition, runtime *Runtime) (*Engine, error) {
	if len(def.Steps) == 0 {
		return nil, fmt.Errorf("no steps defined")
	}

	steps := make(map[string]Step)

	for _, s := range def.Steps {
		step, err := BuildStep(s)
		if err != nil {
			return nil, err
		}

		// Inject runtime if supported
		if injectable, ok := step.(InjectableStep); ok {
			injectable.SetRuntime(runtime)
		}

		steps[s.ID] = step
	}

	return &Engine{
		steps:   steps,
		start:   def.Steps[0].ID,
		runtime: runtime,
	}, nil
}

func (e *Engine) Execute(ctx context.Context, state *ExecutionState) error {
	current := e.start

	for current != "" {
		step, ok := e.steps[current]
		if !ok {
			return fmt.Errorf("step not found: %s", current)
		}

		if err := step.Execute(ctx, state); err != nil {
			return err
		}

		current = step.Next(state)
	}

	return nil
}

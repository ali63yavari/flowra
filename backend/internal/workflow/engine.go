package workflow

import (
	"context"
	"fmt"
)

type Engine struct {
	steps map[string]Step
	start string
}

func NewEngine(def WorkflowDefinition) (*Engine, error) {
	if len(def.Steps) == 0 {
		return nil, fmt.Errorf("no steps defined")
	}

	steps := make(map[string]Step)

	for _, s := range def.Steps {
		step, err := BuildStep(s)
		if err != nil {
			return nil, err
		}
		steps[s.ID] = step
	}

	return &Engine{
		steps: steps,
		start: def.Steps[0].ID,
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

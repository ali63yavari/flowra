package workflow

import (
	"context"
	"fmt"
)

type Engine struct {
	steps   map[string]Step
	start   string
	runtime *Runtime
	limits  Limits
}

func NewEngine(def WorkflowDefinition, runtime *Runtime, limits Limits) (
	*Engine, error,
) {
	if len(def.Steps) == 0 {
		return nil, fmt.Errorf("no steps defined")
	}

	steps := make(map[string]Step)

	for _, s := range def.Steps {
		step, err := BuildStep(s)
		if err != nil {
			return nil, err
		}

		if injectable, ok := step.(InjectableStep); ok {
			injectable.SetRuntime(runtime)
		}

		steps[s.ID] = step
	}

	return &Engine{
		steps:   steps,
		start:   def.Steps[0].ID,
		runtime: runtime,
		limits:  limits,
	}, nil
}

func (e *Engine) Execute(ctx context.Context, state *ExecutionState) error {
	ctx, cancel := WithLimits(ctx, e.limits)
	defer cancel()

	current := e.start
	stepCount := 0

	for current != "" {
		if e.limits.MaxSteps > 0 && stepCount >= e.limits.MaxSteps {
			return fmt.Errorf("max steps exceeded")
		}

		step, ok := e.steps[current]
		if !ok {
			return fmt.Errorf("step not found: %s", current)
		}

		if err := step.Execute(ctx, state); err != nil {
			return err
		}

		next := step.Next(state)

		// branching support
		if condStep, ok := step.(interface {
			NextTrue(*ExecutionState) string
			NextFalse(*ExecutionState) string
			Evaluate(*ExecutionState) bool
		}); ok {
			if condStep.Evaluate(state) {
				next = condStep.NextTrue(state)
			} else {
				next = condStep.NextFalse(state)
			}
		}

		current = next
		
		stepCount++
	}

	return nil
}

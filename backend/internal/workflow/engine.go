package workflow

import (
	"context"
	"encoding/json"
	"fmt"
	"time"
)

type Engine struct {
	steps     map[string]Step
	stepTypes map[string]string
	start     string
	runtime   *Runtime
	limits    Limits
}

func NewEngine(def WorkflowDefinition, runtime *Runtime, limits Limits) (
	*Engine, error,
) {
	if len(def.Steps) == 0 {
		return nil, fmt.Errorf("no steps defined")
	}

	steps := make(map[string]Step)
	stepTypes := make(map[string]string)

	for _, s := range def.Steps {
		step, err := BuildStep(s)
		if err != nil {
			return nil, err
		}

		if injectable, ok := step.(InjectableStep); ok {
			injectable.SetRuntime(runtime)
		}

		steps[s.ID] = step
		stepTypes[s.ID] = s.Type
	}

	return &Engine{
		steps:     steps,
		stepTypes: stepTypes,
		start:     def.Steps[0].ID,
		runtime:   runtime,
		limits:    limits,
	}, nil
}

func (e *Engine) Execute(ctx context.Context, state *ExecutionState) error {
	_, err := e.ExecuteWithTrace(ctx, state, false)
	return err
}

func (e *Engine) ExecuteWithTrace(
	ctx context.Context,
	state *ExecutionState,
	traceEnabled bool,
) ([]ExecutionTraceEntry, error) {
	ctx, cancel := WithLimits(ctx, e.limits)
	defer cancel()

	current := e.start
	stepCount := 0
	traces := []ExecutionTraceEntry{}

	for current != "" {
		if e.limits.MaxSteps > 0 && stepCount >= e.limits.MaxSteps {
			return traces, fmt.Errorf("max steps exceeded")
		}

		step, ok := e.steps[current]
		if !ok {
			return traces, fmt.Errorf("step not found: %s", current)
		}

		startedAt := time.Now()
		err := step.Execute(ctx, state)
		if traceEnabled {
			entry := ExecutionTraceEntry{
				StepID:        current,
				Type:          e.stepTypes[current],
				Status:        "success",
				StartedAt:     startedAt,
				DurationMs:    time.Since(startedAt).Milliseconds(),
				OutputPreview: outputPreview(state),
				Request:       state.LastRequest,
				Response:      NewHTTPResponseDebug(state.LastResponse),
				Input:         state.Input,
				Variables:     maskedInterfaceKeys(state.Variables),
				Extracted:     state.Extracted,
			}
			if err != nil {
				entry.Status = "error"
				entry.Error = err.Error()
			}
			traces = append(traces, entry)
		}
		if err != nil {
			return traces, err
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

	return traces, nil
}

func outputPreview(state *ExecutionState) string {
	payload := map[string]interface{}{
		"variables": maskedKeys(state.Variables),
		"extracted": state.Extracted,
	}
	if state.LastResponse != nil {
		payload["last_response"] = map[string]interface{}{
			"status_code": state.LastResponse.StatusCode,
			"body":        stringLimit(string(state.LastResponse.Body), 500),
		}
	}
	if state.LastHTML != "" {
		payload["last_html"] = stringLimit(state.LastHTML, 500)
	}
	data, err := json.Marshal(payload)
	if err != nil {
		return ""
	}
	return stringLimit(string(data), 1200)
}

func maskedKeys(values map[string]interface{}) map[string]string {
	result := map[string]string{}
	for key := range values {
		result[key] = "set"
	}
	return result
}

func maskedInterfaceKeys(values map[string]interface{}) map[string]interface{} {
	result := map[string]interface{}{}
	for key := range values {
		result[key] = "set"
	}
	return result
}

func stringLimit(value string, limit int) string {
	if len(value) <= limit {
		return value
	}
	return value[:limit] + "..."
}

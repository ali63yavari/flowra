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

type Options struct {
	Variables map[string]interface{}
	Trace     bool
}

type Result struct {
	Data   map[string]interface{}         `json:"data"`
	Traces []workflow.ExecutionTraceEntry `json:"traces,omitempty"`
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
	result, err := s.ExecuteWithOptions(ctx, def, input, Options{})
	if err != nil {
		return nil, err
	}
	return result.Data, nil
}

func (s *Service) ExecuteWithOptions(
	ctx context.Context,
	def workflow.WorkflowDefinition,
	input map[string]interface{},
	options Options,
) (*Result, error) {

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
		Variables: copyVariables(options.Variables),
		Extracted: make(map[string]interface{}),
	}

	traces, err := engine.ExecuteWithTrace(ctx, state, options.Trace)
	if err != nil {
		return &Result{
			Data:   state.Variables,
			Traces: traces,
		}, err
	}

	return &Result{
		Data:   state.Variables,
		Traces: traces,
	}, nil
}

func copyVariables(source map[string]interface{}) map[string]interface{} {
	target := make(map[string]interface{})
	for key, value := range source {
		target[key] = value
	}
	return target
}

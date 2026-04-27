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
	Data         map[string]interface{}         `json:"data"`
	Input        map[string]interface{}         `json:"input"`
	Variables    map[string]interface{}         `json:"variables"`
	Extracted    map[string]interface{}         `json:"extracted"`
	LastResponse *workflow.HTTPResponseDebug    `json:"last_response,omitempty"`
	Traces       []workflow.ExecutionTraceEntry `json:"traces,omitempty"`
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
	result := buildResult(state, traces)
	if err != nil {
		return result, err
	}

	return result, nil
}

func copyVariables(source map[string]interface{}) map[string]interface{} {
	target := make(map[string]interface{})
	for key, value := range source {
		target[key] = value
	}
	return target
}

func buildResult(state *workflow.ExecutionState, traces []workflow.ExecutionTraceEntry) *Result {
	return &Result{
		Data:         workflowOutput(state),
		Input:        state.Input,
		Variables:    maskVariables(state.Variables),
		Extracted:    state.Extracted,
		LastResponse: workflow.NewHTTPResponseDebug(state.LastResponse),
		Traces:       traces,
	}
}

func workflowOutput(state *workflow.ExecutionState) map[string]interface{} {
	if len(state.Extracted) > 0 {
		return cloneMap(state.Extracted)
	}
	response := workflow.NewHTTPResponseDebug(state.LastResponse)
	if response == nil {
		return map[string]interface{}{}
	}
	if response.ParsedBody != nil {
		if object, ok := response.ParsedBody.(map[string]interface{}); ok {
			return object
		}
		return map[string]interface{}{"items": response.ParsedBody}
	}
	return map[string]interface{}{"body": response.Body}
}

func maskVariables(values map[string]interface{}) map[string]interface{} {
	masked := map[string]interface{}{}
	for key := range values {
		masked[key] = "set"
	}
	return masked
}

func cloneMap(values map[string]interface{}) map[string]interface{} {
	cloned := map[string]interface{}{}
	for key, value := range values {
		cloned[key] = value
	}
	return cloned
}

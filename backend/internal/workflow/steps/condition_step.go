package steps

import (
	"context"
	"encoding/json"

	"flowra/internal/workflow"
)

type ConditionConfig struct {
	Field string `json:"field"`
	Op    string `json:"op"`
	Value string `json:"value"`
}

type ConditionStep struct {
	id        string
	nextTrue  string
	nextFalse string
	cfg       ConditionConfig
}

func NewConditionStep(def workflow.StepDefinition) (workflow.Step, error) {
	var cfg ConditionConfig
	_ = json.Unmarshal(def.Config, &cfg)

	return &ConditionStep{
		id:        def.ID,
		nextTrue:  def.NextTrue,
		nextFalse: def.NextFalse,
		cfg:       cfg,
	}, nil
}

func (s *ConditionStep) ID() string {
	return s.id
}

func (s *ConditionStep) Execute(
	ctx context.Context,
	state *workflow.ExecutionState,
) error {
	return nil
}

func (s *ConditionStep) Next(state *workflow.ExecutionState) string {
	// not used for condition step
	return ""
}

func (s *ConditionStep) Evaluate(state *workflow.ExecutionState) bool {
	val, _ := state.Extracted[s.cfg.Field].(string)

	switch s.cfg.Op {
	case "equals":
		return val == s.cfg.Value
	}

	return false
}

func (s *ConditionStep) NextTrue(state *workflow.ExecutionState) string {
	return s.nextTrue
}

func (s *ConditionStep) NextFalse(state *workflow.ExecutionState) string {
	return s.nextFalse
}

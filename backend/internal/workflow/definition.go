package workflow

import "encoding/json"

type StepDefinition struct {
	ID     string          `json:"id"`
	Type   string          `json:"type"`
	Config json.RawMessage `json:"config"`

	// linear
	Next string `json:"next,omitempty"`

	// branching
	NextTrue  string `json:"next_true,omitempty"`
	NextFalse string `json:"next_false,omitempty"`
}

type WorkflowDefinition struct {
	Steps []StepDefinition `json:"steps"`
}

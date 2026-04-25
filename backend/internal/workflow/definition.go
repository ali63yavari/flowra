package workflow

import "encoding/json"

type StepDefinition struct {
	ID     string          `json:"id"`
	Type   string          `json:"type"`
	Config json.RawMessage `json:"config"`
	Next   string          `json:"next"`
}

type WorkflowDefinition struct {
	Steps []StepDefinition `json:"steps"`
}

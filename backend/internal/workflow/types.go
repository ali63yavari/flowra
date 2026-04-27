package workflow

import (
	"context"
	"net/http"
	"time"
)

type HTTPResponse struct {
	StatusCode int
	Body       []byte
	Headers    map[string][]string
}

type ExecutionState struct {
	Input     map[string]interface{}
	Variables map[string]interface{}
	Extracted map[string]interface{}

	LastResponse *HTTPResponse
	LastHTML     string

	Cookies []*http.Cookie
}

type ExecutionTraceEntry struct {
	StepID        string    `json:"step_id"`
	Type          string    `json:"type"`
	Status        string    `json:"status"`
	StartedAt     time.Time `json:"started_at"`
	DurationMs    int64     `json:"duration_ms"`
	OutputPreview string    `json:"output_preview,omitempty"`
	Error         string    `json:"error,omitempty"`
}

type Step interface {
	ID() string
	Execute(ctx context.Context, state *ExecutionState) error
	Next(state *ExecutionState) string
}

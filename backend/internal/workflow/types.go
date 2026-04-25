package workflow

import (
	"context"
	"net/http"
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

type Step interface {
	ID() string
	Execute(ctx context.Context, state *ExecutionState) error
	Next(state *ExecutionState) string
}

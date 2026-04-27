package workflow

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"
)

type HTTPRequestDebug struct {
	Method  string            `json:"method"`
	URL     string            `json:"url"`
	Headers map[string]string `json:"headers,omitempty"`
	Body    map[string]string `json:"body,omitempty"`
}

type HTTPResponse struct {
	StatusCode int                 `json:"status_code"`
	Body       []byte              `json:"-"`
	Headers    map[string][]string `json:"headers"`
}

type HTTPResponseDebug struct {
	StatusCode  int                 `json:"status_code"`
	Headers     map[string][]string `json:"headers"`
	Body        string              `json:"body"`
	ContentType string              `json:"content_type"`
	BodyFormat  string              `json:"body_format"`
	ParsedBody  interface{}         `json:"parsed_body,omitempty"`
}

type ExecutionState struct {
	Input     map[string]interface{}
	Variables map[string]interface{}
	Extracted map[string]interface{}

	LastRequest  *HTTPRequestDebug
	LastResponse *HTTPResponse
	LastHTML     string

	Cookies []*http.Cookie
}

type ExecutionTraceEntry struct {
	StepID        string                 `json:"step_id"`
	Type          string                 `json:"type"`
	Status        string                 `json:"status"`
	StartedAt     time.Time              `json:"started_at"`
	DurationMs    int64                  `json:"duration_ms"`
	OutputPreview string                 `json:"output_preview,omitempty"`
	Request       *HTTPRequestDebug      `json:"request,omitempty"`
	Response      *HTTPResponseDebug     `json:"response,omitempty"`
	Input         map[string]interface{} `json:"input,omitempty"`
	Variables     map[string]interface{} `json:"variables,omitempty"`
	Extracted     map[string]interface{} `json:"extracted,omitempty"`
	Error         string                 `json:"error,omitempty"`
}

type Step interface {
	ID() string
	Execute(ctx context.Context, state *ExecutionState) error
	Next(state *ExecutionState) string
}

func NewHTTPResponseDebug(response *HTTPResponse) *HTTPResponseDebug {
	if response == nil {
		return nil
	}
	body := string(response.Body)
	contentType := headerValue(response.Headers, "Content-Type")
	bodyFormat, parsedBody := ParseBody(contentType, body)
	return &HTTPResponseDebug{
		StatusCode:  response.StatusCode,
		Headers:     response.Headers,
		Body:        body,
		ContentType: contentType,
		BodyFormat:  bodyFormat,
		ParsedBody:  parsedBody,
	}
}

func ParseBody(contentType string, body string) (string, interface{}) {
	trimmed := strings.TrimSpace(body)
	lowerType := strings.ToLower(contentType)
	lowerBody := strings.ToLower(trimmed)
	if strings.Contains(lowerType, "json") || strings.HasSuffix(lowerType, "+json") ||
		strings.HasPrefix(trimmed, "{") || strings.HasPrefix(trimmed, "[") {
		var parsed interface{}
		if err := json.Unmarshal([]byte(trimmed), &parsed); err == nil {
			return "json", parsed
		}
		if strings.Contains(lowerType, "json") {
			return "invalid_json", nil
		}
	}
	if strings.Contains(lowerType, "html") || strings.HasPrefix(lowerBody, "<!doctype html") ||
		strings.HasPrefix(lowerBody, "<html") {
		return "html", nil
	}
	if strings.Contains(lowerType, "xml") || strings.Contains(lowerType, "soap") ||
		strings.HasPrefix(lowerBody, "<?xml") || strings.HasPrefix(lowerBody, "<soap") ||
		strings.Contains(lowerBody, "<soap:envelope") {
		return "xml", nil
	}
	return "text", nil
}

func headerValue(headers map[string][]string, key string) string {
	for headerKey, values := range headers {
		if strings.EqualFold(headerKey, key) && len(values) > 0 {
			return values[0]
		}
	}
	return ""
}

package steps

import (
	"context"
	"encoding/json"

	"flowra/internal/httpclient"
	"flowra/internal/workflow"
)

type HTTPRequestConfig struct {
	Method  string            `json:"method"`
	URL     string            `json:"url"`
	Headers map[string]string `json:"headers"`
	Body    map[string]string `json:"body"`
}

type HTTPRequestStep struct {
	id     string
	next   string
	config HTTPRequestConfig
	client httpclient.Client
}

func NewHTTPRequestStep(def workflow.StepDefinition) (workflow.Step, error) {
	var cfg HTTPRequestConfig
	if err := json.Unmarshal(def.Config, &cfg); err != nil {
		return nil, err
	}

	return &HTTPRequestStep{
		id:     def.ID,
		next:   def.Next,
		config: cfg,
		client: nil, // inject later via DI
	}, nil
}

func (s *HTTPRequestStep) ID() string {
	return s.id
}

func (s *HTTPRequestStep) Execute(
	ctx context.Context,
	state *workflow.ExecutionState,
) error {
	url := workflow.ResolveTemplate(s.config.URL, state)

	body := map[string]string{}
	for k, v := range s.config.Body {
		body[k] = workflow.ResolveTemplate(v, state)
	}

	req := &httpclient.Request{
		Method:  s.config.Method,
		URL:     url,
		Headers: s.config.Headers,
		Body:    body,
	}

	resp, err := s.client.Do(req)
	if err != nil {
		return err
	}

	state.LastResponse = &workflow.HTTPResponse{
		StatusCode: resp.StatusCode,
		Body:       resp.Body,
		Headers:    resp.Headers,
	}
	state.LastHTML = string(resp.Body)

	return nil
}

func (s *HTTPRequestStep) Next(state *workflow.ExecutionState) string {
	return s.next
}

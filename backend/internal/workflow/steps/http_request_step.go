package steps

import (
	"context"
	"encoding/json"

	"flowra/internal/httpclient"
	"flowra/internal/security"
	"flowra/internal/workflow"
)

type HTTPRequestConfig struct {
	Method        string            `json:"method"`
	URL           string            `json:"url"`
	Headers       map[string]string `json:"headers"`
	Body          map[string]string `json:"body"`
	CSRFFetchURL  string            `json:"csrf_fetch_url"`
	CSRFSelector  string            `json:"csrf_selector"`
	CSRFFieldName string            `json:"csrf_field_name"`
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
	}, nil
}

func (s *HTTPRequestStep) SetRuntime(rt *workflow.Runtime) {
	s.client = rt.HTTPClient
}

func (s *HTTPRequestStep) ID() string {
	return s.id
}

func (s *HTTPRequestStep) Execute(
	ctx context.Context,
	state *workflow.ExecutionState,
) error {
	// --- Step 1: CSRF Fetch if configured ---
	if s.config.CSRFFetchURL != "" && s.config.CSRFSelector != "" {
		fetchURL := workflow.ResolveTemplate(s.config.CSRFFetchURL, state)

		resp, err := s.client.Do(
			&httpclient.Request{
				Method: "GET",
				URL:    fetchURL,
			},
		)
		if err != nil {
			return err
		}

		html := string(resp.Body)

		token, err := security.ExtractCSRF(html, s.config.CSRFSelector)
		if err != nil {
			return err
		}

		if token != "" && s.config.CSRFFieldName != "" {
			if s.config.Body == nil {
				s.config.Body = map[string]string{}
			}
			s.config.Body[s.config.CSRFFieldName] = token
		}
	}

	// --- Step 2: Resolve URL ---
	url := workflow.ResolveTemplate(s.config.URL, state)

	// --- Step 3: Resolve Body ---
	body := map[string]string{}
	for k, v := range s.config.Body {
		body[k] = workflow.ResolveTemplate(v, state)
	}

	// --- Step 4: Execute Request ---
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

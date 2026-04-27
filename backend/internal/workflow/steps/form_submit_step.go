package steps

import (
	"context"
	"encoding/json"
	"net/url"

	"flowra/internal/httpclient"
	"flowra/internal/parser"
	"flowra/internal/workflow"
)

type FormSubmitConfig struct {
	FormSelector string            `json:"form_selector"`
	BaseURL      string            `json:"base_url"`
	Overrides    map[string]string `json:"overrides"`
}

type FormSubmitStep struct {
	id     string
	next   string
	config FormSubmitConfig

	client httpclient.Client
}

func NewFormSubmitStep(def workflow.StepDefinition) (workflow.Step, error) {
	var cfg FormSubmitConfig
	if err := json.Unmarshal(def.Config, &cfg); err != nil {
		return nil, err
	}

	return &FormSubmitStep{
		id:     def.ID,
		next:   def.Next,
		config: cfg,
	}, nil
}

func (s *FormSubmitStep) SetRuntime(rt *workflow.Runtime) {
	s.client = rt.HTTPClient
}

func (s *FormSubmitStep) ID() string {
	return s.id
}

func (s *FormSubmitStep) Execute(
	ctx context.Context,
	state *workflow.ExecutionState,
) error {
	// Step 1: Parse form from last HTML
	form, err := parser.ParseForm(state.LastHTML, s.config.FormSelector)
	if err != nil {
		return err
	}
	if form == nil {
		return nil
	}

	// Step 2: Resolve overrides
	overrides := make(map[string]string)
	for k, v := range s.config.Overrides {
		overrides[k] = workflow.ResolveTemplate(v, state)
	}

	// Step 3: Merge fields
	finalFields := parser.MergeFormFields(form.Fields, overrides)

	// Step 4: Build URL
	actionURL := form.Action
	if s.config.BaseURL != "" {
		base, _ := url.Parse(s.config.BaseURL)
		ref, _ := url.Parse(form.Action)
		actionURL = base.ResolveReference(ref).String()
	}

	// Step 5: Execute request
	req := &httpclient.Request{
		Method: form.Method,
		URL:    actionURL,
		Headers: map[string]string{
			"Content-Type": "application/x-www-form-urlencoded",
		},
		Body: finalFields,
	}
	state.LastRequest = &workflow.HTTPRequestDebug{
		Method:  req.Method,
		URL:     req.URL,
		Headers: req.Headers,
		Body:    finalFields,
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

func (s *FormSubmitStep) Next(state *workflow.ExecutionState) string {
	return s.next
}

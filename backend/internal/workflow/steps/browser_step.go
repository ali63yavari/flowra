package steps

import (
	"context"
	"encoding/json"

	"flowra/internal/workflow"
)

type BrowserAction struct {
	Type     string `json:"type"`
	URL      string `json:"url,omitempty"`
	Selector string `json:"selector,omitempty"`
	Value    string `json:"value,omitempty"`
}

type BrowserConfig struct {
	Actions []BrowserAction `json:"actions"`
}

type BrowserStep struct {
	id     string
	next   string
	config BrowserConfig

	browser workflowBrowser
}

type workflowBrowser interface {
	Navigate(ctx context.Context, url string) error
	Click(ctx context.Context, selector string) error
	Fill(ctx context.Context, selector string, value string) error
	WaitVisible(ctx context.Context, selector string) error
	HTML(ctx context.Context) (string, error)
}

func NewBrowserStep(def workflow.StepDefinition) (workflow.Step, error) {
	var cfg BrowserConfig
	if err := json.Unmarshal(def.Config, &cfg); err != nil {
		return nil, err
	}

	return &BrowserStep{
		id:     def.ID,
		next:   def.Next,
		config: cfg,
	}, nil
}

func (s *BrowserStep) SetRuntime(rt *workflow.Runtime) {
	s.browser = rt.Browser
}

func (s *BrowserStep) ID() string {
	return s.id
}

func (s *BrowserStep) Execute(
	ctx context.Context,
	state *workflow.ExecutionState,
) error {
	for _, action := range s.config.Actions {

		switch action.Type {

		case "navigate":
			url := workflow.ResolveTemplate(action.URL, state)
			if err := s.browser.Navigate(ctx, url); err != nil {
				return err
			}

		case "fill":
			val := workflow.ResolveTemplate(action.Value, state)
			if err := s.browser.Fill(ctx, action.Selector, val); err != nil {
				return err
			}

		case "click":
			if err := s.browser.Click(ctx, action.Selector); err != nil {
				return err
			}

		case "wait":
			if err := s.browser.WaitVisible(ctx, action.Selector); err != nil {
				return err
			}
		}
	}

	html, err := s.browser.HTML(ctx)
	if err != nil {
		return err
	}

	state.LastHTML = html

	return nil
}

func (s *BrowserStep) Next(state *workflow.ExecutionState) string {
	return s.next
}

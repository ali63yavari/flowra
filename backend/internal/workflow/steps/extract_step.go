package steps

import (
	"context"
	"encoding/json"
	"strings"

	"github.com/PuerkitoBio/goquery"

	"flowra/internal/workflow"
)

type ExtractConfig struct {
	Format string            `json:"format"`
	Rules  map[string]string `json:"rules"`
}

type ExtractStep struct {
	id     string
	next   string
	config ExtractConfig
}

func NewExtractStep(def workflow.StepDefinition) (workflow.Step, error) {
	var cfg ExtractConfig
	if err := json.Unmarshal(def.Config, &cfg); err != nil {
		return nil, err
	}

	return &ExtractStep{
		id:     def.ID,
		next:   def.Next,
		config: cfg,
	}, nil
}

func (s *ExtractStep) ID() string {
	return s.id
}

func (s *ExtractStep) Execute(
	ctx context.Context,
	state *workflow.ExecutionState,
) error {
	result := make(map[string]interface{})

	doc, err := goquery.NewDocumentFromReader(strings.NewReader(state.LastHTML))
	if err != nil {
		return err
	}

	for key, selector := range s.config.Rules {
		result[key] = doc.Find(selector).Text()
	}

	state.Extracted = result
	return nil
}

func (s *ExtractStep) Next(state *workflow.ExecutionState) string {
	return s.next
}

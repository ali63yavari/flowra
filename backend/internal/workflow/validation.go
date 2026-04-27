package workflow

import (
	"encoding/json"
	"fmt"
	"regexp"
	"strings"
)

type ValidationIssue struct {
	Severity string `json:"severity"`
	Type     string `json:"type"`
	StepID   string `json:"stepId,omitempty"`
	Field    string `json:"field,omitempty"`
	Message  string `json:"message"`
}

var validationTemplateRegex = regexp.MustCompile(`\{\{\s*([^}]+?)\s*\}\}`)

func ValidateDefinition(def WorkflowDefinition, variableKeys map[string]bool) []ValidationIssue {
	issues := []ValidationIssue{}
	stepIDs := map[string]bool{}
	extractNamesByIndex := make([]map[string]bool, len(def.Steps))
	seenExtractNames := map[string]bool{}

	if len(def.Steps) == 0 {
		return []ValidationIssue{{
			Severity: "error",
			Type:     "workflow",
			Message:  "Add at least one workflow step before running.",
		}}
	}

	for index, step := range def.Steps {
		stepIDs[step.ID] = true
		extractNamesByIndex[index] = cloneBoolMap(seenExtractNames)
		if step.Type == "extract" {
			var cfg struct {
				Rules map[string]string `json:"rules"`
			}
			_ = json.Unmarshal(step.Config, &cfg)
			for name := range cfg.Rules {
				seenExtractNames[name] = true
			}
		}
	}

	for index, step := range def.Steps {
		values := []string{}
		switch step.Type {
		case "http_request":
			var cfg struct {
				Method        string            `json:"method"`
				URL           string            `json:"url"`
				Headers       map[string]string `json:"headers"`
				Body          map[string]string `json:"body"`
				CSRFFetchURL  string            `json:"csrf_fetch_url"`
				CSRFSelector  string            `json:"csrf_selector"`
				CSRFFieldName string            `json:"csrf_field_name"`
			}
			if err := json.Unmarshal(step.Config, &cfg); err != nil {
				issues = append(issues, stepError(step.ID, "config", err.Error()))
				break
			}
			if strings.TrimSpace(cfg.URL) == "" {
				issues = append(issues, stepError(step.ID, "url", "HTTP request URL is required."))
			}
			if strings.TrimSpace(cfg.Method) == "" {
				issues = append(issues, stepError(step.ID, "method", "HTTP method is required."))
			}
			values = append(values, cfg.URL, cfg.CSRFFetchURL, cfg.CSRFSelector, cfg.CSRFFieldName)
			values = append(values, stringMapValues(cfg.Headers)...)
			values = append(values, stringMapValues(cfg.Body)...)
		case "extract":
			var cfg struct {
				Rules map[string]string `json:"rules"`
			}
			_ = json.Unmarshal(step.Config, &cfg)
			if len(cfg.Rules) == 0 {
				issues = append(issues, stepError(step.ID, "rules", "Add at least one extraction rule."))
			}
			for name, selector := range cfg.Rules {
				if strings.TrimSpace(name) == "" || strings.TrimSpace(selector) == "" {
					issues = append(issues, stepError(step.ID, "rules", "Extraction rules need both a name and selector."))
				}
				values = append(values, selector)
			}
		case "condition":
			var cfg struct {
				Field string `json:"field"`
				Op    string `json:"op"`
				Value string `json:"value"`
			}
			_ = json.Unmarshal(step.Config, &cfg)
			if strings.TrimSpace(cfg.Field) == "" {
				issues = append(issues, stepError(step.ID, "field", "Condition field is required."))
			}
			if cfg.Op != "equals" {
				issues = append(issues, stepError(step.ID, "op", "Only equals is supported by the backend today."))
			}
			if step.NextTrue != "" && !stepIDs[step.NextTrue] {
				issues = append(issues, stepError(step.ID, "next_true", "Choose a valid true branch target."))
			}
			if step.NextFalse != "" && !stepIDs[step.NextFalse] {
				issues = append(issues, stepError(step.ID, "next_false", "Choose a valid false branch target."))
			}
			values = append(values, cfg.Field, cfg.Value)
		case "form_submit":
			var cfg struct {
				FormSelector string            `json:"form_selector"`
				BaseURL      string            `json:"base_url"`
				Overrides    map[string]string `json:"overrides"`
			}
			_ = json.Unmarshal(step.Config, &cfg)
			if strings.TrimSpace(cfg.FormSelector) == "" {
				issues = append(issues, stepError(step.ID, "form_selector", "Form selector is required."))
			}
			values = append(values, cfg.FormSelector, cfg.BaseURL)
			values = append(values, stringMapValues(cfg.Overrides)...)
		case "browser":
			var cfg struct {
				Actions []struct {
					Type     string `json:"type"`
					URL      string `json:"url"`
					Selector string `json:"selector"`
					Value    string `json:"value"`
				} `json:"actions"`
			}
			_ = json.Unmarshal(step.Config, &cfg)
			if len(cfg.Actions) == 0 {
				issues = append(issues, stepError(step.ID, "actions", "Add at least one browser action."))
			}
			for _, action := range cfg.Actions {
				if action.Type == "navigate" && strings.TrimSpace(action.URL) == "" {
					issues = append(issues, stepError(step.ID, "url", "Navigate actions need a URL."))
				}
				if (action.Type == "fill" || action.Type == "click" || action.Type == "wait") && strings.TrimSpace(action.Selector) == "" {
					issues = append(issues, stepError(step.ID, "selector", fmt.Sprintf("%s actions need a selector.", action.Type)))
				}
				if action.Type == "fill" && strings.TrimSpace(action.Value) == "" {
					issues = append(issues, stepError(step.ID, "value", "Fill actions need a value."))
				}
				values = append(values, action.URL, action.Selector, action.Value)
			}
		default:
			issues = append(issues, stepError(step.ID, "type", "Unsupported step type."))
		}

		for _, value := range values {
			for _, ref := range collectRefs(value) {
				parts := strings.SplitN(ref, ".", 2)
				if len(parts) != 2 || parts[0] == "" || parts[1] == "" {
					issues = append(issues, stepError(step.ID, "variables", fmt.Sprintf("Invalid variable reference: {{%s}}.", ref)))
					continue
				}
				switch parts[0] {
				case "input":
				case "extract":
					if !extractNamesByIndex[index][parts[1]] {
						issues = append(issues, stepError(step.ID, "variables", fmt.Sprintf("Unknown extracted value before this step: %s.", parts[1])))
					}
				case "var":
					if variableKeys != nil && !variableKeys[parts[1]] {
						issues = append(issues, stepError(step.ID, "variables", fmt.Sprintf("Unknown variable: %s.", parts[1])))
					}
				default:
					issues = append(issues, stepError(step.ID, "variables", fmt.Sprintf("Unsupported variable namespace: %s.", parts[0])))
				}
			}
		}
	}

	return issues
}

func collectRefs(value string) []string {
	matches := validationTemplateRegex.FindAllStringSubmatch(value, -1)
	refs := make([]string, 0, len(matches))
	for _, match := range matches {
		if len(match) > 1 {
			refs = append(refs, strings.TrimSpace(match[1]))
		}
	}
	return refs
}

func stepError(stepID string, field string, message string) ValidationIssue {
	return ValidationIssue{Severity: "error", Type: "field", StepID: stepID, Field: field, Message: message}
}

func stringMapValues(values map[string]string) []string {
	result := make([]string, 0, len(values))
	for _, value := range values {
		result = append(result, value)
	}
	return result
}

func cloneBoolMap(source map[string]bool) map[string]bool {
	result := map[string]bool{}
	for key, value := range source {
		result[key] = value
	}
	return result
}

package steps

import "flowra/internal/workflow"

func RegisterAll() {
	workflow.RegisterStep("http_request", NewHTTPRequestStep)
	workflow.RegisterStep("extract", NewExtractStep)
	workflow.RegisterStep("form_submit", NewFormSubmitStep)
	workflow.RegisterStep("browser", NewBrowserStep)
	workflow.RegisterStep("condition", NewConditionStep) // ✅ ADD THIS
}

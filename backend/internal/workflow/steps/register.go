package steps

import "flowra/internal/workflow"

func RegisterAll() {
	workflow.RegisterStep("http_request", NewHTTPRequestStep)
	workflow.RegisterStep("extract", NewExtractStep)
}

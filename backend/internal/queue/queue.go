package queue

import "context"

type Job struct {
	ID            string                 `json:"id"`
	TenantID      string                 `json:"tenant_id"`
	IntegrationID string                 `json:"integration_id"`
	WorkflowID    string                 `json:"workflow_id"`
	Environment   string                 `json:"environment"`
	Input         map[string]interface{} `json:"input"`
}

type Queue interface {
	Publish(ctx context.Context, job Job) error
	Consume(ctx context.Context, handler func(context.Context, Job) error) error
}

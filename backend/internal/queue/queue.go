package queue

import "context"

type Job struct {
	ID            string                 `json:"id"`
	IntegrationID string                 `json:"integration_id"`
	Input         map[string]interface{} `json:"input"`
}

type Queue interface {
	Publish(ctx context.Context, job Job) error
	Consume(ctx context.Context, handler func(context.Context, Job) error) error
}

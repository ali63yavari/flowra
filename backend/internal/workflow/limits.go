package workflow

import (
	"context"
	"time"
)

type Limits struct {
	MaxSteps int
	Timeout  time.Duration
}

func WithLimits(ctx context.Context, limits Limits) (
	context.Context, context.CancelFunc,
) {
	if limits.Timeout > 0 {
		return context.WithTimeout(ctx, limits.Timeout)
	}
	return ctx, func() {}
}

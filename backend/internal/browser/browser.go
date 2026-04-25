package browser

import "context"

type Browser interface {
	Navigate(ctx context.Context, url string) error
	Click(ctx context.Context, selector string) error
	Fill(ctx context.Context, selector string, value string) error
	WaitVisible(ctx context.Context, selector string) error
	HTML(ctx context.Context) (string, error)
	Close() error
}

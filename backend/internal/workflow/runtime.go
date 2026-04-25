package workflow

import (
	"context"

	"flowra/internal/browser"
	"flowra/internal/httpclient"
)

type Runtime struct {
	HTTPClient  httpclient.Client
	BrowserPool *browser.Pool
}

func NewRuntime() *Runtime {
	httpClient := httpclient.NewCookieClient()

	pool := browser.NewPool(
		5, func() (browser.Browser, error) {
			return browser.NewChromeDPBrowser()
		},
	)

	return &Runtime{
		HTTPClient:  httpClient,
		BrowserPool: pool,
	}
}

func (r *Runtime) AcquireBrowser(ctx context.Context) (browser.Browser, error) {
	return r.BrowserPool.Acquire(ctx)
}

func (r *Runtime) ReleaseBrowser(b browser.Browser) {
	r.BrowserPool.Release(b)
}

package workflow

import (
	"flowra/internal/browser"
	"flowra/internal/httpclient"
)

type Runtime struct {
	HTTPClient httpclient.Client
	Browser    browser.Browser
}

func NewRuntime() *Runtime {
	httpClient := httpclient.NewCookieClient()
	browserInstance, _ := browser.NewChromeDPBrowser()

	return &Runtime{
		HTTPClient: httpClient,
		Browser:    browserInstance,
	}
}

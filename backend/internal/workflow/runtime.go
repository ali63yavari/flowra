package workflow

import (
	"flowra/internal/httpclient"
)

type Runtime struct {
	HTTPClient httpclient.Client
	// Future:
	// Browser browser.Browser
	// CredentialService security.CredentialService
}

func NewRuntime(httpClient httpclient.Client) *Runtime {
	return &Runtime{
		HTTPClient: httpClient,
	}
}

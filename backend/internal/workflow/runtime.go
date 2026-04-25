package workflow

import (
	"flowra/internal/httpclient"
)

type Runtime struct {
	HTTPClient httpclient.Client
}

func NewRuntime() *Runtime {
	client := httpclient.NewCookieClient()

	return &Runtime{
		HTTPClient: client,
	}
}

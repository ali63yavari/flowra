package httpclient

type Request struct {
	Method  string
	URL     string
	Headers map[string]string
	Body    map[string]string
}

type Response struct {
	StatusCode int
	Body       []byte
	Headers    map[string][]string
}

type Client interface {
	Do(req *Request) (*Response, error)
}

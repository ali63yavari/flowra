package httpclient

import (
	"bytes"
	"io"
	"net/http"
	"net/http/cookiejar"
	"net/url"
	"time"
)

type CookieClient struct {
	client *http.Client
	jar    *cookiejar.Jar
}

func NewCookieClient() *CookieClient {
	jar, _ := cookiejar.New(nil)

	return &CookieClient{
		client: &http.Client{
			Timeout: 30 * time.Second,
			Jar:     jar,
		},
		jar: jar,
	}
}

func (c *CookieClient) Do(req *Request) (*Response, error) {
	var body io.Reader

	if req.Body != nil {
		form := url.Values{}
		for k, v := range req.Body {
			form.Set(k, v)
		}
		body = bytes.NewBufferString(form.Encode())
	}

	httpReq, err := http.NewRequest(req.Method, req.URL, body)
	if err != nil {
		return nil, err
	}

	for k, v := range req.Headers {
		httpReq.Header.Set(k, v)
	}

	resp, err := c.client.Do(httpReq)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	return &Response{
		StatusCode: resp.StatusCode,
		Body:       respBody,
		Headers:    resp.Header,
	}, nil
}

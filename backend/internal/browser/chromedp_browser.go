package browser

import (
	"context"
	"time"

	"github.com/chromedp/chromedp"
)

type ChromeDPBrowser struct {
	ctx    context.Context
	cancel context.CancelFunc
}

func NewChromeDPBrowser() (*ChromeDPBrowser, error) {
	opts := append(
		chromedp.DefaultExecAllocatorOptions[:],
		chromedp.Headless,
		chromedp.DisableGPU,
	)

	allocCtx, _ := chromedp.NewExecAllocator(context.Background(), opts...)
	ctx, cancel := chromedp.NewContext(allocCtx)

	return &ChromeDPBrowser{
		ctx:    ctx,
		cancel: cancel,
	}, nil
}

func (b *ChromeDPBrowser) Navigate(ctx context.Context, url string) error {
	return chromedp.Run(
		b.ctx,
		chromedp.Navigate(url),
	)
}

func (b *ChromeDPBrowser) Click(ctx context.Context, selector string) error {
	return chromedp.Run(
		b.ctx,
		chromedp.Click(selector, chromedp.NodeVisible),
	)
}

func (b *ChromeDPBrowser) Fill(
	ctx context.Context,
	selector string,
	value string,
) error {
	return chromedp.Run(
		b.ctx,
		chromedp.SetValue(selector, value),
	)
}

func (b *ChromeDPBrowser) WaitVisible(ctx context.Context, selector string) error {
	return chromedp.Run(
		b.ctx,
		chromedp.WaitVisible(selector),
	)
}

func (b *ChromeDPBrowser) HTML(ctx context.Context) (string, error) {
	var html string
	err := chromedp.Run(
		b.ctx,
		chromedp.Sleep(1*time.Second),
		chromedp.OuterHTML("html", &html),
	)
	return html, err
}

func (b *ChromeDPBrowser) Close() error {
	b.cancel()
	return nil
}

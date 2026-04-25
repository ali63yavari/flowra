package browser

import (
	"context"
	"sync"
)

type Pool struct {
	size     int
	browsers chan Browser
	factory  func() (Browser, error)

	mu      sync.Mutex
	created int
}

func NewPool(size int, factory func() (Browser, error)) *Pool {
	return &Pool{
		size:     size,
		browsers: make(chan Browser, size),
		factory:  factory,
	}
}

func (p *Pool) Acquire(ctx context.Context) (Browser, error) {
	select {
	case b := <-p.browsers:
		return b, nil
	default:
		p.mu.Lock()
		if p.created < p.size {
			p.created++
			p.mu.Unlock()
			return p.factory()
		}
		p.mu.Unlock()

		select {
		case b := <-p.browsers:
			return b, nil
		case <-ctx.Done():
			return nil, ctx.Err()
		}
	}
}

func (p *Pool) Release(b Browser) {
	select {
	case p.browsers <- b:
	default:
		// pool full → close browser
		b.Close()
	}
}

package middleware

import (
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"

	"flowra/internal/models"
)

type rateLimiter struct {
	mu     sync.Mutex
	counts map[string]int
	reset  map[string]time.Time
}

var rl = &rateLimiter{
	counts: make(map[string]int),
	reset:  make(map[string]time.Time),
}

func RateLimit() fiber.Handler {
	return func(c *fiber.Ctx) error {

		tenant := c.Locals("tenant").(*models.Tenant)
		id := tenant.ID

		rl.mu.Lock()
		defer rl.mu.Unlock()

		now := time.Now()

		if rl.reset[id].Before(now) {
			rl.reset[id] = now.Add(time.Minute)
			rl.counts[id] = 0
		}

		if rl.counts[id] >= tenant.RateLimitPerMinute {
			return fiber.ErrTooManyRequests
		}

		rl.counts[id]++

		return c.Next()
	}
}

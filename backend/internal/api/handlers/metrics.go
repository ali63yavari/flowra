package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

func MetricsHandler() fiber.Handler {
	h := promhttp.Handler()

	return func(c *fiber.Ctx) error {
		h.ServeHTTP(c.Context().Response.BodyWriter(), c.Context().Request())
		return nil
	}
}

package observability

import (
	"github.com/prometheus/client_golang/prometheus"
)

var (
	JobsProcessed = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "flowra_jobs_processed_total",
			Help: "Total number of processed jobs",
		},
		[]string{"status"},
	)
)

func InitMetrics() {
	prometheus.MustRegister(JobsProcessed)
}

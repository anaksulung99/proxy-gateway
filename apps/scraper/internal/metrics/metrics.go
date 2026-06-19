package metrics

import (
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

var (
	sourceRunsTotal = promauto.NewCounterVec(prometheus.CounterOpts{
		Namespace: "scraper",
		Subsystem: "source",
		Name:      "runs_total",
		Help:      "Total scrape runs per source grouped by trigger and result.",
	}, []string{"source", "trigger", "result"})

	sourceDurationSeconds = promauto.NewHistogramVec(prometheus.HistogramOpts{
		Namespace: "scraper",
		Subsystem: "source",
		Name:      "duration_seconds",
		Help:      "Scrape duration per source grouped by trigger and result.",
		Buckets:   []float64{0.1, 0.25, 0.5, 1, 2.5, 5, 10, 20, 30, 60, 120},
	}, []string{"source", "trigger", "result"})

	sourceEntriesTotal = promauto.NewCounterVec(prometheus.CounterOpts{
		Namespace: "scraper",
		Subsystem: "source",
		Name:      "entries_total",
		Help:      "Total scraped proxy entries emitted per source and trigger.",
	}, []string{"source", "trigger"})

	sourceLastEntries = promauto.NewGaugeVec(prometheus.GaugeOpts{
		Namespace: "scraper",
		Subsystem: "source",
		Name:      "last_entries",
		Help:      "Latest scraped entry count per source and trigger.",
	}, []string{"source", "trigger"})

	sourceLastSuccessTimestamp = promauto.NewGaugeVec(prometheus.GaugeOpts{
		Namespace: "scraper",
		Subsystem: "source",
		Name:      "last_success_timestamp",
		Help:      "Unix timestamp of the latest successful scrape per source and trigger.",
	}, []string{"source", "trigger"})
)

func ObserveSourceRun(source, trigger, result string, startedAt time.Time, entries int) {
	if source == "" {
		source = "unknown"
	}
	if trigger == "" {
		trigger = "unknown"
	}
	if result == "" {
		result = "unknown"
	}

	sourceRunsTotal.WithLabelValues(source, trigger, result).Inc()
	sourceDurationSeconds.WithLabelValues(source, trigger, result).Observe(time.Since(startedAt).Seconds())

	if entries < 0 {
		entries = 0
	}

	sourceLastEntries.WithLabelValues(source, trigger).Set(float64(entries))

	if result == "success" {
		sourceEntriesTotal.WithLabelValues(source, trigger).Add(float64(entries))
		sourceLastSuccessTimestamp.WithLabelValues(source, trigger).Set(float64(time.Now().Unix()))
	}
}

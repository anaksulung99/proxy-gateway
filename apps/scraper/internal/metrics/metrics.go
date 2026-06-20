package metrics

import (
	"sort"
	"strings"
	"sync"
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

type sourceRunState struct {
	Source              string
	Trigger             string
	LastResult          string
	LastRunAt           time.Time
	LastSuccessAt       time.Time
	LastDurationMs      int64
	LastEntries         int
	TotalRuns           int
	SuccessfulRuns      int
	ErrorRuns           int
	PanicRuns           int
	UnknownSourceRuns   int
	ConsecutiveFailures int
}

type SourceTriggerHealth struct {
	Trigger             string     `json:"trigger"`
	Status              string     `json:"status"`
	LastResult          string     `json:"lastResult"`
	LastRunAt           *time.Time `json:"lastRunAt"`
	LastSuccessAt       *time.Time `json:"lastSuccessAt"`
	LastDurationMs      int64      `json:"lastDurationMs"`
	LastEntries         int        `json:"lastEntries"`
	TotalRuns           int        `json:"totalRuns"`
	SuccessfulRuns      int        `json:"successfulRuns"`
	ErrorRuns           int        `json:"errorRuns"`
	PanicRuns           int        `json:"panicRuns"`
	UnknownSourceRuns   int        `json:"unknownSourceRuns"`
	ConsecutiveFailures int        `json:"consecutiveFailures"`
}

type SourceHealth struct {
	Source              string                `json:"source"`
	Status              string                `json:"status"`
	LastResult          string                `json:"lastResult"`
	LastRunAt           *time.Time            `json:"lastRunAt"`
	LastSuccessAt       *time.Time            `json:"lastSuccessAt"`
	LastDurationMs      int64                 `json:"lastDurationMs"`
	LastEntries         int                   `json:"lastEntries"`
	TotalRuns           int                   `json:"totalRuns"`
	SuccessfulRuns      int                   `json:"successfulRuns"`
	ErrorRuns           int                   `json:"errorRuns"`
	PanicRuns           int                   `json:"panicRuns"`
	UnknownSourceRuns   int                   `json:"unknownSourceRuns"`
	ConsecutiveFailures int                   `json:"consecutiveFailures"`
	Triggers            []SourceTriggerHealth `json:"triggers"`
}

var (
	sourceStateMu sync.RWMutex
	sourceStates  = map[string]*sourceRunState{}
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

	finishedAt := time.Now()
	durationMs := finishedAt.Sub(startedAt).Milliseconds()

	sourceStateMu.Lock()
	state := sourceStates[sourceStateKey(source, trigger)]
	if state == nil {
		state = &sourceRunState{Source: source, Trigger: trigger}
		sourceStates[sourceStateKey(source, trigger)] = state
	}
	state.LastResult = result
	state.LastRunAt = finishedAt
	state.LastDurationMs = durationMs
	state.LastEntries = entries
	state.TotalRuns++
	switch result {
	case "success":
		state.SuccessfulRuns++
		state.ConsecutiveFailures = 0
		state.LastSuccessAt = finishedAt
	case "panic":
		state.PanicRuns++
		state.ConsecutiveFailures++
	case "unknown_source":
		state.UnknownSourceRuns++
		state.ConsecutiveFailures++
	default:
		state.ErrorRuns++
		state.ConsecutiveFailures++
	}
	sourceStateMu.Unlock()

	if result == "success" {
		sourceEntriesTotal.WithLabelValues(source, trigger).Add(float64(entries))
		sourceLastSuccessTimestamp.WithLabelValues(source, trigger).Set(float64(finishedAt.Unix()))
	}
}

func SourceHealthSummary(registeredSources []string) []SourceHealth {
	sourceStateMu.RLock()
	defer sourceStateMu.RUnlock()

	grouped := map[string][]*sourceRunState{}
	for _, state := range sourceStates {
		grouped[state.Source] = append(grouped[state.Source], cloneSourceRunState(state))
	}

	seen := map[string]bool{}
	sources := make([]string, 0, len(registeredSources)+len(grouped))
	for _, source := range registeredSources {
		if source == "" || seen[source] {
			continue
		}
		seen[source] = true
		sources = append(sources, source)
	}
	for source := range grouped {
		if seen[source] {
			continue
		}
		sources = append(sources, source)
	}
	sort.Strings(sources)

	out := make([]SourceHealth, 0, len(sources))
	for _, source := range sources {
		states := grouped[source]
		if len(states) == 0 {
			out = append(out, SourceHealth{
				Source:   source,
				Status:   "idle",
				Triggers: []SourceTriggerHealth{},
			})
			continue
		}

		sort.Slice(states, func(i, j int) bool {
			return states[i].Trigger < states[j].Trigger
		})

		item := SourceHealth{
			Source:   source,
			Status:   "idle",
			Triggers: make([]SourceTriggerHealth, 0, len(states)),
		}

		latestRunAt := time.Time{}
		triggerStatuses := make([]string, 0, len(states))
		for _, state := range states {
			triggerStatus := stateStatus(state)
			triggerStatuses = append(triggerStatuses, triggerStatus)
			triggerLastRunAt := timePtr(state.LastRunAt)
			triggerLastSuccessAt := timePtr(state.LastSuccessAt)

			item.Triggers = append(item.Triggers, SourceTriggerHealth{
				Trigger:             state.Trigger,
				Status:              triggerStatus,
				LastResult:          state.LastResult,
				LastRunAt:           triggerLastRunAt,
				LastSuccessAt:       triggerLastSuccessAt,
				LastDurationMs:      state.LastDurationMs,
				LastEntries:         state.LastEntries,
				TotalRuns:           state.TotalRuns,
				SuccessfulRuns:      state.SuccessfulRuns,
				ErrorRuns:           state.ErrorRuns,
				PanicRuns:           state.PanicRuns,
				UnknownSourceRuns:   state.UnknownSourceRuns,
				ConsecutiveFailures: state.ConsecutiveFailures,
			})

			item.TotalRuns += state.TotalRuns
			item.SuccessfulRuns += state.SuccessfulRuns
			item.ErrorRuns += state.ErrorRuns
			item.PanicRuns += state.PanicRuns
			item.UnknownSourceRuns += state.UnknownSourceRuns
			if state.ConsecutiveFailures > item.ConsecutiveFailures {
				item.ConsecutiveFailures = state.ConsecutiveFailures
			}
			if state.LastSuccessAt.After(zeroOr(item.LastSuccessAt)) {
				item.LastSuccessAt = timePtr(state.LastSuccessAt)
			}
			if state.LastRunAt.After(latestRunAt) {
				latestRunAt = state.LastRunAt
				item.LastRunAt = timePtr(state.LastRunAt)
				item.LastResult = state.LastResult
				item.LastDurationMs = state.LastDurationMs
				item.LastEntries = state.LastEntries
			}
		}
		item.Status = aggregateSourceStatus(triggerStatuses)

		out = append(out, item)
	}

	return out
}

func sourceStateKey(source, trigger string) string {
	return source + "\x00" + trigger
}

func cloneSourceRunState(state *sourceRunState) *sourceRunState {
	cloned := *state
	return &cloned
}

func stateStatus(state *sourceRunState) string {
	if state == nil || state.TotalRuns == 0 {
		return "idle"
	}

	switch state.LastResult {
	case "success":
		return "healthy"
	case "unknown_source":
		return "misconfigured"
	case "panic":
		if !state.LastSuccessAt.IsZero() {
			return "degraded"
		}
		return "error"
	default:
		if state.ConsecutiveFailures >= 3 {
			return "error"
		}
		if !state.LastSuccessAt.IsZero() {
			return "degraded"
		}
		return "error"
	}
}

func aggregateSourceStatus(statuses []string) string {
	if len(statuses) == 0 {
		return "idle"
	}

	var hasHealthy, hasDegraded, hasError, hasMisconfigured bool
	for _, status := range statuses {
		switch strings.ToLower(status) {
		case "misconfigured":
			hasMisconfigured = true
		case "error":
			hasError = true
		case "degraded":
			hasDegraded = true
		case "healthy":
			hasHealthy = true
		}
	}

	switch {
	case hasMisconfigured:
		return "misconfigured"
	case hasDegraded:
		return "degraded"
	case hasHealthy && hasError:
		return "degraded"
	case hasError:
		return "error"
	case hasHealthy:
		return "healthy"
	default:
		return "idle"
	}
}

func timePtr(value time.Time) *time.Time {
	if value.IsZero() {
		return nil
	}
	cloned := value.UTC()
	return &cloned
}

func zeroOr(value *time.Time) time.Time {
	if value == nil {
		return time.Time{}
	}
	return *value
}

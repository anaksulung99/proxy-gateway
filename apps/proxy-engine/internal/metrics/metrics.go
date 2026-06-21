package metrics

import (
	"strconv"
	"strings"
	"sync"
	"sync/atomic"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/proxy-system/proxy-engine/internal/usage"
	pkgconfig "github.com/proxy-system/proxy-engine/pkg/config"
)

type Metrics struct {
	requestTotal       *prometheus.CounterVec
	requestDuration    *prometheus.HistogramVec
	responseBytesTotal *prometheus.CounterVec
	runtimeFailure     *prometheus.CounterVec
	configReloadTotal  *prometheus.CounterVec
	runtimeConfig      *prometheus.GaugeVec
	snapshot           runtimeSnapshot
}

type RuntimeSummary struct {
	Requests struct {
		Total         int64   `json:"total"`
		Success       int64   `json:"success"`
		Failed        int64   `json:"failed"`
		TunnelTotal   int64   `json:"tunnelTotal"`
		DirectTotal   int64   `json:"directTotal"`
		ResponseBytes int64   `json:"responseBytes"`
		AvgDurationMs float64 `json:"avgDurationMs"`
		SuccessRate   float64 `json:"successRate"`
	} `json:"requests"`
	Tunnel struct {
		Established    int64 `json:"established"`
		ConnectFailed  int64 `json:"connectFailed"`
		UpstreamIssues int64 `json:"upstreamIssues"`
		ClientIssues   int64 `json:"clientIssues"`
		NoPayload      int64 `json:"noPayload"`
	} `json:"tunnel"`
	RuntimeFailures struct {
		ObservedTotal        int64 `json:"observedTotal"`
		QuarantinedTotal     int64 `json:"quarantinedTotal"`
		TimeoutObserved      int64 `json:"timeoutObserved"`
		TimeoutQuarantined   int64 `json:"timeoutQuarantined"`
		UnhealthyObserved    int64 `json:"unhealthyObserved"`
		UnhealthyQuarantined int64 `json:"unhealthyQuarantined"`
	} `json:"runtimeFailures"`
	Config struct {
		ReloadsTotal                  int64 `json:"reloadsTotal"`
		RuntimeFailureThreshold       int64 `json:"runtimeFailureThreshold"`
		RuntimeFailureWindowSec       int64 `json:"runtimeFailureWindowSec"`
		RuntimeAutoRecheckEnabled     bool  `json:"runtimeAutoRecheckEnabled"`
		RuntimeAutoRecheckDelaySec    int64 `json:"runtimeAutoRecheckDelaySec"`
		RuntimeAutoRecheckMaxAttempts int64 `json:"runtimeAutoRecheckMaxAttempts"`
		RuntimeAutoRetryDelaySec      int64 `json:"runtimeAutoRetryDelaySec"`
	} `json:"config"`
}

type runtimeSnapshot struct {
	totalRequests                 atomic.Int64
	successRequests               atomic.Int64
	failedRequests                atomic.Int64
	tunnelRequests                atomic.Int64
	directRequests                atomic.Int64
	totalDurationMs               atomic.Int64
	totalResponseBytes            atomic.Int64
	tunnelEstablished             atomic.Int64
	tunnelConnectFailed           atomic.Int64
	tunnelUpstreamIssues          atomic.Int64
	tunnelClientIssues            atomic.Int64
	tunnelNoPayload               atomic.Int64
	runtimeObservedTimeout        atomic.Int64
	runtimeObservedUnhealthy      atomic.Int64
	runtimeObservedUnknown        atomic.Int64
	runtimeQuarantinedTimeout     atomic.Int64
	runtimeQuarantinedUnhealthy   atomic.Int64
	runtimeQuarantinedUnknown     atomic.Int64
	configReloads                 atomic.Int64
	runtimeFailureThreshold       atomic.Int64
	runtimeFailureWindowSec       atomic.Int64
	runtimeAutoRecheckEnabled     atomic.Bool
	runtimeAutoRecheckDelaySec    atomic.Int64
	runtimeAutoRecheckMaxAttempts atomic.Int64
	runtimeAutoRetryDelaySec      atomic.Int64
}

var (
	defaultMetrics *Metrics
	once           sync.Once
)

func Default(usageSink *usage.Sink) *Metrics {
	once.Do(func() {
		defaultMetrics = newMetrics(usageSink)
	})
	return defaultMetrics
}

func newMetrics(usageSink *usage.Sink) *Metrics {
	m := &Metrics{
		requestTotal: registerCounterVec(prometheus.NewCounterVec(
			prometheus.CounterOpts{
				Namespace: "proxy_engine",
				Name:      "requests_total",
				Help:      "Total inbound requests handled by the proxy gateway.",
			},
			[]string{"method", "tunnel", "success", "status_class", "phase"},
		)),
		requestDuration: registerHistogramVec(prometheus.NewHistogramVec(
			prometheus.HistogramOpts{
				Namespace: "proxy_engine",
				Name:      "request_duration_seconds",
				Help:      "End-to-end inbound request duration at the proxy gateway.",
				Buckets:   []float64{0.01, 0.05, 0.1, 0.25, 0.5, 1, 3, 5, 10, 30, 60},
			},
			[]string{"method", "tunnel", "success", "phase"},
		)),
		responseBytesTotal: registerCounterVec(prometheus.NewCounterVec(
			prometheus.CounterOpts{
				Namespace: "proxy_engine",
				Name:      "response_bytes_total",
				Help:      "Total response bytes served through the proxy gateway.",
			},
			[]string{"method", "tunnel", "success"},
		)),
		runtimeFailure: registerCounterVec(prometheus.NewCounterVec(
			prometheus.CounterOpts{
				Namespace: "proxy_engine",
				Name:      "runtime_failures_total",
				Help:      "Runtime upstream failures observed and quarantined by the engine.",
			},
			[]string{"status", "stage"},
		)),
		configReloadTotal: registerCounterVec(prometheus.NewCounterVec(
			prometheus.CounterOpts{
				Namespace: "proxy_engine",
				Name:      "config_reloads_total",
				Help:      "Total config reload events applied by the proxy-engine watcher.",
			},
			[]string{"source"},
		)),
		runtimeConfig: registerGaugeVec(prometheus.NewGaugeVec(
			prometheus.GaugeOpts{
				Namespace: "proxy_engine",
				Name:      "runtime_config_value",
				Help:      "Current runtime policy values applied to runtime failure tracking and auto recheck.",
			},
			[]string{"name"},
		)),
	}

	if usageSink != nil {
		registerCollector(prometheus.NewGaugeFunc(
			prometheus.GaugeOpts{
				Namespace: "proxy_engine",
				Name:      "usage_dropped_total",
				Help:      "Dropped usage log events because the async sink channel was full.",
			},
			func() float64 {
				return float64(usageSink.DroppedCount())
			},
		))
	}

	return m
}

func (m *Metrics) ObserveUsage(event usage.Event) {
	if m == nil {
		return
	}

	method := event.RequestMethod
	if method == "" {
		method = "unknown"
	}
	tunnel := strconv.FormatBool(event.IsTunnel)
	success := strconv.FormatBool(event.Success)
	phase := requestPhase(event)

	m.requestTotal.WithLabelValues(
		method,
		tunnel,
		success,
		statusClass(event.StatusCode),
		phase,
	).Inc()

	m.requestDuration.WithLabelValues(method, tunnel, success, phase).
		Observe(float64(event.DurationMs) / 1000.0)

	m.snapshot.totalRequests.Add(1)
	m.snapshot.totalDurationMs.Add(event.DurationMs)
	if event.Success {
		m.snapshot.successRequests.Add(1)
	} else {
		m.snapshot.failedRequests.Add(1)
	}
	if event.IsTunnel {
		m.snapshot.tunnelRequests.Add(1)
		switch phase {
		case "upstream_connect_failed":
			m.snapshot.tunnelConnectFailed.Add(1)
		case "tunnel_upstream_issue":
			m.snapshot.tunnelUpstreamIssues.Add(1)
			m.snapshot.tunnelEstablished.Add(1)
		case "tunnel_client_issue":
			m.snapshot.tunnelClientIssues.Add(1)
			m.snapshot.tunnelEstablished.Add(1)
		case "tunnel_no_payload":
			m.snapshot.tunnelNoPayload.Add(1)
			m.snapshot.tunnelEstablished.Add(1)
		default:
			m.snapshot.tunnelEstablished.Add(1)
		}
	} else {
		m.snapshot.directRequests.Add(1)
	}
	if event.ResponseBytes > 0 {
		m.responseBytesTotal.WithLabelValues(method, tunnel, success).
			Add(float64(event.ResponseBytes))
		m.snapshot.totalResponseBytes.Add(event.ResponseBytes)
	}
}

func (m *Metrics) ObserveRuntimeFailure(status, stage string) {
	if m == nil {
		return
	}
	if status == "" {
		status = "unknown"
	}
	if stage == "" {
		stage = "observed"
	}
	m.runtimeFailure.WithLabelValues(status, stage).Inc()
	switch stage {
	case "quarantined":
		switch status {
		case "timeout":
			m.snapshot.runtimeQuarantinedTimeout.Add(1)
		case "unhealthy":
			m.snapshot.runtimeQuarantinedUnhealthy.Add(1)
		default:
			m.snapshot.runtimeQuarantinedUnknown.Add(1)
		}
	default:
		switch status {
		case "timeout":
			m.snapshot.runtimeObservedTimeout.Add(1)
		case "unhealthy":
			m.snapshot.runtimeObservedUnhealthy.Add(1)
		default:
			m.snapshot.runtimeObservedUnknown.Add(1)
		}
	}
}

func (m *Metrics) ObserveConfigReload(source string) {
	if m == nil {
		return
	}
	if source == "" {
		source = "unknown"
	}
	m.configReloadTotal.WithLabelValues(source).Inc()
	m.snapshot.configReloads.Add(1)
}

func (m *Metrics) ApplyRuntimeConfig(cfg *pkgconfig.Config, autoRecheckEnabled bool) {
	if m == nil || cfg == nil {
		return
	}

	m.runtimeConfig.WithLabelValues("runtime_failure_threshold").Set(float64(cfg.RuntimeFailureThreshold))
	m.runtimeConfig.WithLabelValues("runtime_failure_window_sec").Set(float64(cfg.RuntimeFailureWindowSec))
	m.runtimeConfig.WithLabelValues("runtime_auto_recheck_enabled").Set(boolFloat(autoRecheckEnabled))
	m.runtimeConfig.WithLabelValues("runtime_auto_recheck_delay_sec").Set(float64(cfg.RuntimeAutoRecheckDelaySec))
	m.runtimeConfig.WithLabelValues("runtime_auto_recheck_max_attempts").Set(float64(cfg.RuntimeAutoRecheckMax))
	m.runtimeConfig.WithLabelValues("runtime_auto_retry_delay_sec").Set(float64(cfg.RuntimeAutoRetryDelaySec))
	m.snapshot.runtimeFailureThreshold.Store(int64(cfg.RuntimeFailureThreshold))
	m.snapshot.runtimeFailureWindowSec.Store(int64(cfg.RuntimeFailureWindowSec))
	m.snapshot.runtimeAutoRecheckEnabled.Store(autoRecheckEnabled)
	m.snapshot.runtimeAutoRecheckDelaySec.Store(int64(cfg.RuntimeAutoRecheckDelaySec))
	m.snapshot.runtimeAutoRecheckMaxAttempts.Store(int64(cfg.RuntimeAutoRecheckMax))
	m.snapshot.runtimeAutoRetryDelaySec.Store(int64(cfg.RuntimeAutoRetryDelaySec))
}

func (m *Metrics) Snapshot() RuntimeSummary {
	var summary RuntimeSummary
	if m == nil {
		return summary
	}

	total := m.snapshot.totalRequests.Load()
	success := m.snapshot.successRequests.Load()
	failed := m.snapshot.failedRequests.Load()
	durationMs := m.snapshot.totalDurationMs.Load()

	summary.Requests.Total = total
	summary.Requests.Success = success
	summary.Requests.Failed = failed
	summary.Requests.TunnelTotal = m.snapshot.tunnelRequests.Load()
	summary.Requests.DirectTotal = m.snapshot.directRequests.Load()
	summary.Requests.ResponseBytes = m.snapshot.totalResponseBytes.Load()
	if total > 0 {
		summary.Requests.AvgDurationMs = float64(durationMs) / float64(total)
		summary.Requests.SuccessRate = float64(success) / float64(total) * 100
	}

	summary.Tunnel.Established = m.snapshot.tunnelEstablished.Load()
	summary.Tunnel.ConnectFailed = m.snapshot.tunnelConnectFailed.Load()
	summary.Tunnel.UpstreamIssues = m.snapshot.tunnelUpstreamIssues.Load()
	summary.Tunnel.ClientIssues = m.snapshot.tunnelClientIssues.Load()
	summary.Tunnel.NoPayload = m.snapshot.tunnelNoPayload.Load()

	summary.RuntimeFailures.TimeoutObserved = m.snapshot.runtimeObservedTimeout.Load()
	summary.RuntimeFailures.UnhealthyObserved = m.snapshot.runtimeObservedUnhealthy.Load()
	summary.RuntimeFailures.ObservedTotal =
		summary.RuntimeFailures.TimeoutObserved +
			summary.RuntimeFailures.UnhealthyObserved +
			m.snapshot.runtimeObservedUnknown.Load()
	summary.RuntimeFailures.TimeoutQuarantined = m.snapshot.runtimeQuarantinedTimeout.Load()
	summary.RuntimeFailures.UnhealthyQuarantined = m.snapshot.runtimeQuarantinedUnhealthy.Load()
	summary.RuntimeFailures.QuarantinedTotal =
		summary.RuntimeFailures.TimeoutQuarantined +
			summary.RuntimeFailures.UnhealthyQuarantined +
			m.snapshot.runtimeQuarantinedUnknown.Load()

	summary.Config.ReloadsTotal = m.snapshot.configReloads.Load()
	summary.Config.RuntimeFailureThreshold = m.snapshot.runtimeFailureThreshold.Load()
	summary.Config.RuntimeFailureWindowSec = m.snapshot.runtimeFailureWindowSec.Load()
	summary.Config.RuntimeAutoRecheckEnabled = m.snapshot.runtimeAutoRecheckEnabled.Load()
	summary.Config.RuntimeAutoRecheckDelaySec = m.snapshot.runtimeAutoRecheckDelaySec.Load()
	summary.Config.RuntimeAutoRecheckMaxAttempts = m.snapshot.runtimeAutoRecheckMaxAttempts.Load()
	summary.Config.RuntimeAutoRetryDelaySec = m.snapshot.runtimeAutoRetryDelaySec.Load()

	return summary
}

func requestPhase(event usage.Event) string {
	if !event.IsTunnel {
		return "direct"
	}
	if !event.Success {
		return "upstream_connect_failed"
	}

	message := strings.ToLower(event.ErrorMessage)
	switch {
	case strings.Contains(message, "upstream stream error"):
		return "tunnel_upstream_issue"
	case strings.Contains(message, "client stream error"):
		return "tunnel_client_issue"
	case strings.Contains(message, "no payload"):
		return "tunnel_no_payload"
	case strings.TrimSpace(message) == "":
		return "tunnel_established"
	default:
		return "tunnel_established"
	}
}

func statusClass(code int) string {
	switch {
	case code >= 200 && code < 300:
		return "2xx"
	case code >= 300 && code < 400:
		return "3xx"
	case code >= 400 && code < 500:
		return "4xx"
	case code >= 500 && code < 600:
		return "5xx"
	default:
		return "unknown"
	}
}

func boolFloat(value bool) float64 {
	if value {
		return 1
	}
	return 0
}

func registerCollector(collector prometheus.Collector) prometheus.Collector {
	if err := prometheus.Register(collector); err != nil {
		if existing, ok := err.(prometheus.AlreadyRegisteredError); ok {
			return existing.ExistingCollector
		}
	}
	return collector
}

func registerCounterVec(counter *prometheus.CounterVec) *prometheus.CounterVec {
	return registerCollector(counter).(*prometheus.CounterVec)
}

func registerHistogramVec(histogram *prometheus.HistogramVec) *prometheus.HistogramVec {
	return registerCollector(histogram).(*prometheus.HistogramVec)
}

func registerGaugeVec(gauge *prometheus.GaugeVec) *prometheus.GaugeVec {
	return registerCollector(gauge).(*prometheus.GaugeVec)
}

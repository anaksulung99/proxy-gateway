package checker

import "time"

// CheckMode represents which checker to use
type CheckMode string

const (
	ModeRequest    CheckMode = "request"
	ModePlaywright CheckMode = "playwright"
	ModeCrawlee    CheckMode = "crawlee"
)

// CheckJob is the job payload from RabbitMQ
type CheckJob struct {
	JobID     string    `json:"job_id"`
	ProxyID   string    `json:"proxy_id"`
	Host      string    `json:"host"`
	Port      string    `json:"port"`
	Protocol  string    `json:"protocol"`
	Username  string    `json:"username,omitempty"`
	Password  string    `json:"password,omitempty"`
	Mode      CheckMode `json:"mode"`
	TargetURL string    `json:"target_url"`
}

// CheckResult is the outcome of a health check
type CheckResult struct {
	JobID        string        `json:"job_id"`
	ProxyID      string        `json:"proxy_id"`
	Healthy      bool          `json:"healthy"`
	Latency      time.Duration `json:"latency_ms"`
	ReturnedIP   string        `json:"returned_ip,omitempty"`
	StatusCode   int           `json:"status_code,omitempty"`
	ErrorMessage string        `json:"error,omitempty"`
	Mode         CheckMode     `json:"mode"`
	CheckedAt    time.Time     `json:"checked_at"`
}

// Checker interface — each mode implements this
type Checker interface {
	Check(job CheckJob) CheckResult
}

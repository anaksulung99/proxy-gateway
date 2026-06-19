package checker

import (
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/rs/zerolog"
)

type RequestChecker struct {
	log     zerolog.Logger
	timeout time.Duration
}

func NewRequestChecker(log zerolog.Logger, timeoutSeconds int) *RequestChecker {
	return &RequestChecker{
		log:     log,
		timeout: time.Duration(timeoutSeconds) * time.Second,
	}
}

func (c *RequestChecker) Check(job CheckJob) CheckResult {
	start := time.Now()
	result := CheckResult{
		JobID:     job.JobID,
		ProxyID:   job.ProxyID,
		Mode:      ModeRequest,
		CheckedAt: start,
	}

	proxyURL := fmt.Sprintf("%s://%s:%s", job.Protocol, job.Host, job.Port)
	if job.Username != "" {
		proxyURL = fmt.Sprintf("%s://%s:%s@%s:%s",
			job.Protocol, job.Username, job.Password, job.Host, job.Port)
	}

	parsed, err := url.Parse(proxyURL)
	if err != nil {
		result.Healthy = false
		result.ErrorMessage = "invalid proxy URL"
		return result
	}

	transport := &http.Transport{
		Proxy: http.ProxyURL(parsed),
	}
	client := &http.Client{
		Transport: transport,
		Timeout:   c.timeout,
	}

	resp, err := client.Get(job.TargetURL)
	result.Latency = time.Since(start)

	if err != nil {
		result.Healthy = false
		result.ErrorMessage = err.Error()
		return result
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
	result.StatusCode = resp.StatusCode
	result.ReturnedIP = strings.TrimSpace(string(body))
	result.Healthy = resp.StatusCode >= 200 && resp.StatusCode < 400

	return result
}

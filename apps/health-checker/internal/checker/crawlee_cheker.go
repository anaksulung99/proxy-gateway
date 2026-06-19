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

// CrawleeChecker performs an HTTP request through the proxy but mimics a real
// browser (headers / user-agent) the way Crawlee would — useful to detect
// proxies that block plain HTTP clients but allow browser-like traffic.
type CrawleeChecker struct {
	log     zerolog.Logger
	timeout time.Duration
}

func NewCrawleeChecker(log zerolog.Logger, timeoutSeconds int) *CrawleeChecker {
	return &CrawleeChecker{log: log, timeout: time.Duration(timeoutSeconds) * time.Second}
}

func (c *CrawleeChecker) Check(job CheckJob) CheckResult {
	start := time.Now()
	result := CheckResult{JobID: job.JobID, ProxyID: job.ProxyID, Mode: ModeCrawlee, CheckedAt: start}

	proxyURL := fmt.Sprintf("%s://%s:%s", job.Protocol, job.Host, job.Port)
	if job.Username != "" {
		proxyURL = fmt.Sprintf("%s://%s:%s@%s:%s", job.Protocol, job.Username, job.Password, job.Host, job.Port)
	}
	parsed, err := url.Parse(proxyURL)
	if err != nil {
		result.ErrorMessage = "invalid proxy URL"
		return result
	}

	client := &http.Client{
		Transport: &http.Transport{Proxy: http.ProxyURL(parsed)},
		Timeout:   c.timeout,
	}

	req, _ := http.NewRequest(http.MethodGet, job.TargetURL, nil)
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
	req.Header.Set("Accept-Language", "en-US,en;q=0.9")

	resp, err := client.Do(req)
	result.Latency = time.Since(start)
	if err != nil {
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

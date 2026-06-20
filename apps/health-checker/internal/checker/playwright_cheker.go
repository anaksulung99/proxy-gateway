package checker

import (
	"fmt"
	"strings"
	"time"

	"github.com/playwright-community/playwright-go"
	"github.com/rs/zerolog"
)

type PlaywrightChecker struct {
	log     zerolog.Logger
	timeout time.Duration
}

func NewPlaywrightChecker(log zerolog.Logger, timeoutSeconds int) *PlaywrightChecker {
	return &PlaywrightChecker{
		log:     log,
		timeout: time.Duration(timeoutSeconds) * time.Second,
	}
}

// proxyScheme maps our protocols to a Playwright proxy server scheme.
func proxyScheme(protocol string) string {
	if strings.HasPrefix(strings.ToLower(protocol), "socks") {
		return "socks5"
	}
	return "http"
}

func (c *PlaywrightChecker) Check(job CheckJob) CheckResult {
	start := time.Now()
	result := CheckResult{
		JobID:     job.JobID,
		ProxyID:   job.ProxyID,
		Mode:      ModePlaywright,
		CheckedAt: start,
	}

	pw, err := playwright.Run()
	if err != nil {
		result.ErrorMessage = fmt.Sprintf("playwright init: %v", err)
		return result
	}
	defer pw.Stop()

	proxy := &playwright.Proxy{
		Server: fmt.Sprintf("%s://%s:%s", proxyScheme(job.Protocol), job.Host, job.Port),
	}
	if job.Username != "" {
		proxy.Username = playwright.String(job.Username)
		proxy.Password = playwright.String(job.Password)
	}

	browser, err := pw.Chromium.Launch(playwright.BrowserTypeLaunchOptions{
		Headless: playwright.Bool(true),
		Args:     []string{"--no-sandbox", "--disable-setuid-sandbox"},
		Proxy:    proxy,
	})
	if err != nil {
		result.ErrorMessage = fmt.Sprintf("browser launch: %v", err)
		return result
	}
	defer browser.Close()

	ctx, err := browser.NewContext(playwright.BrowserNewContextOptions{
		IgnoreHttpsErrors: playwright.Bool(true),
	})
	if err != nil {
		result.ErrorMessage = fmt.Sprintf("browser context: %v", err)
		return result
	}

	page, err := ctx.NewPage()
	if err != nil {
		result.ErrorMessage = fmt.Sprintf("new page: %v", err)
		return result
	}

	timeoutMs := float64(c.timeout.Milliseconds())
	resp, err := page.Goto(job.TargetURL, playwright.PageGotoOptions{Timeout: &timeoutMs})
	result.Latency = time.Since(start)
	if err != nil {
		result.ErrorMessage = err.Error()
		return result
	}

	result.StatusCode = resp.Status()
	result.Healthy = result.StatusCode >= 200 && result.StatusCode < 400

	// Capture the exit IP (judge URL returns it) for geo enrichment.
	if body, berr := resp.Text(); berr == nil {
		ip := strings.TrimSpace(body)
		if len(ip) > 45 {
			ip = ip[:45]
		}
		result.ReturnedIP = ip
	}

	return result
}

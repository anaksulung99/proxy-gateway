package checker

import (
	"fmt"
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
		result.Healthy = false
		result.ErrorMessage = fmt.Sprintf("playwright init: %v", err)
		return result
	}
	defer pw.Stop()

	proxyAddr := fmt.Sprintf("%s:%s", job.Host, job.Port)
	launchOpts := playwright.BrowserTypeLaunchOptions{
		Headless: playwright.Bool(true),
		Args: []string{
			"--no-sandbox",
			"--disable-setuid-sandbox",
			fmt.Sprintf("--proxy-server=%s://%s", job.Protocol, proxyAddr),
		},
	}

	browser, err := pw.Chromium.Launch(launchOpts)
	if err != nil {
		result.Healthy = false
		result.ErrorMessage = fmt.Sprintf("browser launch: %v", err)
		return result
	}
	defer browser.Close()

	ctx, err := browser.NewContext()
	if err != nil {
		result.Healthy = false
		result.ErrorMessage = fmt.Sprintf("browser context: %v", err)
		return result
	}

	page, err := ctx.NewPage()
	if err != nil {
		result.Healthy = false
		result.ErrorMessage = fmt.Sprintf("new page: %v", err)
		return result
	}

	timeoutMs := float64(c.timeout.Milliseconds())
	resp, err := page.Goto(job.TargetURL, playwright.PageGotoOptions{
		Timeout: &timeoutMs,
	})

	result.Latency = time.Since(start)

	if err != nil {
		result.Healthy = false
		result.ErrorMessage = err.Error()
		return result
	}

	result.StatusCode = resp.Status()
	result.Healthy = result.StatusCode >= 200 && result.StatusCode < 400
	return result
}

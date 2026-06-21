package adapters

import (
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/http/cookiejar"
	"os"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/PuerkitoBio/goquery"
)

const httpTimeout = 20 * time.Second

// Shared client with a cookie jar so anti-bot challenge cookies set on the first
// request are reused on retries and subsequent paginated requests. http.Client is
// safe for concurrent use.
var (
	sharedClientOnce sync.Once
	sharedClient     *http.Client
)

func httpClient() *http.Client {
	sharedClientOnce.Do(func() {
		jar, _ := cookiejar.New(nil)
		sharedClient = &http.Client{Timeout: httpTimeout, Jar: jar}
	})
	return sharedClient
}

// paginationDelay sleeps between paginated page fetches to avoid tripping
// per-IP rate limits (e.g. proxydb's HTTP 429). Configurable via
// SCRAPER_PAGINATION_DELAY_MS (default 800ms; 0 disables).
func paginationDelay() {
	pageDelayMs(800, "SCRAPER_PAGINATION_DELAY_MS")
}

// pageDelayMs sleeps fallbackMs (or the first set env in names) between paginated
// requests. Lets rate-limit-prone sources (proxydb) use a longer gap.
func pageDelayMs(fallbackMs int, names ...string) {
	ms := fallbackMs
	for _, n := range names {
		if v := envInt(n, -1); v >= 0 {
			ms = v
			break
		}
	}
	if ms > 0 {
		time.Sleep(time.Duration(ms) * time.Millisecond)
	}
}

var (
	ipPortRe = regexp.MustCompile(`\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):(\d{2,5})\b`)
	ipRe     = regexp.MustCompile(`^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$`)
	cc2Re    = regexp.MustCompile(`^[A-Z]{2}$`)
)

type httpRequestConfig struct {
	Method  string
	Body    string
	Headers map[string]string
}

// Fuller browser fingerprint — naive 403 anti-bot filters check for these
// headers. (Accept-Encoding is intentionally omitted so Go's transport handles
// gzip transparently.)
var defaultRequestHeaders = map[string]string{
	"User-Agent":                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
	"Accept":                    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
	"Accept-Language":           "en-US,en;q=0.9",
	"Upgrade-Insecure-Requests": "1",
	"Sec-Fetch-Dest":            "document",
	"Sec-Fetch-Mode":            "navigate",
	"Sec-Fetch-User":            "?1",
	"Sec-CH-UA":                 `"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"`,
	"Sec-CH-UA-Mobile":          "?0",
	"Sec-CH-UA-Platform":        `"Windows"`,
}

// httpGet fetches a URL with browser-like defaults, retry, and fallback support.
func httpGet(url string) (string, error) {
	return httpFetchWithFallback([]string{url}, httpRequestConfig{Method: http.MethodGet})
}

func httpGetAny(urls ...string) (string, error) {
	return httpFetchWithFallback(urls, httpRequestConfig{Method: http.MethodGet})
}

func httpDo(url string, cfg httpRequestConfig) (string, error) {
	return httpFetchWithFallback([]string{url}, cfg)
}

func httpFetchWithFallback(urls []string, cfg httpRequestConfig) (string, error) {
	if len(urls) == 0 {
		return "", errors.New("no urls provided")
	}
	if cfg.Method == "" {
		cfg.Method = http.MethodGet
	}

	client := httpClient()
	attempts := envInt("SCRAPER_HTTP_RETRY_ATTEMPTS", 3)
	if attempts < 1 {
		attempts = 1
	}

	var failureMessages []string

	for _, targetURL := range urls {
		targetURL = strings.TrimSpace(targetURL)
		if targetURL == "" {
			continue
		}

		for attempt := 1; attempt <= attempts; attempt++ {
			bodyReader := io.Reader(nil)
			if cfg.Body != "" {
				bodyReader = strings.NewReader(cfg.Body)
			}

			req, err := http.NewRequest(cfg.Method, targetURL, bodyReader)
			if err != nil {
				failureMessages = append(failureMessages, fmt.Sprintf("%s build request: %v", targetURL, err))
				break
			}

			for key, value := range defaultRequestHeaders {
				req.Header.Set(key, value)
			}
			for key, value := range cfg.Headers {
				req.Header.Set(key, value)
			}

			resp, err := client.Do(req)
			if err != nil {
				if attempt < attempts && isRetryableTransportError(err) {
					time.Sleep(retryDelay(attempt, 0))
					continue
				}
				failureMessages = append(failureMessages, fmt.Sprintf("%s attempt %d: %v", targetURL, attempt, err))
				break
			}

			bodyBytes, readErr := io.ReadAll(io.LimitReader(resp.Body, 8<<20))
			_ = resp.Body.Close()
			if readErr != nil {
				if attempt < attempts {
					time.Sleep(retryDelay(attempt, 0))
					continue
				}
				failureMessages = append(failureMessages, fmt.Sprintf("%s attempt %d: read body: %v", targetURL, attempt, readErr))
				break
			}

			if resp.StatusCode >= 400 {
				if attempt < attempts && shouldRetryHTTPStatus(resp.StatusCode) {
					wait := retryAfterDelay(resp.Header.Get("Retry-After"))
					if wait <= 0 {
						if resp.StatusCode == http.StatusTooManyRequests {
							wait = rateLimitBackoff(attempt) // patient exponential backoff for 429
						} else {
							wait = retryDelay(attempt, 0)
						}
					}
					time.Sleep(wait)
					continue
				}
				failureMessages = append(failureMessages, fmt.Sprintf("%s attempt %d: http %d", targetURL, attempt, resp.StatusCode))
				break
			}

			return string(bodyBytes), nil
		}
	}

	if len(failureMessages) == 0 {
		return "", errors.New("all fetch attempts failed")
	}
	return "", errors.New(strings.Join(failureMessages, "; "))
}

func shouldRetryHTTPStatus(status int) bool {
	return status == http.StatusTooManyRequests || status == http.StatusRequestTimeout || status == http.StatusTooEarly || (status >= 500 && status <= 599)
}

func isRetryableTransportError(err error) bool {
	var netErr net.Error
	if errors.As(err, &netErr) {
		return true
	}
	return errors.Is(err, io.EOF)
}

func retryDelay(attempt int, retryAfter time.Duration) time.Duration {
	if retryAfter > 0 {
		return retryAfter
	}

	backoff := envInt("SCRAPER_HTTP_RETRY_BACKOFF_MS", 400)
	if backoff < 0 {
		backoff = 0
	}
	return time.Duration(backoff*attempt) * time.Millisecond
}

// rateLimitBackoff is a patient exponential backoff for HTTP 429 responses that
// don't carry a Retry-After header (e.g. proxydb): 2s, 4s, 8s… capped at 15s.
// Tunable via SCRAPER_RATELIMIT_BACKOFF_MS.
func rateLimitBackoff(attempt int) time.Duration {
	base := envInt("SCRAPER_RATELIMIT_BACKOFF_MS", 2000)
	if base < 0 {
		base = 0
	}
	d := time.Duration(base) * time.Millisecond
	for i := 1; i < attempt; i++ {
		d *= 2
	}
	if d > 15*time.Second {
		d = 15 * time.Second
	}
	return d
}

func retryAfterDelay(value string) time.Duration {
	value = strings.TrimSpace(value)
	if value == "" {
		return 0
	}

	if seconds, err := strconv.Atoi(value); err == nil && seconds >= 0 {
		return time.Duration(seconds) * time.Second
	}

	if when, err := http.ParseTime(value); err == nil {
		delay := time.Until(when)
		if delay > 0 {
			return delay
		}
	}
	return 0
}

func validPort(p string) bool {
	n, err := strconv.Atoi(p)
	return err == nil && n >= 1 && n <= 65535
}

// parseHostPortText extracts every host:port pair from plain text / loose HTML.
func parseHostPortText(body, protocol string) []ProxyEntry {
	seen := map[string]bool{}
	var out []ProxyEntry
	for _, m := range ipPortRe.FindAllStringSubmatch(body, -1) {
		if !validPort(m[2]) {
			continue
		}
		key := m[1] + ":" + m[2]
		if seen[key] {
			continue
		}
		seen[key] = true
		out = append(out, ProxyEntry{Host: m[1], Port: m[2], Protocol: protocol})
	}
	return out
}

func envInt(name string, fallback int) int {
	raw := strings.TrimSpace(os.Getenv(name))
	if raw == "" {
		return fallback
	}
	value, err := strconv.Atoi(raw)
	if err != nil {
		return fallback
	}
	return value
}

func paginationMaxPages(names ...string) int {
	for _, name := range names {
		if value := envInt(name, 0); value > 0 {
			return value
		}
	}
	return 0
}

// parseTableAuto walks HTML table rows and, per row, finds the IP cell, the
// adjacent port cell, and a 2-letter country code cell if present. Resilient
// to column-order differences across the free-proxy-list-style sites.
func parseTableAuto(htmlStr, protocol string) ([]ProxyEntry, error) {
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(htmlStr))
	if err != nil {
		return nil, err
	}
	seen := map[string]bool{}
	var out []ProxyEntry

	doc.Find("table tr").Each(func(_ int, row *goquery.Selection) {
		var cells []string
		row.Find("td").Each(func(_ int, td *goquery.Selection) {
			cells = append(cells, strings.TrimSpace(td.Text()))
		})
		if len(cells) < 2 {
			return
		}
		ipIdx := -1
		for i, c := range cells {
			if ipRe.MatchString(c) {
				ipIdx = i
				break
			}
		}
		if ipIdx == -1 || ipIdx+1 >= len(cells) {
			return
		}
		ip := cells[ipIdx]
		port := cells[ipIdx+1]
		if !validPort(port) {
			return
		}
		country := ""
		for _, c := range cells {
			if cc2Re.MatchString(c) {
				country = c
				break
			}
		}
		key := ip + ":" + port
		if seen[key] {
			return
		}
		seen[key] = true
		out = append(out, ProxyEntry{Host: ip, Port: port, Protocol: protocol, Country: country})
	})
	return out, nil
}

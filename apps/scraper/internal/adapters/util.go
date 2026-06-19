package adapters

import (
	"io"
	"net/http"
	"os"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/PuerkitoBio/goquery"
)

const httpTimeout = 20 * time.Second

var (
	ipPortRe = regexp.MustCompile(`\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):(\d{2,5})\b`)
	ipRe     = regexp.MustCompile(`^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$`)
	cc2Re    = regexp.MustCompile(`^[A-Z]{2}$`)
)

// httpGet fetches a URL with a browser-like User-Agent and a size cap.
func httpGet(url string) (string, error) {
	client := &http.Client{Timeout: httpTimeout}
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/json,*/*;q=0.8")
	req.Header.Set("Accept-Language", "en-US,en;q=0.9")

	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	b, _ := io.ReadAll(io.LimitReader(resp.Body, 8<<20))
	return string(b), nil
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

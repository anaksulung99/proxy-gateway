package adapters

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"

	"github.com/rs/zerolog"
)

type ProxyDailyAdapter struct{ log zerolog.Logger }

func NewProxyDailyAdapter(log zerolog.Logger) Adapter {
	return &ProxyDailyAdapter{log: log}
}

func (a *ProxyDailyAdapter) Name() string { return "proxy-daily" }

func (a *ProxyDailyAdapter) Scrape() ([]ProxyEntry, error) {
	const pageSize = 1000
	maxPages := paginationMaxPages("PROXY_DAILY_MAX_PAGES", "SCRAPER_PAGINATION_MAX_PAGES")
	seen := map[string]bool{}
	var out []ProxyEntry
	totalRows := 0

	for page := 0; ; page++ {
		if maxPages > 0 && page >= maxPages {
			break
		}

		start := page * pageSize
		body, err := fetchProxyDailyPage(start, pageSize)
		if err != nil {
			return nil, err
		}

		var resp proxyDailyResponse
		if err := json.Unmarshal([]byte(body), &resp); err != nil {
			return nil, err
		}

		rows := resp.rows()
		if len(rows) == 0 {
			break
		}

		pageCount := 0
		for _, row := range rows {
			entry := row.toProxyEntry()
			if entry == nil {
				continue
			}

			key := entry.Host + ":" + entry.Port
			if seen[key] {
				continue
			}
			seen[key] = true
			pageCount++
			out = append(out, *entry)
		}

		if pageCount == 0 {
			break
		}

		totalRows += len(rows)
		if resp.total() > 0 && totalRows >= resp.total() {
			break
		}
	}

	return out, nil
}

type proxyDailyResponse struct {
	Data            []any `json:"data"`
	RecordsTotal    int   `json:"recordsTotal"`
	RecordsFiltered int   `json:"recordsFiltered"`
}

type proxyDailyRow struct {
	Host      string
	Port      string
	Protocol  string
	Anonymity string
	Country   string
}

func (r proxyDailyResponse) rows() []proxyDailyRow {
	out := make([]proxyDailyRow, 0, len(r.Data))
	for _, item := range r.Data {
		row := normalizeProxyDailyRow(item)
		if row.Host == "" {
			continue
		}
		out = append(out, row)
	}
	return out
}

func (r proxyDailyResponse) total() int {
	if r.RecordsFiltered > 0 {
		return r.RecordsFiltered
	}
	return r.RecordsTotal
}

func normalizeProxyDailyRow(item any) proxyDailyRow {
	switch value := item.(type) {
	case []any:
		return proxyDailyRow{
			Host:      proxyDailyText(valueAt(value, 0)),
			Port:      proxyDailyText(valueAt(value, 1)),
			Protocol:  proxyDailyText(valueAt(value, 2)),
			Anonymity: proxyDailyText(valueAt(value, 4)),
			Country:   proxyDailyText(valueAt(value, 5)),
		}
	case map[string]any:
		return proxyDailyRow{
			Host:      proxyDailyText(value["ip"]),
			Port:      proxyDailyText(value["port"]),
			Protocol:  proxyDailyText(value["protocol"]),
			Anonymity: proxyDailyText(value["anonymity"]),
			Country:   proxyDailyText(value["country"]),
		}
	default:
		return proxyDailyRow{}
	}
}

func valueAt(values []any, index int) any {
	if index < 0 || index >= len(values) {
		return nil
	}
	return values[index]
}

func proxyDailyText(value any) string {
	if value == nil {
		return ""
	}
	return strings.TrimSpace(fmt.Sprint(value))
}

func (r proxyDailyRow) toProxyEntry() *ProxyEntry {
	host := strings.TrimSpace(r.Host)
	port := strings.TrimSpace(r.Port)
	if !ipRe.MatchString(host) || !validPort(port) {
		return nil
	}

	return &ProxyEntry{
		Host:     host,
		Port:     port,
		Protocol: mapProxyDailyProtocol(r.Protocol),
		Country:  normalizeCountryCode(r.Country),
	}
}

func fetchProxyDailyPage(start, length int) (string, error) {
	params := url.Values{
		"draw":          {"2"},
		"start":         {strconv.Itoa(start)},
		"length":        {strconv.Itoa(length)},
		"search[value]": {""},
		"search[regex]": {"false"},
		"_":             {"1"},
	}

	columns := []string{"ip", "port", "protocol", "speed", "anonymity", "country"}
	for index, column := range columns {
		prefix := fmt.Sprintf("columns[%d]", index)
		params.Set(prefix+"[data]", column)
		params.Set(prefix+"[name]", column)
		params.Set(prefix+"[searchable]", "true")
		params.Set(prefix+"[orderable]", "false")
		params.Set(prefix+"[search][value]", "")
		params.Set(prefix+"[search][regex]", "false")
	}

	client := &http.Client{Timeout: httpTimeout}
	req, err := http.NewRequest(http.MethodGet, "https://proxy-daily.com/api/serverside/proxies?"+params.Encode(), nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")
	req.Header.Set("Accept", "application/json, text/javascript, */*; q=0.01")
	req.Header.Set("Accept-Language", "en-US,en;q=0.9")
	req.Header.Set("Referer", "https://proxy-daily.com/")
	req.Header.Set("X-Requested-With", "XMLHttpRequest")

	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return "", fmt.Errorf("proxy-daily http %d", resp.StatusCode)
	}

	bodyBytes, err := io.ReadAll(io.LimitReader(resp.Body, 8<<20))
	if err != nil {
		return "", err
	}
	return string(bodyBytes), nil
}

func mapProxyDailyProtocol(value string) string {
	v := strings.ToLower(strings.TrimSpace(value))
	if strings.Contains(v, "socks") {
		return "socks5"
	}
	if strings.Contains(v, "https") || strings.Contains(v, "ssl") {
		return "https"
	}
	return "http"
}

func normalizeCountryCode(value string) string {
	raw := strings.ToUpper(strings.TrimSpace(value))
	if cc2Re.MatchString(raw) {
		return raw
	}
	return ""
}

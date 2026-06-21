package adapters

import (
	"net/http"
	"net/url"
	"regexp"
	"strings"

	"github.com/PuerkitoBio/goquery"
	"github.com/rs/zerolog"
)

type SpysOneAdapter struct{ log zerolog.Logger }

func NewSpysOneAdapter(log zerolog.Logger) Adapter {
	return &SpysOneAdapter{log: log}
}

func (a *SpysOneAdapter) Name() string { return "spys-one" }

func (a *SpysOneAdapter) Scrape() ([]ProxyEntry, error) {
	body, err := httpGet("https://spys.one/en/free-proxy-list/")
	if err != nil {
		return nil, err
	}

	expandedBody, err := fetchSpysOneExpanded(body)
	if err == nil && expandedBody != "" {
		body = expandedBody
	}

	doc, err := goquery.NewDocumentFromReader(strings.NewReader(body))
	if err != nil {
		return nil, err
	}

	seen := map[string]bool{}
	var out []ProxyEntry

	doc.Find("tr.spy1x, tr.spy1xx").Each(func(_ int, tr *goquery.Selection) {
		entry := parseSpysOneRow(tr)
		if entry == nil {
			return
		}

		key := entry.Host + ":" + entry.Port
		if seen[key] {
			return
		}
		seen[key] = true
		out = append(out, *entry)
	})

	if len(out) > 0 {
		return out, nil
	}

	return parseHostPortText(body, "http"), nil
}

var spysOneIPRe = regexp.MustCompile(`(\d{1,3}\.){3}\d{1,3}`)
var spysOnePortRe = regexp.MustCompile(`:\s*(\d{1,5})`)
var spysOneCountryHrefRe = regexp.MustCompile(`(?i)/free-proxy-list/([a-z]{2})/`)

func fetchSpysOneExpanded(initialBody string) (string, error) {
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(initialBody))
	if err != nil {
		return "", err
	}

	token, exists := doc.Find("input[name='xx0']").Attr("value")
	if !exists || strings.TrimSpace(token) == "" {
		return "", nil
	}

	form := url.Values{
		"xx0": {token},
		"xpp": {"5"},
		"xf1": {"0"},
		"xf2": {"0"},
		"xf4": {"0"},
		"xf5": {"0"},
	}

	return httpDo("https://spys.one/en/free-proxy-list/", httpRequestConfig{
		Method: http.MethodPost,
		Body:   form.Encode(),
		Headers: map[string]string{
			"Accept":       "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
			"Content-Type": "application/x-www-form-urlencoded",
			"Referer":      "https://spys.one/en/free-proxy-list/",
		},
	})
}

func parseSpysOneRow(tr *goquery.Selection) *ProxyEntry {
	tds := tr.ChildrenFiltered("td")
	if tds.Length() < 4 {
		return nil
	}

	host, port := extractSpysOneAddress(tds.Eq(0))
	if !ipRe.MatchString(host) || !validPort(port) {
		return nil
	}

	return &ProxyEntry{
		Host:     host,
		Port:     port,
		Protocol: parseSpysOneProtocol(tds.Eq(1).Text()),
		Country:  parseSpysOneCountryCode(tds.Eq(3)),
	}
}

func extractSpysOneAddress(td *goquery.Selection) (string, string) {
	cloned := td.Clone()
	cloned.Find("script").Remove()
	text := strings.Join(strings.Fields(cloned.Text()), " ")

	host := spysOneIPRe.FindString(text)
	portMatch := spysOnePortRe.FindStringSubmatch(text)
	if len(portMatch) == 2 {
		return host, portMatch[1]
	}

	html, err := td.Html()
	if err == nil {
		host = spysOneIPRe.FindString(html)
		portMatch = spysOnePortRe.FindStringSubmatch(html)
		if len(portMatch) == 2 {
			return host, portMatch[1]
		}
	}

	return host, ""
}

func parseSpysOneProtocol(value string) string {
	text := strings.ToLower(strings.Join(strings.Fields(value), " "))
	switch {
	case strings.Contains(text, "socks"):
		return "socks5"
	case strings.Contains(text, "https"), strings.Contains(text, "ssl"):
		return "https"
	default:
		return "http"
	}
}

func parseSpysOneCountryCode(td *goquery.Selection) string {
	if href, ok := td.Find("a").First().Attr("href"); ok {
		match := spysOneCountryHrefRe.FindStringSubmatch(href)
		if len(match) == 2 {
			return strings.ToUpper(match[1])
		}
	}

	text := strings.ToUpper(strings.TrimSpace(td.Text()))
	if cc2Re.MatchString(text) {
		return text
	}
	return ""
}

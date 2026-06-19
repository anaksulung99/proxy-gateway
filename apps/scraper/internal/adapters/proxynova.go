package adapters

import (
	"net/url"
	"regexp"
	"strconv"
	"strings"

	"github.com/PuerkitoBio/goquery"
	"github.com/rs/zerolog"
)

type ProxynovaAdapter struct{ log zerolog.Logger }

func NewProxyNovaAdapter(log zerolog.Logger) Adapter {
	return &ProxynovaAdapter{log: log}
}

func (a *ProxynovaAdapter) Name() string { return "proxynova" }

func (a *ProxynovaAdapter) Scrape() ([]ProxyEntry, error) {
	pageURL, _ := url.Parse("https://www.proxynova.com/proxy-server-list/")
	totalPages := 1
	maxPages := paginationMaxPages("PROXYNOVA_MAX_PAGES", "SCRAPER_PAGINATION_MAX_PAGES")
	seen := map[string]bool{}
	var out []ProxyEntry

	for page := 1; page <= totalPages; page++ {
		query := pageURL.Query()
		if page == 1 {
			query.Del("p")
		} else {
			query.Set("p", strconv.Itoa(page))
		}
		pageURL.RawQuery = query.Encode()

		body, err := httpGet(pageURL.String())
		if err != nil {
			return nil, err
		}

		doc, err := goquery.NewDocumentFromReader(strings.NewReader(body))
		if err != nil {
			return nil, err
		}

		if page == 1 {
			totalPages = getProxyNovaTotalPages(doc)
			if maxPages > 0 && totalPages > maxPages {
				totalPages = maxPages
			}
		}

		rows := doc.Find("tr[data-proxy-id]")
		if rows.Length() == 0 {
			rows = doc.Find("table tbody tr")
		}

		pageCount := 0
		rows.Each(func(_ int, tr *goquery.Selection) {
			entry := parseProxyNovaRow(tr)
			if entry == nil {
				return
			}

			key := entry.Host + ":" + entry.Port
			if seen[key] {
				return
			}
			seen[key] = true
			pageCount++
			out = append(out, *entry)
		})

		if pageCount == 0 {
			break
		}
	}

	return out, nil
}

var proxynovaIPRe = regexp.MustCompile(`(\d{1,3}\.){3}\d{1,3}`)
var proxynovaScriptRe = regexp.MustCompile(`(?is)<script.*?</script>`)
var proxynovaCountryHrefRe = regexp.MustCompile(`country-([a-z]{2})/?`)

func getProxyNovaTotalPages(doc *goquery.Document) int {
	totalPages := 1

	doc.Find("a[href*='?p='], a[href*='&p=']").Each(func(_ int, link *goquery.Selection) {
		href, ok := link.Attr("href")
		if !ok || href == "" {
			return
		}

		parsed, err := url.Parse(href)
		if err != nil {
			return
		}

		page, err := strconv.Atoi(parsed.Query().Get("p"))
		if err != nil {
			return
		}
		if page > totalPages {
			totalPages = page
		}
	})

	return totalPages
}

func parseProxyNovaRow(tr *goquery.Selection) *ProxyEntry {
	tds := tr.Find("td")
	if tds.Length() < 7 {
		return nil
	}

	host := extractProxyNovaHost(tds.Eq(0))
	port := strings.TrimSpace(tds.Eq(1).Text())
	if !ipRe.MatchString(host) || !validPort(port) {
		return nil
	}

	portNumber, err := strconv.Atoi(port)
	if err != nil {
		return nil
	}

	return &ProxyEntry{
		Host:     host,
		Port:     port,
		Protocol: inferProxyNovaProtocol(portNumber, tds.Eq(3).Text()),
		Country:  parseProxyNovaCountryCode(tds.Eq(5)),
	}
}

func extractProxyNovaHost(td *goquery.Selection) string {
	html, err := td.Html()
	if err == nil && html != "" {
		clean := proxynovaScriptRe.ReplaceAllString(html, " ")
		if match := proxynovaIPRe.FindString(clean); match != "" {
			return match
		}
	}

	if match := proxynovaIPRe.FindString(td.Text()); match != "" {
		return match
	}
	return ""
}

func inferProxyNovaProtocol(port int, typeText string) string {
	value := strings.ToLower(strings.TrimSpace(typeText))

	switch {
	case port == 1080 || port == 1081 || port == 1082:
		return "socks5"
	case strings.Contains(value, "socks"):
		return "socks5"
	case strings.Contains(value, "https"), strings.Contains(value, "ssl"):
		return "https"
	case port == 443 || port == 8443:
		return "https"
	default:
		return "http"
	}
}

func parseProxyNovaCountryCode(td *goquery.Selection) string {
	if href, ok := td.Find("a").First().Attr("href"); ok {
		match := proxynovaCountryHrefRe.FindStringSubmatch(strings.ToLower(href))
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

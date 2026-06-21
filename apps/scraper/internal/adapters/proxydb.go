package adapters

import (
	"net/url"
	"strconv"
	"strings"

	"github.com/PuerkitoBio/goquery"
	"github.com/rs/zerolog"
)

type ProxydbAdapter struct{ log zerolog.Logger }

func NewProxyDbAdapter(log zerolog.Logger) Adapter {
	return &ProxydbAdapter{log: log}
}

func (a *ProxydbAdapter) Name() string { return "proxydb" }

func (a *ProxydbAdapter) Scrape() ([]ProxyEntry, error) {
	pageURL, _ := url.Parse("https://proxydb.net/?offset=0")
	currentOffset := 0
	pageCount := 0
	maxPages := paginationMaxPages("PROXYDB_MAX_PAGES", "SCRAPER_PAGINATION_MAX_PAGES")
	visitedOffsets := map[int]bool{}
	seen := map[string]bool{}
	var out []ProxyEntry

	for !visitedOffsets[currentOffset] {
		visitedOffsets[currentOffset] = true
		pageCount++
		if pageCount > 1 {
			// proxydb rate-limits deep pagination — use a longer gap (2.5s).
			pageDelayMs(2500, "PROXYDB_DELAY_MS", "SCRAPER_PAGINATION_DELAY_MS")
		}
		pageURL.RawQuery = url.Values{"offset": []string{strconv.Itoa(currentOffset)}}.Encode()

		body, err := httpDo(pageURL.String(), httpRequestConfig{
			Headers: map[string]string{"Referer": "https://proxydb.net/"},
		})
		if err != nil {
			return nil, err
		}

		doc, err := goquery.NewDocumentFromReader(strings.NewReader(body))
		if err != nil {
			return nil, err
		}

		parsedInPage := 0
		doc.Find("table tbody tr").Each(func(_ int, tr *goquery.Selection) {
			proxy := parseProxyDbRow(tr)
			if proxy == nil {
				return
			}

			key := proxy.Host + ":" + proxy.Port
			if seen[key] {
				return
			}
			seen[key] = true
			parsedInPage++
			out = append(out, *proxy)
		})

		if parsedInPage == 0 {
			break
		}
		if maxPages > 0 && pageCount >= maxPages {
			break
		}

		nextOffset := getProxyDbNextOffset(doc)
		if nextOffset == nil || *nextOffset <= currentOffset {
			break
		}
		currentOffset = *nextOffset
	}

	return out, nil
}

func getProxyDbNextOffset(doc *goquery.Document) *int {
	var nextOffset *int

	doc.Find("a[href*='offset=']").Each(func(_ int, link *goquery.Selection) {
		if nextOffset != nil {
			return
		}

		text := strings.ToLower(strings.Join(strings.Fields(link.Text()), " "))
		if !strings.Contains(text, "next") {
			return
		}

		href, ok := link.Attr("href")
		if !ok || href == "" {
			return
		}

		parsed, err := url.Parse(href)
		if err != nil {
			return
		}

		offset, err := strconv.Atoi(parsed.Query().Get("offset"))
		if err != nil {
			return
		}
		nextOffset = &offset
	})

	return nextOffset
}

func parseProxyDbRow(tr *goquery.Selection) *ProxyEntry {
	tds := tr.Find("td")
	if tds.Length() < 4 {
		return nil
	}

	host := strings.TrimSpace(tds.Eq(0).Find("a").First().Text())
	if host == "" {
		host = strings.TrimSpace(tds.Eq(0).Text())
	}
	port := strings.TrimSpace(tds.Eq(1).Find("a").First().Text())
	if port == "" {
		port = strings.TrimSpace(tds.Eq(1).Text())
	}
	if !ipRe.MatchString(host) || !validPort(port) {
		return nil
	}

	country := strings.ToUpper(strings.TrimSpace(tds.Eq(3).Find("abbr").First().Text()))
	rowText := strings.ToLower(strings.Join(strings.Fields(tr.Text()), " "))
	protocol := "http"
	if strings.Contains(rowText, "socks") {
		protocol = "socks5"
	} else if strings.Contains(rowText, "https") || strings.Contains(rowText, "ssl") {
		protocol = "https"
	}

	return &ProxyEntry{
		Host:     host,
		Port:     port,
		Protocol: protocol,
		Country:  country,
	}
}

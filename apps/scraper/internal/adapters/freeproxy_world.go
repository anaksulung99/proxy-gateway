package adapters

import (
	"net/url"
	"strconv"
	"strings"

	"github.com/PuerkitoBio/goquery"
	"github.com/rs/zerolog"
)

type FreeproxyWorldAdapter struct{ log zerolog.Logger }

func NewFreeProxyWorldAdapter(log zerolog.Logger) Adapter {
	return &FreeproxyWorldAdapter{log: log}
}

func (a *FreeproxyWorldAdapter) Name() string { return "freeproxy-world" }

func (a *FreeproxyWorldAdapter) Scrape() ([]ProxyEntry, error) {
	pageURL, _ := url.Parse("https://www.freeproxy.world/?type=&anonymity=&country=&speed=&port=&page=1")
	totalPages := 1
	maxPages := paginationMaxPages("FREEPROXY_WORLD_MAX_PAGES", "SCRAPER_PAGINATION_MAX_PAGES")
	seen := map[string]bool{}
	var out []ProxyEntry

	for page := 1; page <= totalPages; page++ {
		query := pageURL.Query()
		query.Set("page", strconv.Itoa(page))
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
			totalPages = getFreeproxyWorldTotalPages(doc)
			if maxPages > 0 && totalPages > maxPages {
				totalPages = maxPages
			}
		}

		parsedInPage := 0
		doc.Find("table tbody tr").Each(func(_ int, tr *goquery.Selection) {
			proxy := parseFreeproxyWorldRow(tr)
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
	}

	return out, nil
}

func getFreeproxyWorldTotalPages(doc *goquery.Document) int {
	totalPages := 1

	doc.Find(".pagination a[href*='page=']").Each(func(_ int, link *goquery.Selection) {
		href, ok := link.Attr("href")
		if !ok || href == "" {
			return
		}

		parsed, err := url.Parse(href)
		if err != nil {
			return
		}

		page, err := strconv.Atoi(parsed.Query().Get("page"))
		if err != nil {
			return
		}

		if page > totalPages {
			totalPages = page
		}
	})

	return totalPages
}

func parseFreeproxyWorldRow(tr *goquery.Selection) *ProxyEntry {
	tds := tr.Find("td")
	if tds.Length() < 7 {
		return nil
	}

	host := strings.TrimSpace(tds.Eq(0).Text())
	port := strings.TrimSpace(tds.Eq(1).Text())
	if !ipRe.MatchString(host) || !validPort(port) {
		return nil
	}

	country := ""
	if href, ok := tds.Eq(2).Find("a[href*='country=']").Attr("href"); ok {
		if parsed, err := url.Parse(href); err == nil {
			country = strings.ToUpper(parsed.Query().Get("country"))
		}
	}

	protocol := "http"
	protocolText := strings.ToLower(strings.TrimSpace(tds.Eq(5).Text()))
	if strings.Contains(protocolText, "socks") {
		protocol = "socks5"
	} else if strings.Contains(protocolText, "https") || strings.Contains(protocolText, "ssl") {
		protocol = "https"
	}

	return &ProxyEntry{
		Host:     host,
		Port:     port,
		Protocol: protocol,
		Country:  country,
	}
}

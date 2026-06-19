package adapters

import (
	"net/url"
	"regexp"
	"strconv"
	"strings"

	"github.com/PuerkitoBio/goquery"
	"github.com/rs/zerolog"
)

type HideMnAdapter struct{ log zerolog.Logger }

func NewHideMnAdapter(log zerolog.Logger) Adapter {
	return &HideMnAdapter{log: log}
}

func (a *HideMnAdapter) Name() string { return "hide-mn" }

func (a *HideMnAdapter) Scrape() ([]ProxyEntry, error) {
	pageURL, _ := url.Parse("https://hide.mn/en/proxy-list/")
	totalPages := 1
	maxPages := paginationMaxPages("HIDE_MN_MAX_PAGES", "SCRAPER_PAGINATION_MAX_PAGES")
	seen := map[string]bool{}
	var out []ProxyEntry

	for page := 1; page <= totalPages; page++ {
		query := pageURL.Query()
		if page == 1 {
			query.Del("start")
		} else {
			query.Set("start", strconv.Itoa((page-1)*64))
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
			totalPages = getHideMnTotalPages(doc)
			if maxPages > 0 && totalPages > maxPages {
				totalPages = maxPages
			}
		}

		pageCount := 0
		doc.Find("table tbody tr").Each(func(_ int, tr *goquery.Selection) {
			entry := parseHideMnRow(tr)
			if entry == nil {
				return
			}

			key := entry.Host + ":" + entry.Port + ":" + entry.Protocol
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

var hideMnStartRe = regexp.MustCompile(`start=(\d+)`)
var hideMnFlagClassRe = regexp.MustCompile(`flag-icon-([a-z]{2})`)

func getHideMnTotalPages(doc *goquery.Document) int {
	maxStart := 0

	doc.Find("a[href*='/en/proxy-list/?start=']").Each(func(_ int, link *goquery.Selection) {
		href, ok := link.Attr("href")
		if !ok || href == "" {
			return
		}

		match := hideMnStartRe.FindStringSubmatch(href)
		if len(match) != 2 {
			return
		}

		start, err := strconv.Atoi(match[1])
		if err != nil {
			return
		}
		if start > maxStart {
			maxStart = start
		}
	})

	return (maxStart / 64) + 1
}

func parseHideMnRow(tr *goquery.Selection) *ProxyEntry {
	tds := tr.ChildrenFiltered("td")
	if tds.Length() < 6 {
		return nil
	}

	host := strings.TrimSpace(tds.Eq(0).Text())
	port := strings.TrimSpace(tds.Eq(1).Text())
	if !ipRe.MatchString(host) || !validPort(port) {
		return nil
	}

	return &ProxyEntry{
		Host:     host,
		Port:     port,
		Protocol: parseHideMnProtocol(tds.Eq(4).Text()),
		Country:  parseHideMnCountryCode(tds.Eq(2)),
	}
}

func parseHideMnProtocol(value string) string {
	text := strings.ToLower(strings.Join(strings.Fields(value), " "))
	switch {
	case strings.Contains(text, "socks5"), strings.Contains(text, "socks 5"):
		return "socks5"
	case strings.Contains(text, "socks4"), strings.Contains(text, "socks 4"):
		return "socks5"
	case strings.Contains(text, "https"), strings.Contains(text, "ssl"):
		return "https"
	default:
		return "http"
	}
}

func parseHideMnCountryCode(td *goquery.Selection) string {
	if className, ok := td.Find("i[class*='flag-icon-']").Attr("class"); ok {
		match := hideMnFlagClassRe.FindStringSubmatch(strings.ToLower(className))
		if len(match) == 2 {
			return strings.ToUpper(match[1])
		}
	}
	return ""
}

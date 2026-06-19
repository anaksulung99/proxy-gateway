package adapters

import (
	"encoding/json"
	"fmt"
	"math"

	"github.com/rs/zerolog"
)

type GeonodeAdapter struct{ log zerolog.Logger }

func NewGeonodeAdapter(log zerolog.Logger) Adapter {
	return &GeonodeAdapter{log: log}
}

func (a *GeonodeAdapter) Name() string { return "geonode" }

type geonodeResp struct {
	Data []struct {
		IP        string   `json:"ip"`
		Port      string   `json:"port"`
		Protocols []string `json:"protocols"`
		Country   string   `json:"country"`
	} `json:"data"`
	Total int `json:"total"`
	Limit int `json:"limit"`
}

func (a *GeonodeAdapter) Scrape() ([]ProxyEntry, error) {
	const limit = 500
	maxPages := paginationMaxPages("GEONODE_MAX_PAGES", "SCRAPER_PAGINATION_MAX_PAGES")
	totalPages := 1
	seen := map[string]bool{}
	var out []ProxyEntry

	for page := 1; page <= totalPages; page++ {
		url := fmt.Sprintf(
			"https://proxylist.geonode.com/api/proxy-list?limit=%d&page=%d&sort_by=lastChecked&sort_type=desc",
			limit,
			page,
		)

		body, err := httpGet(url)
		if err != nil {
			return nil, err
		}

		var resp geonodeResp
		if err := json.Unmarshal([]byte(body), &resp); err != nil {
			return nil, err
		}

		if page == 1 {
			responseLimit := resp.Limit
			if responseLimit <= 0 {
				responseLimit = limit
			}
			total := resp.Total
			if total <= 0 {
				total = len(resp.Data)
			}
			totalPages = int(math.Max(1, math.Ceil(float64(total)/float64(responseLimit))))
			if maxPages > 0 && totalPages > maxPages {
				totalPages = maxPages
			}
		}

		if len(resp.Data) == 0 {
			break
		}

		for _, p := range resp.Data {
			if p.IP == "" || !validPort(p.Port) {
				continue
			}

			key := p.IP + ":" + p.Port
			if seen[key] {
				continue
			}
			seen[key] = true

			protocol := "http"
			if len(p.Protocols) > 0 {
				protocol = p.Protocols[0]
				if protocol == "socks4" || protocol == "socks" {
					protocol = "socks5"
				}
			}

			out = append(out, ProxyEntry{
				Host:     p.IP,
				Port:     p.Port,
				Protocol: protocol,
				Country:  p.Country,
			})
		}
	}

	return out, nil
}

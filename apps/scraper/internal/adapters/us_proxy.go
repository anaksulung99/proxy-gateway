package adapters

import "github.com/rs/zerolog"

type UsProxyAdapter struct{ log zerolog.Logger }

func NewUsProxyAdapter(log zerolog.Logger) Adapter {
	return &UsProxyAdapter{log: log}
}

func (a *UsProxyAdapter) Name() string { return "us-proxy" }

func (a *UsProxyAdapter) Scrape() ([]ProxyEntry, error) {
	body, err := httpGet("https://www.us-proxy.org/")
	if err != nil {
		return nil, err
	}
	return parseTableAuto(body, "http")
}

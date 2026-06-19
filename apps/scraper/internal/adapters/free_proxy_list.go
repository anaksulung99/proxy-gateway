package adapters

import "github.com/rs/zerolog"

type FreeProxyListAdapter struct{ log zerolog.Logger }

func NewFreeProxyListAdapter(log zerolog.Logger) Adapter {
	return &FreeProxyListAdapter{log: log}
}

func (a *FreeProxyListAdapter) Name() string { return "free-proxy-list" }

func (a *FreeProxyListAdapter) Scrape() ([]ProxyEntry, error) {
	body, err := httpGet("https://free-proxy-list.net/")
	if err != nil {
		return nil, err
	}
	return parseTableAuto(body, "http")
}

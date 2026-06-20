package adapters

import "github.com/rs/zerolog"

type ProxyscrapeAdapter struct{ log zerolog.Logger }

func NewProxyScrapeAdapter(log zerolog.Logger) Adapter {
	return &ProxyscrapeAdapter{log: log}
}

func (a *ProxyscrapeAdapter) Name() string { return "proxyscrape" }

func (a *ProxyscrapeAdapter) Scrape() ([]ProxyEntry, error) {
	body, err := httpGetAny(
		"https://api.proxyscrape.com/v2/?request=getproxies&protocol=http&timeout=10000&country=all&ssl=all&anonymity=all",
		"https://api.proxyscrape.com/?request=getproxies&proxytype=http&timeout=10000&country=all&ssl=all&anonymity=all",
	)
	if err != nil {
		return nil, err
	}
	return parseHostPortText(body, "http"), nil
}

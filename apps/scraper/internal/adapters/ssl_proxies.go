package adapters

import "github.com/rs/zerolog"

type SslProxiesAdapter struct{ log zerolog.Logger }

func NewSslProxiesAdapter(log zerolog.Logger) Adapter {
	return &SslProxiesAdapter{log: log}
}

func (a *SslProxiesAdapter) Name() string { return "ssl-proxies" }

func (a *SslProxiesAdapter) Scrape() ([]ProxyEntry, error) {
	body, err := httpGet("https://www.sslproxies.org/")
	if err != nil {
		return nil, err
	}
	return parseTableAuto(body, "https")
}

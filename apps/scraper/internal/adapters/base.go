package adapters

import "github.com/rs/zerolog"

// ProxyEntry represents a single scraped proxy
type ProxyEntry struct {
	Host     string
	Port     string
	Protocol string // http, https, socks5
	Country  string
	Username string
	Password string
}

// Adapter interface — each source implements this
type Adapter interface {
	Name() string
	Scrape() ([]ProxyEntry, error)
}

// RegisterAll returns map of all available adapters
func RegisterAll(log zerolog.Logger) map[string]Adapter {
	adapters := []Adapter{
		NewProxyScrapeAdapter(log),
		NewFreeProxyListAdapter(log),
		NewGeonodeAdapter(log),
		NewSpysOneAdapter(log),
		NewProxyDailyAdapter(log),
		NewUsProxyAdapter(log),
		NewSslProxiesAdapter(log),
		NewHideMnAdapter(log),
		NewOpenProxyListAdapter(log),
		NewProxyDbAdapter(log),
		NewProxyNovaAdapter(log),
		NewFreeProxyWorldAdapter(log),
	}

	m := make(map[string]Adapter, len(adapters))
	for _, a := range adapters {
		m[a.Name()] = a
	}
	return m
}

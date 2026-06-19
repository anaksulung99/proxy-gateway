package adapters

import (
	"regexp"
	"strings"

	"github.com/rs/zerolog"
)

type OpenproxyListAdapter struct{ log zerolog.Logger }

func NewOpenProxyListAdapter(log zerolog.Logger) Adapter {
	return &OpenproxyListAdapter{log: log}
}

func (a *OpenproxyListAdapter) Name() string { return "openproxy-list" }

func (a *OpenproxyListAdapter) Scrape() ([]ProxyEntry, error) {
	sources := []struct {
		url      string
		protocol string
	}{
		{url: "https://raw.githubusercontent.com/roosterkid/openproxylist/main/HTTPS.txt", protocol: "https"},
		{url: "https://raw.githubusercontent.com/roosterkid/openproxylist/main/SOCKS4.txt", protocol: "socks5"},
		{url: "https://raw.githubusercontent.com/roosterkid/openproxylist/main/SOCKS5.txt", protocol: "socks5"},
	}

	seen := map[string]bool{}
	var out []ProxyEntry

	for _, source := range sources {
		body, err := httpGet(source.url)
		if err != nil {
			return nil, err
		}

		for _, entry := range parseOpenproxyListRaw(body, source.protocol) {
			key := entry.Host + ":" + entry.Port + ":" + entry.Protocol
			if seen[key] {
				continue
			}
			seen[key] = true
			out = append(out, entry)
		}
	}

	return out, nil
}

var openproxyListHostPortRe = regexp.MustCompile(`(\d{1,3}(?:\.\d{1,3}){3}):(\d{1,5})`)
var openproxyListCountryRe = regexp.MustCompile(`\s([A-Z]{2})\s\[[^\]]*\]`)

func parseOpenproxyListRaw(body string, protocol string) []ProxyEntry {
	lines := strings.Split(body, "\n")
	out := make([]ProxyEntry, 0, len(lines))

	for _, line := range lines {
		match := openproxyListHostPortRe.FindStringSubmatch(line)
		if len(match) != 3 {
			continue
		}

		host := match[1]
		port := match[2]
		if !ipRe.MatchString(host) || !validPort(port) {
			continue
		}

		country := ""
		countryMatch := openproxyListCountryRe.FindStringSubmatch(line)
		if len(countryMatch) == 2 {
			country = countryMatch[1]
		}

		out = append(out, ProxyEntry{
			Host:     host,
			Port:     port,
			Protocol: protocol,
			Country:  country,
		})
	}

	return out
}

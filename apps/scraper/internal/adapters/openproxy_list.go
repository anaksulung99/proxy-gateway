package adapters

import (
	"errors"
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
		urls     []string
		protocol string
	}{
		{
			urls: []string{
				"https://raw.githubusercontent.com/roosterkid/openproxylist/main/HTTPS.txt",
				"https://cdn.jsdelivr.net/gh/roosterkid/openproxylist@main/HTTPS.txt",
			},
			protocol: "https",
		},
		{
			urls: []string{
				"https://raw.githubusercontent.com/roosterkid/openproxylist/main/SOCKS4.txt",
				"https://cdn.jsdelivr.net/gh/roosterkid/openproxylist@main/SOCKS4.txt",
			},
			protocol: "socks5",
		},
		{
			urls: []string{
				"https://raw.githubusercontent.com/roosterkid/openproxylist/main/SOCKS5.txt",
				"https://cdn.jsdelivr.net/gh/roosterkid/openproxylist@main/SOCKS5.txt",
			},
			protocol: "socks5",
		},
	}

	seen := map[string]bool{}
	var out []ProxyEntry
	var failures []string

	for _, source := range sources {
		body, err := httpGetAny(source.urls...)
		if err != nil {
			failures = append(failures, err.Error())
			continue
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

	if len(out) == 0 && len(failures) > 0 {
		return nil, errors.New(strings.Join(failures, "; "))
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

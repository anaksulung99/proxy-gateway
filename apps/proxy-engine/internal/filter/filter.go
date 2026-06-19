package filter

import (
	"strings"

	"github.com/proxy-system/proxy-engine/internal/pool"
)

// Apply narrows the pool by protocol, geo target / country override, and the
// exclude lists. countryOverride (from the connection username) wins over the
// list's default geo target.
func Apply(proxies []pool.Upstream, rot pool.Rotation, countryOverride string) []pool.Upstream {
	wantCountry := strings.ToUpper(strings.TrimSpace(countryOverride))
	if wantCountry == "" {
		wantCountry = strings.ToUpper(strings.TrimSpace(rot.GeoTarget))
	}
	wantProto := strings.ToLower(strings.TrimSpace(rot.Protocol))

	excl := make(map[string]bool, len(rot.ExcludeCountries))
	for _, c := range rot.ExcludeCountries {
		excl[strings.ToUpper(c)] = true
	}
	exclASN := make(map[int]bool, len(rot.ExcludeASN))
	for _, a := range rot.ExcludeASN {
		exclASN[a] = true
	}

	out := make([]pool.Upstream, 0, len(proxies))
	for _, u := range proxies {
		if wantProto != "" && wantProto != "any" && strings.ToLower(u.Protocol) != wantProto {
			continue
		}
		uc := strings.ToUpper(u.CountryCode)
		if wantCountry != "" && uc != wantCountry {
			continue
		}
		if uc != "" && excl[uc] {
			continue
		}
		if u.ASN != 0 && exclASN[u.ASN] {
			continue
		}
		out = append(out, u)
	}
	return out
}

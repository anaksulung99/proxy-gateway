package filter

import (
	"testing"

	"github.com/proxy-system/proxy-engine/internal/pool"
)

func TestApplyHonorsProtocolGeoAndExclusions(t *testing.T) {
	proxies := []pool.Upstream{
		{ID: 1, Protocol: "http", CountryCode: "US", ASN: 13335},
		{ID: 2, Protocol: "socks5", CountryCode: "US", ASN: 15169},
		{ID: 3, Protocol: "socks5", CountryCode: "DE", ASN: 64512},
	}

	rot := pool.Rotation{
		Protocol:         "socks5",
		GeoTarget:        "US",
		ExcludeCountries: []string{"DE"},
		ExcludeASN:       []int{15169},
	}

	got := Apply(proxies, rot, "")
	if len(got) != 0 {
		t.Fatalf("expected no candidates after ASN exclusion, got %d", len(got))
	}

	got = Apply(proxies, rot, "DE")
	if len(got) != 0 {
		t.Fatalf("expected no candidates after country exclusion override, got %d", len(got))
	}

	rot.ExcludeASN = nil
	got = Apply(proxies, rot, "")
	if len(got) != 1 || got[0].ID != 2 {
		t.Fatalf("expected socks5 US proxy #2, got %+v", got)
	}
}

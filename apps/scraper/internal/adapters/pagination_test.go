package adapters

import (
	"strings"
	"testing"

	"github.com/PuerkitoBio/goquery"
)

func TestGetFreeproxyWorldTotalPages(t *testing.T) {
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(`
		<html><body>
			<div class="pagination">
				<a href="/?page=1">1</a>
				<a href="/?page=2">2</a>
				<a href="/?page=7">7</a>
			</div>
		</body></html>
	`))
	if err != nil {
		t.Fatalf("build document: %v", err)
	}

	if got := getFreeproxyWorldTotalPages(doc); got != 7 {
		t.Fatalf("expected 7 pages, got %d", got)
	}
}

func TestGetProxyDbNextOffset(t *testing.T) {
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(`
		<html><body>
			<a href="/?offset=15">Prev</a>
			<a href="/?offset=45">Next page</a>
		</body></html>
	`))
	if err != nil {
		t.Fatalf("build document: %v", err)
	}

	next := getProxyDbNextOffset(doc)
	if next == nil {
		t.Fatal("expected next offset, got nil")
	}
	if *next != 45 {
		t.Fatalf("expected offset 45, got %d", *next)
	}
}

func TestNormalizeProxyDailyRowArray(t *testing.T) {
	row := normalizeProxyDailyRow([]any{"1.2.3.4", "8080", "HTTPS", "fast", "elite", "US"})
	entry := row.toProxyEntry()
	if entry == nil {
		t.Fatal("expected proxy entry, got nil")
	}
	if entry.Host != "1.2.3.4" || entry.Port != "8080" {
		t.Fatalf("unexpected host/port: %#v", entry)
	}
	if entry.Protocol != "https" {
		t.Fatalf("expected https protocol, got %q", entry.Protocol)
	}
	if entry.Country != "US" {
		t.Fatalf("expected US country, got %q", entry.Country)
	}
}

func TestNormalizeProxyDailyRowObject(t *testing.T) {
	row := normalizeProxyDailyRow(map[string]any{
		"ip":        "9.8.7.6",
		"port":      "1080",
		"protocol":  "SOCKS5",
		"anonymity": "anonymous",
		"country":   "DE",
	})
	entry := row.toProxyEntry()
	if entry == nil {
		t.Fatal("expected proxy entry, got nil")
	}
	if entry.Protocol != "socks5" {
		t.Fatalf("expected socks5 protocol, got %q", entry.Protocol)
	}
	if entry.Country != "DE" {
		t.Fatalf("expected DE country, got %q", entry.Country)
	}
}

func TestGetProxyNovaTotalPages(t *testing.T) {
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(`
		<html><body>
			<a href="/proxy-server-list/?p=2">2</a>
			<a href="/proxy-server-list/?p=5">5</a>
			<a href="/proxy-server-list/?p=9">9</a>
		</body></html>
	`))
	if err != nil {
		t.Fatalf("build document: %v", err)
	}

	if got := getProxyNovaTotalPages(doc); got != 9 {
		t.Fatalf("expected 9 pages, got %d", got)
	}
}

func TestParseProxyNovaRow(t *testing.T) {
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(`
		<table><tbody>
			<tr data-proxy-id="1">
				<td>198.51.100.10<script>document.write('')</script></td>
				<td>1080</td>
				<td>100 ms</td>
				<td>SOCKS</td>
				<td>uptime</td>
				<td><a href="/proxy-server-list/country-id/">Indonesia - Jakarta</a></td>
				<td><span>Elite</span></td>
			</tr>
		</tbody></table>
	`))
	if err != nil {
		t.Fatalf("build document: %v", err)
	}

	entry := parseProxyNovaRow(doc.Find("tr").First())
	if entry == nil {
		t.Fatal("expected proxynova entry, got nil")
	}
	if entry.Host != "198.51.100.10" || entry.Port != "1080" {
		t.Fatalf("unexpected host/port: %#v", entry)
	}
	if entry.Protocol != "socks5" {
		t.Fatalf("expected socks5 protocol, got %q", entry.Protocol)
	}
	if entry.Country != "ID" {
		t.Fatalf("expected ID country, got %q", entry.Country)
	}
}

func TestParseSpysOneRow(t *testing.T) {
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(`
		<table><tbody>
			<tr class="spy1xx">
				<td>103.38.106.13:1111<script>ignored()</script></td>
				<td>HTTPS (Mikrotik)</td>
				<td>NOA</td>
				<td><a href="/free-proxy-list/ID/">Indonesia</a>(Jakarta)</td>
			</tr>
		</tbody></table>
	`))
	if err != nil {
		t.Fatalf("build document: %v", err)
	}

	entry := parseSpysOneRow(doc.Find("tr").First())
	if entry == nil {
		t.Fatal("expected spys-one entry, got nil")
	}
	if entry.Host != "103.38.106.13" || entry.Port != "1111" {
		t.Fatalf("unexpected host/port: %#v", entry)
	}
	if entry.Protocol != "https" {
		t.Fatalf("expected https protocol, got %q", entry.Protocol)
	}
	if entry.Country != "ID" {
		t.Fatalf("expected ID country, got %q", entry.Country)
	}
}

func TestParseOpenproxyListRaw(t *testing.T) {
	body := `
HTTP(S) Proxy list updated at 2026-06-20 05:00:02 GMT+7
🇺🇸 104.129.194.44:10336 115ms US [ZSCALER, INC.]
🏳 180.180.218.250:8080 301ms  []
`

	entries := parseOpenproxyListRaw(body, "https")
	if len(entries) != 2 {
		t.Fatalf("expected 2 entries, got %d", len(entries))
	}
	if entries[0].Host != "104.129.194.44" || entries[0].Port != "10336" {
		t.Fatalf("unexpected first entry: %#v", entries[0])
	}
	if entries[0].Country != "US" {
		t.Fatalf("expected US country, got %q", entries[0].Country)
	}
	if entries[1].Country != "" {
		t.Fatalf("expected empty country for unknown flag, got %q", entries[1].Country)
	}
}

func TestGetHideMnTotalPages(t *testing.T) {
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(`
		<html><body>
			<a href="/en/proxy-list/#list">1</a>
			<a href="/en/proxy-list/?start=64#list">2</a>
			<a href="/en/proxy-list/?start=128#list">3</a>
			<a href="/en/proxy-list/?start=3712#list">59</a>
		</body></html>
	`))
	if err != nil {
		t.Fatalf("build document: %v", err)
	}

	if got := getHideMnTotalPages(doc); got != 59 {
		t.Fatalf("expected 59 pages, got %d", got)
	}
}

func TestParseHideMnRow(t *testing.T) {
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(`
		<table><tbody>
			<tr>
				<td>98.182.171.161</td>
				<td>4145</td>
				<td><i class="flag-icon flag-icon-us"></i> <span class="country">United States</span></td>
				<td>460 ms</td>
				<td>SOCKS4, SOCKS5</td>
				<td>High</td>
				<td>2 minutes</td>
			</tr>
		</tbody></table>
	`))
	if err != nil {
		t.Fatalf("build document: %v", err)
	}

	entry := parseHideMnRow(doc.Find("tr").First())
	if entry == nil {
		t.Fatal("expected hide.mn entry, got nil")
	}
	if entry.Host != "98.182.171.161" || entry.Port != "4145" {
		t.Fatalf("unexpected host/port: %#v", entry)
	}
	if entry.Protocol != "socks5" {
		t.Fatalf("expected socks5 protocol, got %q", entry.Protocol)
	}
	if entry.Country != "US" {
		t.Fatalf("expected US country, got %q", entry.Country)
	}
}

# Proxy Engine Phase File Status

Dokumen ini dipakai untuk menandai file placeholder vs file core aktif pada phase saat ini.
Tujuannya agar tidak terjadi duplikasi logic saat development, dan agar cleanup file kosong di akhir phase aman dilakukan.

## Status Labels

- `placeholder-selesai`: file target sudah dibuat, tetapi logic aktif saat ini hidup di file lain. Jangan tambah logic baru di file ini pada phase sekarang. Aman jadi kandidat hapus saat cleanup akhir phase setelah verifikasi final.
- `gap-core`: file target belum terintegrasi ke jalur runtime utama. Jangan dihapus dulu. Jika fitur ini mau diaktifkan, pilih dulu apakah file ini akan jadi source of truth baru atau tetap memakai file aktif yang sekarang.
- `core-aktif`: file yang saat ini benar-benar dipakai oleh runtime proxy-engine.

## Core Aktif Saat Ini

- `main.go`
- `pkg/config/config.go`
- `internal/gateway/gateway.go`
- `internal/gateway/socks5.go`
- `internal/filter/filter.go`
- `internal/session/selector.go`
- `internal/server/router.go`
- `internal/pool/repository.go`
- `internal/usage/sink.go`
- `internal/apikey/validator.go`
- `internal/quota/quota.go`
- `internal/middleware/auth.go`
- `internal/middleware/logger.go`

## Placeholder Selesai

File-file ini saat ini tidak perlu diisi karena logic aktifnya sudah berada di file lain.

| File | Status | Active Logic Lives In | Catatan |
| --- | --- | --- | --- |
| `internal/filter/asn.go` | `placeholder-selesai` | `internal/filter/filter.go` | Exclude ASN aktif di `filter.Apply()` |
| `internal/filter/geo.go` | `placeholder-selesai` | `internal/filter/filter.go` | Geo target + exclude country aktif di `filter.Apply()` |
| `internal/proxy/balance.go` | `placeholder-selesai` | `internal/gateway/gateway.go`, `internal/pool/repository.go` | Belum ada source of truth terpisah di package `proxy` |
| `internal/proxy/pool.go` | `placeholder-selesai` | `internal/pool/repository.go` | Pool/list config aktif di repository |
| `internal/proxy/selector.go` | `placeholder-selesai` | `internal/session/selector.go` | Selection aktif ada di session selector |
| `internal/proxy/tunnel_http.go` | `placeholder-selesai` | `internal/gateway/gateway.go` | HTTP forward + CONNECT handling ada di gateway |
| `internal/proxy/tunnel_socks5.go` | `placeholder-selesai` | `internal/gateway/socks5.go` | SOCKS5 inbound handling ada di gateway socks5 |
| `internal/server/http_server.go` | `placeholder-selesai` | `internal/gateway/gateway.go` | HTTP listener aktif di `Gateway.ListenAndServe()` |
| `internal/server/socks5_server.go` | `placeholder-selesai` | `internal/gateway/socks5.go` | SOCKS5 listener aktif di `NewSocks5Server()` |
| `internal/session/rotator.go` | `placeholder-selesai` | `internal/session/selector.go` | Interval rotation aktif di `Selector.Pick()` |
| `internal/session/sticky.go` | `placeholder-selesai` | `internal/session/selector.go` | Sticky session aktif di `Selector.Pick()` + Redis pinning |
| `internal/session/timer.go` | `placeholder-selesai` | `internal/session/selector.go` | TTL interval/sticky aktif di selector |

## Gap Core

File-file ini belum menjadi jalur runtime utama. Jangan ditandai selesai/hapus dulu.

| File | Status | Current Runtime Source | Catatan |
| --- | --- | --- | --- |
| `internal/config/loader.go` | `gap-core` | `pkg/config/config.go` | Runtime masih load config dari `pkg/config.Load()` |
| `internal/config/watcher.go` | `gap-core` | belum ada watcher aktif | Belum ada wiring watcher config ke runtime |
| `internal/metrics/metrics.go` | `gap-core` | `internal/server/router.go` + `promhttp.Handler()` | Endpoint `/metrics` aktif, tapi layer metrics internal belum jadi source of truth |

## Aturan Aman Selama Phase Ini

- Jangan implement logic baru di file berstatus `placeholder-selesai`.
- Jika perlu menambah fitur, edit file `core-aktif` yang memang dipakai runtime sekarang.
- Jika ingin mengaktifkan `gap-core`, tentukan dulu file mana yang akan menjadi source of truth agar tidak membelah logic menjadi dua jalur.

## Checklist Sebelum Cleanup Akhir Phase

- Pastikan file placeholder benar-benar belum di-import dari jalur runtime.
- Pastikan semua test dan build lulus setelah cleanup.
- Pastikan tidak ada developer yang sedang mulai memindahkan logic ke file placeholder tersebut.
- Hapus file placeholder hanya setelah status phase dinyatakan final.

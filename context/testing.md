# Testing workflow

| Area | Verifikasi |
|---|---|
| Semua Go module | `make go-fmt-check`, `make go-vet`, `make unit-test` |
| API Service | `cd environment-a/api-service && go test ./... && go vet ./...` |
| Vault Core | `cd environment-b/vault-core && go test ./... && go vet ./...` |
| Web Client | `cd environment-a/web-client && npm run lint && npm run build` |
| Compose | `docker compose -f docker-compose.yml config -q` |
| UI blackbox | `make blackbox-ui-headless` atau target headed |
| Security Lab | `make security-test` untuk CI/headless, `make security-demo` untuk demo browser |

Untuk fase PP, tambahkan bukti yang dapat diverifikasi untuk Concurrent Garbage Collection dan Read-Proxy: chunk tanpa referensi dapat dibersihkan tanpa merusak chunk aktif, dan retrieval tidak lagi bergantung pada akses baca langsung dari API ke storage fisik.

## Urutan verifikasi agent

Setelah perubahan fitur, jalankan pemeriksaan ringan yang relevan saja, misalnya formatter check, linter, type check, static check, atau validasi Compose. Setelah itu selalu tanyakan kepada user apakah test ingin dijalankan. Jangan menjalankan unit, integration, blackbox, atau security test tanpa persetujuan tersebut.

## Test dengan stack hidup

Blackbox dan security integration test memerlukan Compose aktif, user seed yang sesuai, dan environment flag yang dijelaskan di `tests/README.md`. Security Lab memerlukan gate API dan frontend aktif; jangan menjalankannya pada akun atau data production.

Test harus memeriksa outcome yang dapat diverifikasi, bukan hanya status HTTP atau animasi UI. Untuk perubahan UDS, uji identity/allowlist dan perilaku saat peer ditolak.

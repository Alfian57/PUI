# Test evidence

Status terakhir: **2026-08-29**. `PASS` berarti command benar-benar dijalankan;
`SKIP` atau `BLOCKED` bukan bukti fitur runtime berhasil.

## Automated checks

| Scope | Command | Result |
|---|---|---|
| API Service | `go test -race -cover ./...` | **PASS**; seluruh package test lulus, service 54.3% dan HTTP 57.2% coverage |
| Vault Core | `go test -race -cover ./...` | **PASS**; CAS 70.1%, FastCDC 85.9%, UDS 68.6% coverage |
| Shared UDS | `go test -race -cover ./...` | **PASS**; belum ada test pada module |
| Web Client lint/type check | `npm run lint` | **PASS** |
| Web Client production build | `npm run build` | **PASS** |
| Security integration | `GOWORK=off go test -tags=integration -count=1 -v ./...` | **SKIP**; API `127.0.0.1:8080` connection refused |
| Docker stack prerequisite | `docker compose ps --all` | **BLOCKED**; Docker daemon tidak dapat diakses pada environment ini |

Unit test Go dijalankan di luar sandbox agar test Unix Domain Socket dan peer
authorization dapat membuat socket secara normal. Putaran sandbox sebelumnya
gagal pada `setsockopt: operation not permitted`, sehingga tidak dihitung sebagai
failure assertion aplikasi.

## Evidence yang sudah terverifikasi

- PUI application logic, API HTTP, security service, dan client Vault lulus unit test.
- PP CAS, FastCDC, concurrent GC lifecycle, retirement grace/reactivation, UDS,
  dan peer authorization lulus unit test dengan race detector.
- Web Client lolos type check dan production build.

## Evidence yang masih diperlukan

- Security Lab terhadap stack hidup dengan `SECURITY_LAB_ENABLED=true`.
- Blackbox UI dan regresi end-to-end upload, permanent delete, retirement outbox,
  GC, Read-Proxy, restore, serta restart/crash.

Jalankan setelah stack aktif:

```bash
make compose-up
make security-test
make blackbox-ui-headless
```

Jangan mengubah status `SKIP` menjadi `PASS` tanpa output test live yang benar-benar
menjalankan skenario.

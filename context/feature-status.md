# Feature contract dan status implementasi

Dokumen ini adalah ringkasan kerja untuk AI agent. Ia mengekstrak requirement
yang paling sering dibutuhkan dari [proposal-pui.md](../proposal-pui.md); proposal
tetap menjadi authority jika ada konflik atau detail yang belum tercantum di sini.

Status: `✅` sudah ada di source, `◐` sebagian atau evidence belum lengkap, `⬜` belum tersedia.
Path di bawah adalah evidence implementasi yang harus diverifikasi sebelum mengubah kode.

## PUI baseline

| Fitur | Status | Evidence utama |
|---|---:|---|
| Auth, session, logout, profile, password reset | ✅ | `environment-a/api-service/internal/service/auth_service.go`, `environment-a/api-service/internal/transport/http/auth_handler.go`, migration `000001`–`000002` dan `000007` |
| Ownership dan metadata PostgreSQL | ✅ | `environment-a/api-service/internal/repository/file_repository.go`, `environment-a/api-service/internal/domain/file.go`, migration `000005` |
| Direktori hierarkis, breadcrumb, ownership | ✅ | `environment-a/api-service/internal/service/directory_service.go`, `environment-a/api-service/internal/repository/directory_repository.go`, migration `000003`–`000004` |
| Upload lifecycle `pending → committed/failed` | ✅ | `environment-a/api-service/internal/service/file_service.go`, `environment-a/api-service/internal/repository/file_repository.go`, `environment-b/vault-core/internal/cas/store.go` |
| CAS, FastCDC, BLAKE3, deduplikasi, manifest BadgerDB | ✅ | `environment-b/vault-core/internal/fastcdc`, `environment-b/vault-core/internal/cas/store.go`, `environment-b/vault-core/internal/cas/store_test.go` |
| Download dan rekonstruksi object | ✅ | `environment-a/api-service/internal/service/file_service.go`, `environment-b/vault-core/internal/cas/store.go`, UDS handler |
| Metadata/security preview: hash, manifest, immutable, dedup | ✅ | `environment-a/api-service/internal/transport/http/file_handler.go`, `environment-a/web-client/src/features/files`, `environment-a/web-client/src/widgets/dashboard/components/FileInspector.tsx` |
| Soft delete, Trash, restore file dan folder | ✅ | API repository/service + `environment-a/web-client/src/pages/dashboard/TrashPage.tsx` |
| Star/unstar file dan folder | ✅ | API repository/service + `environment-a/web-client/src/pages/dashboard/StarredPage.tsx` |
| Activity log, insight, report | ✅ | `environment-a/api-service/internal/service`, `environment-a/api-service/internal/transport/http`, halaman dashboard terkait |
| UDS peer allowlist dan penolakan operasi destruktif | ✅ | `environment-b/vault-core/internal/uds/server.go`, `withPeerCredentialAuth`, `writeForbiddenOperation` |
| Security Lab ransomware dan security monitoring | ✅ | `environment-a/api-service/internal/service/securitylab_service.go`, `security_monitor*`, halaman monitoring, migration `000008` |
| Crash/black-box/security evidence PUI | ◐ | Unit test API/Vault dan web lint/build sudah lulus. Security integration dan blackbox live masih pending karena stack tidak aktif. Detail command/result ada di [test-evidence.md](test-evidence.md). |

Kesimpulan PUI: alur fitur utama sudah tersedia. Status evidence tetap `◐`
sampai test dan demo yang relevan dijalankan.

## PP wajib

| Fitur | Status | Kondisi aktual dan pekerjaan tersisa |
|---|---:|---|
| Concurrent Garbage Collection | ✅ | `environment-b/vault-core/internal/cas/garbage_collector.go` melakukan authoritative manifest scan, active-upload protection, physical orphan cleanup, fail-safe malformed metadata, retry-safe deletion, scheduler, dan grace period. Manifest retired memakai `retired_at`; API mengantrekan retirement terakhir melalui outbox dan worker UDS retry. |
| Read-Proxy | ✅ | API memakai UDS endpoint `GET /internal/v1/read-proxy/objects/{manifest_id}`; Vault Core membaca manifest/chunk dan mengalirkan object. API tidak memiliki mount direktori chunk. Evidence: `environment-a/api-service/internal/vaultclient/uds.go`, `environment-b/vault-core/internal/uds/server.go`, `docker-compose.yml`. |
| Integrasi/regresi PP | ◐ | Unit test GC/retirement/UDS sudah lulus, tetapi evidence gabungan live GC + Read-Proxy + upload/commit/retrieval/restore/crash belum dijalankan karena stack tidak aktif. Detail ada di [test-evidence.md](test-evidence.md). |

## Pekerjaan tersisa

1. Jalankan evidence live untuk grace period, active upload, retry, restart/crash,
   permanent delete terakhir, dan reactivation.
2. Regresi gabungan GC + Read-Proxy + upload/commit/retrieval/restore/security scenario.
3. Pertahankan manifest tombstone dan jangan mengubahnya menjadi operasi delete/overwrite
   content fisik yang bertentangan dengan proposal.

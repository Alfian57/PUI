# Architecture

HashBox memisahkan metadata aplikasi dari konten file immutable.

Scope sistem mengikuti [proposal-pui.md](../proposal-pui.md). Deskripsi monitoring di bawah ini adalah perilaku implementasi saat ini, bukan dasar untuk memperluas scope penelitian di luar proposal.

| Komponen | Lokasi | Tanggung jawab |
|---|---|---|
| Web Client | `environment-a/web-client` | UI, session, route guard, upload/download client |
| API Service | `environment-a/api-service` | Auth, authorization, metadata, orchestration, public HTTP API |
| PostgreSQL | Compose service | User, session, directory, file metadata, activity, security events |
| Vault Core | `environment-b/vault-core` | FastCDC chunking, dedup, Badger index, content-addressable chunks |
| Shared UDS | `shared/uds` | Contract lintas service |

## Alur utama

- Browser memanggil API Service melalui HTTP.
- API Service menyimpan metadata di PostgreSQL dan memanggil Vault Core melalui Unix Domain Socket.
- Vault Core menyimpan chunk berdasarkan hash dan mengembalikan manifest immutable.
- Download mengambil object melalui endpoint Read-Proxy Vault Core di UDS; hanya Vault Core yang membaca manifest/chunk, lalu API meneruskan stream ke browser.
- Vault Core mengirim event operasi destruktif yang ditolak ke API melalui socket event terpisah. API menyimpan event dan mengirimkannya ke admin melalui SSE.

## Boundary

- Browser tidak mengakses PostgreSQL, Badger, chunk, atau UDS secara langsung.
- Vault Core tidak memiliki network publik; API adalah orchestrator yang diizinkan melalui peer UID UDS.
- Metadata deletion di API tidak mengubah content store immutable.
- API Service tidak memiliki akses filesystem ke direktori chunk; boundary retrieval adalah `GET /internal/v1/read-proxy/objects/{manifest_id}`.
- Security Lab memakai jalur aplikasi dan Vault yang sama dengan operasi nyata, tetapi file yang dibuat adalah file demo throwaway.

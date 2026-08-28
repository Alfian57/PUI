# Architecture

HashBox memisahkan metadata aplikasi dari konten file immutable.

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
- Download mengambil manifest dan object dari Vault Core; API meneruskan stream ke browser.
- Vault Core mengirim event operasi destruktif yang ditolak ke API melalui socket event terpisah. API menyimpan event dan mengirimkannya ke admin melalui SSE.

## Boundary

- Browser tidak mengakses PostgreSQL, Badger, chunk, atau UDS secara langsung.
- Vault Core tidak memiliki network publik; API adalah orchestrator yang diizinkan melalui peer UID UDS.
- Metadata deletion di API tidak mengubah content store immutable.
- Security Lab memakai jalur aplikasi dan Vault yang sama dengan operasi nyata, tetapi file yang dibuat adalah file demo throwaway.

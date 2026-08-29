# Vault Core (Environment B)

Vault Core adalah service penyimpanan immutable berbasis content-addressable storage (CAS).
Service ini berjalan di jaringan non-publik dan menerima request internal melalui Unix Domain Socket (UDS).

## Tanggung Jawab

- Menerima stream upload file dari API Service
- Melakukan chunking menggunakan FastCDC
- Menyimpan chunk deduplicated ke storage lokal
- Menyimpan metadata manifest/chunk ke BadgerDB
- Menyediakan pembacaan manifest objek untuk proses rekonstruksi oleh API Service
- Menjalankan Concurrent Garbage Collection untuk chunk lama yang tidak direferensikan
- Menolak operasi destruktif (immutable policy)

## Stack

- Go
- BadgerDB
- FastCDC
- Unix Domain Socket + HTTP handler internal

## Internal Endpoint (UDS)

Base internal path:

- `GET /internal/v1/health`
- `POST /internal/v1/uploads`
- `GET /internal/v1/manifests/{manifest_id}`
- `POST /internal/v1/manifests/{manifest_id}/retire`
- `POST /internal/v1/manifests/{manifest_id}/retain`
- `GET /internal/v1/read-proxy/objects/{manifest_id}`
- `GET /internal/v1/objects/{manifest_id}`
- `GET /internal/v1/chunks/{chunk_hash}/status`

`/internal/v1/read-proxy/objects/{manifest_id}` adalah contract retrieval PP:
Vault Core membaca manifest/chunk dan mengalirkan object melalui UDS. Endpoint
`/internal/v1/objects/{manifest_id}` dipertahankan sebagai alias kompatibilitas.
Catatan: handler memblokir method destruktif (`DELETE`, `PUT`, `PATCH`).
Saat penolakan terjadi, Vault Core juga mengirim event `VAULT_OPERATION_BLOCKED`
ke API Service melalui socket lokal `SECURITY_EVENTS_UDS_PATH`.
Lifecycle `retire`/`retain` hanya mengubah state tombstone manifest melalui UDS
peer-authorized; tidak ada endpoint untuk menghapus atau menimpa content fisik.

## Konfigurasi

Default runtime tersimpan di
[`internal/config/defaults.go`](internal/config/defaults.go). Process environment
hanya dipakai sebagai override; binary tidak memuat `.env` secara implisit.

Vault Core tidak memiliki input environment wajib untuk standalone. File
`.env.example` tetap mendokumentasikan tuning FastCDC dan strict verification;
path storage, UDS, ownership, dan service identity tetap dikelola oleh default
config atau Compose.

Default standalone memakai:

- `APP_NAME`: `HashBox PUI`
- `APP_ENV`: `environment-b`
- UDS: `../../data/uds/vault-core.sock`
- Badger: `../../data/vault/badger`
- Chunk root: `../../data/vault/chunks`
- UID/GID ownership dan peer allowlist: identitas proses saat ini
- FastCDC dan strict verification: nilai default pada file config

Compose mengoverride seluruh path ke `/var/run/pui` dan `/var/lib/pui`, serta
menggunakan UID/GID container `10002:20000` dan peer API `10001`.

## Menjalankan Service

### Opsi 1 - Dari root project (direkomendasikan)

```bash
make compose-up
```

### Opsi 2 - Run lokal vault-core saja

```bash
cd environment-b/vault-core
make run
```

Atau manual tanpa Makefile:

```bash
go run ./cmd/vault-core
```

Atau dari root:

```bash
make run-vault
```

## Workflow Make Lokal

Dari folder `environment-b/vault-core`:

```bash
make help
make doctor
make run
make build
make ci
```

Catatan:
- Makefile lokal membaca secret/config dari `environment-b/vault-core/.env`.
- Makefile memuat `.env` service secara eksplisit untuk runtime lokal.
- root `.env` dipakai untuk docker-compose, bukan untuk `make` lokal service ini.
- default config sudah menggunakan path local-safe yang writable oleh user.
- pemanggilan raw `go run` tidak memuat file `.env`; export variable secara manual atau gunakan `make run`.

## Quality Check

Dari folder service:

```bash
make ci
```

Atau manual:

```bash
go vet ./...
go test ./...
```

Dari root project:

```bash
make ci-go
```

## Operasional Data

Data vault disimpan pada direktori volume:
- `data/vault/badger`
- `data/vault/chunks`

GC berjalan di background setiap 10 menit dengan grace period 30 menit. Candidate
ditentukan dari manifest aktif dan manifest retired; retired manifest menjadi tidak
melindungi chunk setelah `retired_at` melewati grace period. Upload aktif dilindungi
selama proses berjalan. File fisik dihapus lebih dulu lalu metadata chunk dihapus;
kegagalan pada salah satu tahap aman untuk diulang pada sweep berikutnya. Jika scan
metadata atau retirement timestamp tidak valid, GC berhenti tanpa menghapus candidate.

Panduan backup/restore tersedia di [../../deploy/backup.md](../../deploy/backup.md).

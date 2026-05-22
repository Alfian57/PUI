# Vault Core (Environment B)

Vault Core adalah service penyimpanan immutable berbasis content-addressable storage (CAS).
Service ini berjalan di jaringan non-publik dan menerima request internal melalui Unix Domain Socket (UDS).

## Tanggung Jawab

- Menerima stream upload file dari API Service
- Melakukan chunking menggunakan FastCDC
- Menyimpan chunk deduplicated ke storage lokal
- Menyimpan metadata manifest/chunk ke BadgerDB
- Menyediakan pembacaan manifest objek untuk proses rekonstruksi oleh API Service
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
- `GET /internal/v1/objects/{manifest_id}`
- `GET /internal/v1/chunks/{chunk_hash}/status`

Catatan: handler memblokir method destruktif (`DELETE`, `PUT`, `PATCH`).

## Konfigurasi Environment

Contoh env: [.env.example](.env.example)

| Variable | Default/Contoh | Keterangan |
|---|---|---|
| APP_ENV | environment-b | nama environment |
| UDS_PATH | ../../shared/uds/vault-core.sock | path unix socket lokal |
| BADGER_PATH | ../../data/vault/badger | lokasi data badger lokal |
| CHUNK_ROOT | ../../data/vault/chunks | root penyimpanan chunk lokal |
| FASTCDC_MIN_CHUNK_SIZE | 65536 | ukuran minimum chunk |
| FASTCDC_AVG_CHUNK_SIZE | 262144 | ukuran target rata-rata chunk |
| FASTCDC_MAX_CHUNK_SIZE | 1048576 | ukuran maksimum chunk |

Pada docker-compose root juga ada variabel tambahan ownership socket:
- `UDS_OWNER_UID`
- `UDS_OWNER_GID`
- `UDS_ALLOWED_UIDS`

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
- runtime `vault-core` lokal juga akan load `.env` service secara otomatis.
- root `.env` dipakai untuk docker-compose, bukan untuk `make` lokal service ini.
- gunakan `.env.example` sebagai template local-safe path yang writable oleh user.

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

Panduan backup/restore tersedia di [../../deploy/backup.md](../../deploy/backup.md).

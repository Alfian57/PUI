# Vault Core (Environment B)

Vault Core adalah service penyimpanan immutable berbasis content-addressable storage (CAS).
Service ini berjalan di jaringan non-publik dan menerima request internal melalui Unix Domain Socket (UDS).

## Tanggung Jawab

- Menerima stream upload file dari API Service
- Melakukan chunking menggunakan FastCDC
- Menyimpan chunk deduplicated ke storage lokal
- Menyimpan metadata manifest/chunk ke BadgerDB
- Menyediakan proses download object berdasarkan manifest ID
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
- `GET /internal/v1/chunks/{chunk_hash}/status`
- `GET /internal/v1/objects/{manifest_id}/download`

Catatan: handler memblokir method destruktif (`DELETE`, `PUT`, `PATCH`).

## Konfigurasi Environment

Contoh env: [.env.example](.env.example)

| Variable | Default/Contoh | Keterangan |
|---|---|---|
| APP_ENV | environment-b | nama environment |
| UDS_PATH | /var/run/pui/uds/vault-core.sock | path unix socket |
| BADGER_PATH | /var/lib/pui/badger | lokasi data badger |
| CHUNK_ROOT | /var/lib/pui/chunks | root penyimpanan chunk |
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
go run ./cmd/vault-core
```

Atau dari root:

```bash
make run-vault
```

## Quality Check

Dari root project:

```bash
make ci-go
```

Atau manual dari folder service:

```bash
go vet ./...
go test ./...
```

## Operasional Data

Data vault disimpan pada direktori volume:
- `data/vault/badger`
- `data/vault/chunks`

Panduan backup/restore tersedia di [../../deploy/backup.md](../../deploy/backup.md).

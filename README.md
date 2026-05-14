# HashBox

HashBox adalah platform penyimpanan file immutable dengan arsitektur terpisah:
- environment-a untuk antarmuka publik (web + API metadata)
- environment-b untuk penyimpanan konten immutable (vault-core)
- komunikasi antar service memakai Unix Domain Socket (UDS)

## Komponen Utama

| Komponen | Lokasi | Fungsi |
|---|---|---|
| Web Client | [environment-a/web-client/README.md](environment-a/web-client/README.md) | UI login, eksplorasi folder, upload/download, soft delete metadata |
| API Service | [environment-a/api-service/README.md](environment-a/api-service/README.md) | API publik (auth, directory, file metadata), orchestrator ke vault-core |
| Vault Core | [environment-b/vault-core/README.md](environment-b/vault-core/README.md) | Content-addressable storage immutable via UDS |
| Shared UDS Contract | [shared/uds](shared/uds) | Tipe/kontrak data lintas service |

## Arsitektur Singkat

1. User berinteraksi melalui web client.
2. Web client memanggil API Service di environment-a.
3. API Service menyimpan metadata ke PostgreSQL.
4. Untuk proses konten file, API Service memanggil Vault Core lewat UDS.
5. Vault Core melakukan chunking dedup (FastCDC), menyimpan chunk, dan mengembalikan manifest immutable.
6. Untuk proses unduh, API Service juga meminta object ke Vault Core lewat UDS; Vault Core merekonstruksi object dari chunk immutable lalu mengalirkannya kembali ke API Service.

## Prasyarat

- Docker + Docker Compose
- Go (untuk development lokal): minimal 1.25
- Node.js (untuk web lokal): minimal 20
- GNU Make

## Quick Start (Docker)

1. Salin env root:

```bash
cp .env.example .env
```

2. Jalankan semua service:

```bash
make compose-up
```

3. Seed user development (opsional):

```bash
docker exec -i pui-postgres psql -U pui -d pui < environment-a/api-service/db/seeds/dev_admin.sql
```

4. Akses aplikasi:
- Web UI: http://localhost:5173
- API base: http://localhost:8080/api/v1
- Swagger: http://localhost:8080/api/v1/swagger/index.html

5. Stop stack:

```bash
make compose-down
```

## Command Harian

Lihat semua command:

```bash
make help
```

Command penting:

```bash
make deps
make ci
make ci-go
make ci-web
make ci-compose
make compose-logs
```

## CI/CD GitHub Actions

Workflow: [.github/workflows/ci-cd.yml](.github/workflows/ci-cd.yml)

- CI (PR/push):
  - gofmt check, go vet, go test untuk modul Go
  - build web client
  - validasi docker compose config
- CD (push ke main atau tag v*):
  - build dan push image ke GHCR:
    - pui-api-service
    - pui-vault-core
    - pui-web-client

## Struktur Repository

```text
.
├── environment-a/
│   ├── api-service/
│   └── web-client/
├── environment-b/
│   └── vault-core/
├── shared/
│   └── uds/
├── docker-compose.yml
├── Makefile
└── .github/workflows/ci-cd.yml
```

## Operasional dan Backup

- Dokumentasi Swagger API tersedia di [environment-a/api-service/docs/README.md](environment-a/api-service/docs/README.md).

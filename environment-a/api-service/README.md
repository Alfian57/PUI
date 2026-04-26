# API Service (Environment A)

API Service adalah backend publik untuk autentikasi, manajemen direktori, metadata file, dan jembatan ke Vault Core melalui UDS.

## Stack

- Go + Gin
- GORM + PostgreSQL
- Viper + dotenv
- golang-migrate
- Swagger (Swaggo)

## Endpoint Publik

Base path: `/api/v1`

### Public

- `GET /health`
- `GET /status`
- `GET /swagger/*any`
- `POST /auth/login`

### Butuh `Authorization: Bearer <access_token>`

- `POST /auth/logout`
- `GET /auth/me`
- `GET /activity-logs`
- `POST /directories`
- `GET /directories/tree`
- `GET /directories/:id/files`
- `GET /directories/:id/breadcrumb`
- `POST /files`
- `GET /files/search`
- `GET /files/:id/download`
- `GET /files/:id`
- `DELETE /files/:id`

## Konfigurasi Environment

Contoh env: [.env.example](.env.example)

| Variable | Default/Contoh | Keterangan |
|---|---|---|
| APP_ENV | environment-a | nama environment |
| HTTP_ADDR | :8080 | bind address API |
| ALLOWED_ORIGIN | http://localhost:5173 | CORS origin |
| DATABASE_URL | postgres://...@localhost:5432/... | koneksi PostgreSQL lokal |
| VAULT_UDS_PATH | ../../shared/uds/vault-core.sock | path socket lokal ke vault-core |
| MIGRATIONS_PATH | db/migrations | lokasi file migration |
| MAX_UPLOAD_SIZE_BYTES | 536870912 | batas upload |
| RATE_LIMIT_PER_MINUTE | 120 | rate limit request |
| SESSION_TTL_MINUTES | 1440 | masa aktif bearer access token untuk sesi login |

## Menjalankan Service

### Opsi 1 - Dari root project (direkomendasikan)

```bash
make compose-up
```

### Opsi 2 - Run lokal API saja

Pastikan PostgreSQL dan Vault Core sudah tersedia, lalu:

```bash
cd environment-a/api-service
make run
```

Atau manual tanpa Makefile:

```bash
go run ./cmd/api-service
```

Atau dari root:

```bash
make run-api
```

## Workflow Make Lokal

Dari folder `environment-a/api-service`:

```bash
make help
make doctor
make run
make ci
make swagger
make migrate-version
make migrate-up
make migrate-down
make migrate-fresh
```

Catatan:
- Makefile lokal membaca secret/config dari `environment-a/api-service/.env`.
- gunakan `.env.example` sebagai template local run; default-nya sudah memakai host DB `localhost` dan path socket repo-shared.
- `migrate-down` rollback 1 step.
- `migrate-fresh` bersifat destruktif dan hanya aman untuk local/dev database.
- startup service tetap menjalankan migrate-up otomatis.
- root `.env` dipakai untuk docker-compose, bukan untuk `make` lokal service ini.

## Migration

Migration berada di [db/migrations](db/migrations).

Pada startup, API akan menjalankan migration otomatis berdasarkan `MIGRATIONS_PATH`.

Untuk kontrol manual dari folder service:

```bash
make migrate-version
make migrate-up
make migrate-down
make migrate-down-all
make migrate-fresh
```

Seed dev admin tersedia di `db/seeds/dev_admin.sql` dan bisa langsung dijalankan lewat:

```bash
make seed-dev-admin
```

Target ini memakai `DATABASE_URL` dari `.env` service dan membutuhkan `psql` terpasang.

## Swagger

- UI: `GET /api/v1/swagger/index.html`
- JSON: `GET /api/v1/swagger/doc.json`

Generate ulang docs:

```bash
make swagger
```

Atau manual:

```bash
go run github.com/swaggo/swag/cmd/swag@v1.16.6 init -g cmd/api-service/main.go -o docs --parseInternal
```

Lihat juga [docs/README.md](docs/README.md).

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

Lihat juga [docs/README.md](docs/README.md).

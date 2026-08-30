# API Service (Environment A)

API Service adalah backend publik untuk autentikasi, manajemen direktori, metadata file, dan jembatan ke Vault Core melalui UDS. Untuk download, API hanya meneruskan stream dari Read-Proxy Vault Core dan tidak memiliki mount direktori chunk. Permanent delete memakai outbox retirement manifest dengan worker retry agar GC Vault dapat mereclaim content secara aman setelah grace period.

## Stack

- Go + Gin
- GORM + PostgreSQL
- Viper + process environment
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
- `GET /directories/:id/detail?scope=starred|trash`
- `POST /files`
- `GET /files/search`
- `GET /files/:id/download`
- `GET /files/:id`
- `DELETE /files/:id`

### Monitoring keamanan (admin)

- `GET /admin/security-monitor/summary?range=24h|7d|30d`
- `GET /admin/security-monitor/events`
- `GET /admin/security-monitor/stream` (SSE)

## Konfigurasi

Default runtime tersimpan di
[`internal/config/defaults.go`](internal/config/defaults.go). Process environment
hanya dipakai sebagai override; tidak ada pencarian `.env` implisit oleh binary.

`.env.example` memuat database dan setting penting yang dapat berbeda antar
local, staging, dan production. Path internal tetap tidak ditulis di template.
Makefile memuat `environment-a/api-service/.env` secara eksplisit sebelum
menjalankan service atau migration.

Format `DATABASE_URL` adalah:

```text
postgres://USERNAME:PASSWORD@HOST:PORT/DATABASE?sslmode=disable
```

Pada template standalone, `USERNAME` adalah `pui`, `PASSWORD` adalah
`change_me`, `HOST` adalah `localhost`, `PORT` adalah `5432`, dan `DATABASE`
adalah `pui`. Untuk Compose, gunakan host `postgres` seperti pada root template.
Karakter khusus pada username/password harus di-URL-encode, misalnya `@`
menjadi `%40`.

Default penting untuk standalone:

- `APP_NAME`: `HashBox PUI`
- `APP_ENV`: `environment-a`
- `HTTP_ADDR`: `:8080`
- `ALLOWED_ORIGIN` dan `PUBLIC_WEB_URL`: `http://localhost:5173`
- `VAULT_UDS_PATH`: `../../data/uds/vault-core.sock`
- `SECURITY_EVENTS_UDS_PATH`: `../../data/uds/security-events.sock`
- `MIGRATIONS_PATH`: `db/migrations`
- limit upload, rate limit, session, SMTP, dan Security Lab memakai default di file config.

Compose mengoverride path UDS dengan path container `/var/run/pui/uds/...` dan
memasukkan database URL dari root `.env`. Template root dan template standalone
menunjukkan override penting seperti `ALLOWED_ORIGIN`, `TRUSTED_PROXIES`,
`SECURITY_LAB_ENABLED`, `PUBLIC_WEB_URL`, dan `SMTP_*` agar developer tidak perlu
menebak nama variable-nya.

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
- gunakan `.env.example` sebagai template database dan setting penting; path internal memakai default config.
- `migrate-down` rollback 1 step.
- `migrate-fresh` bersifat destruktif dan hanya aman untuk local/dev database.
- startup service tetap menjalankan migrate-up otomatis.
- root `.env` dipakai untuk docker-compose, bukan untuk `make` lokal service ini.
- pemanggilan raw `go run` tidak memuat file `.env`; export variable secara manual atau gunakan `make run`.

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

Seeder development memiliki dua mode:

- `seed` / `seed-default`: dua akun bootstrap saja.
- `seed-full`: fixture sintetis lengkap untuk seluruh tabel metadata, minimal
  1.000 baris per tabel, lalu mengunggah 500 dummy files nyata ke Vault Core.
- `seed-full-metadata`: hanya tahap PostgreSQL, tanpa membutuhkan API/Vault.
- `seed-full-content`: hanya upload dummy files ke API/Vault yang sudah berjalan.

Jalankan dari folder API service:

```bash
make seed
make seed-full
```

Target metadata memakai `DATABASE_URL` dari `.env` service dan membutuhkan
`psql` terpasang. Target full juga membutuhkan API Service, Vault Core, `curl`,
dan `jq`. Gunakan `HASHBOX_API_BASE_URL` jika API tidak berada di alamat default.
`dev_admin.sql` tetap tersedia sebagai nama kompatibilitas lama;
seed default canonical berada di `db/seeds/default.sql`. Seeder full bersifat
idempotent dan hanya ditujukan untuk database lokal/demo. Password akun fixture
sintetis full adalah `seed-password`; dua akun bootstrap tetap memakai
`password`. File dummy dibuat sementara oleh `scripts/seed_full_content.sh`,
kemudian diunggah ke Vault Core sehingga manifest-nya nyata.

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

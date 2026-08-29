# HashBox

HashBox adalah platform penyimpanan file immutable dengan arsitektur terpisah:
- environment-a untuk antarmuka publik (web + API metadata)
- environment-b untuk penyimpanan konten immutable (vault-core)
- komunikasi antar service memakai Unix Domain Socket (UDS)

Dokumen acuan mutlak scope dan kebutuhan sistem: [proposal-pui.md](proposal-pui.md).

Status proyek: PUI telah selesai dan lulus; fase aktif sekarang adalah Proyek Professional (PP). Prioritas PP mengikuti roadmap proposal: Concurrent Garbage Collection dan Read-Proxy.

Business flow, technical flow, dan acceptance criteria PP tersedia di folder [context](context/), dengan urutan implementasi GC lalu Read-Proxy.

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
6. Untuk proses unduh, API Service meminta Read-Proxy Vault Core lewat UDS; Vault Core merekonstruksi object dari chunk immutable lalu mengalirkannya kembali ke API Service. API tidak memiliki akses filesystem ke direktori chunk.

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

Validasi template dan konfigurasi Compose:

```bash
make env-check
make compose-config
```

2. Jalankan semua service:

```bash
make compose-up
```

3. Seed user development (opsional). Mode default hanya membuat dua akun:

```bash
make compose-seed
```

Untuk fixture lokal lengkap pada database Compose, gunakan `make
compose-seed-full`. Untuk database standalone, jalankan `make seed` atau `make
seed-full` dari folder `environment-a/api-service` dengan `DATABASE_URL` pada
`.env` service. Seeder full membuat data sintetis untuk semua tabel metadata
dan mengunggah 500 dummy files nyata ke Vault Core. Password akun sintetis
adalah `seed-password`, sedangkan dua akun bootstrap tetap memakai `password`.

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

## Sumber Konfigurasi

Nama aplikasi adalah `HashBox PUI` dan nama machine-readable Docker Compose
adalah `hashbox-pui`.

Default konfigurasi disimpan dekat dengan service:

- API Service: `environment-a/api-service/internal/config/defaults.go`
- Vault Core: `environment-b/vault-core/internal/config/defaults.go`
- Web Client: `environment-a/web-client/src/shared/config/defaults.ts`

HashBox memiliki dua execution mode yang sengaja dipisahkan:

- Root `.env` memuat konfigurasi database dan setting deployment penting seperti
  port, URL, CORS/proxy, SMTP, limit, dan feature flag.
- File `.env` di masing-masing app digunakan untuk override saat service
  dijalankan standalone dari direktorinya masing-masing; template app tetap
  mendokumentasikan setting penting yang tersedia.
- `.env.example` tidak memuat default internal seperti `APP_ENV`, path UDS,
  migration, storage, atau ownership socket.

Makefile service memuat file lokal secara eksplisit. API Service dan Vault Core
tidak lagi mencari `.env` berdasarkan current working directory. Jangan menyalin
file Compose ke app-local karena path database, socket, storage, dan UID
container memang berbeda antar mode. Compose menghardcode path container yang
tidak dapat dipakai langsung saat standalone.

### Format `DATABASE_URL`

Format koneksi PostgreSQL yang digunakan API adalah:

```text
postgres://USERNAME:PASSWORD@HOST:PORT/DATABASE?sslmode=disable
```

Pada Compose, contoh di `.env.example` berarti:

| Bagian | Nilai contoh | Keterangan |
|---|---|---|
| `USERNAME` | `pui` | sama dengan `POSTGRES_USER` |
| `PASSWORD` | `change_me` | sama dengan `POSTGRES_PASSWORD`; gunakan URL encoding untuk karakter khusus |
| `HOST` | `postgres` | nama service PostgreSQL di Compose |
| `PORT` | `5432` | port PostgreSQL |
| `DATABASE` | `pui` | sama dengan `POSTGRES_DB` |
| `sslmode` | `disable` | sesuai konfigurasi local Compose |

Untuk standalone, gunakan `HOST=localhost` dan database URL pada template API.
Untuk staging/production, ganti host, credential, database, dan opsi TLS sesuai
infrastruktur environment tersebut.

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
├── context/
├── AGENTS.md
├── proposal-pui.md
├── docker-compose.dev.yml
├── Makefile
└── .github/workflows/ci-cd.yml
```

## Operasional dan Backup

- Dokumentasi Swagger API tersedia di [environment-a/api-service/docs/README.md](environment-a/api-service/docs/README.md).

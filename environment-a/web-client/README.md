# HashBox Web Client (Environment A)

Web Client adalah antarmuka React untuk mengelola file immutable pada HashBox.

## Fitur Utama

- Login/logout session
- Monitoring status health API
- Eksplorasi tree direktori
- Upload file dengan progress
- Daftar file per direktori
- Download file
- Soft delete file metadata
- Panel detail file + dedup insight upload terakhir

## Stack

- React + TypeScript + Vite
- Tailwind CSS
- Axios
- TanStack React Query

## Konfigurasi Environment

Default runtime tersimpan di [`src/shared/config/defaults.ts`](src/shared/config/defaults.ts).
Web Client tidak memiliki input environment wajib, tetapi `.env.example` tetap
disediakan sebagai katalog override penting.

Override opsional dapat ditambahkan ke `.env` lokal:

| Variable | Default | Keterangan |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:8080` | base URL API |
| `VITE_SECURITY_LAB_ENABLED` | `false` | menampilkan menu Security Lab; enforcement tetap di API |

## Menjalankan Aplikasi

### Opsi 1 - Dari root project (full stack)

```bash
make compose-up
```

### Opsi 2 - Development web saja

```bash
cd environment-a/web-client
npm ci
npm run dev
```

Vite memuat `environment-a/web-client/.env` untuk mode standalone. Saat
menjalankan Compose, default config dipakai dan hanya override opsional yang
diteruskan oleh Compose.

Atau dari root:

```bash
make web-install
make web-dev
```

Build production:

```bash
make web-build
```

## Struktur Frontend

```text
src/
├── app/            # app shell dan provider
├── features/       # domain feature (auth, directories, files, health)
├── shared/         # util, api client, config, shared ui
└── widgets/        # komposisi layar/dashboard
```

## Integrasi API

Web client memakai endpoint API Service berikut:

- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/logout`
- `GET /api/v1/health`
- `GET /api/v1/directories/tree`
- `POST /api/v1/directories`
- `GET /api/v1/directories/:id/files`
- `POST /api/v1/files`
- `GET /api/v1/files/:id`
- `GET /api/v1/files/:id/download`
- `DELETE /api/v1/files/:id`

## Quality Check

Dari root project:

```bash
make ci-web
```

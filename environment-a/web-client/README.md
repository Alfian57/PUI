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
├── app/            # app shell, provider, router, dan route guards
├── components/     # komponen reusable lintas feature
│   ├── ui/         # primitive UI: button, input, select, dan sejenisnya
│   └── shared/     # komponen presentasional yang dipakai bersama
├── pages/          # route entry; setiap page menggunakan file page.tsx
│   ├── auth/       # route auth dan private api/context/hook/style auth
│   └── dashboard/  # route dashboard dan modul private lintas dashboard
├── shared/         # api client, config, context, hooks, lib, dan type domain
└── widgets/        # komposisi layar/dashboard dan private widget component
```

Penamaan component menggunakan PascalCase. Folder menggunakan lowercase, sedangkan
component atau helper yang hanya dipakai oleh satu page/widget ditempatkan di folder
`_components`, `_hooks`, `_api`, `_types`, atau `_lib` yang sejajar dengan pemiliknya.
Modul yang dipakai beberapa page ditempatkan pada folder private parent terdekat, seperti
`pages/dashboard/_api` dan `pages/auth/_hooks`. Import dilakukan langsung dari file
sumber tanpa barrel export.

Seluruh tujuan navigasi aplikasi dipusatkan di
[`src/app/routes.ts`](src/app/routes.ts). Gunakan `ROUTES` untuk full path pada
redirect atau navigasi dan `ROUTE_SEGMENTS` untuk path relatif pada konfigurasi
nested route.

Filter, tab, dan pencarian lokal disimpan melalui query parameter menggunakan
`src/shared/hooks/useQueryParamState.ts`. Setiap kontrol memakai key bernamespace
dengan format bracket, seperti `security[source]`, agar perubahan beberapa
kontrol pada halaman yang sama tetap aman. Global search di topbar merupakan
pengecualian dan tetap menggunakan debounce 350 ms tanpa menulis query parameter.

Pagination memakai `src/shared/hooks/usePagination.ts`, sehingga nomor halaman
ditulis ke query parameter seperti `security[page]`. List panjang yang mendukung
infinite scroll memakai `src/shared/hooks/useInfiniteScroll.ts`; riwayat aktivitas
menggunakan `activity[page]`, Berkas Saya menggunakan `files[page]`, dan daftar
Sampah/Berbintang menggunakan `trash[page]` atau `starred[page]` untuk melacak
halaman terakhir yang sudah dimuat. Endpoint API terkait melakukan pagination di
database dan mengembalikan total koleksi agar frontend tidak mengunduh seluruh data.

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

Pengujian blackbox UI tersedia di `tests/blackbox/playwright`. Dari folder web
client, install dependency test terlebih dahulu lalu jalankan:

```bash
cd ../../tests/blackbox/playwright
npm ci
npx playwright install chromium
cd ../../../environment-a/web-client
npm test
```

Script `npm test` mendelegasikan eksekusi ke suite Playwright tersebut. Untuk
menjalankan Playwright secara langsung, gunakan working directory
`tests/blackbox/playwright` agar `playwright.config.ts` dan seluruh test dapat
ditemukan. Blackbox test memerlukan stack HashBox yang aktif.

# Development workflow

PUI telah selesai dan lulus. Pengembangan aktif sekarang berada pada fase Proyek Professional (PP); prioritas dan urutannya dijelaskan di [pp-roadmap.md](pp-roadmap.md), yaitu Concurrent Garbage Collection lalu Read-Proxy.

## Struktur kerja

- Perintah lintas project dijalankan dari root dengan `Makefile`.
- API dan Vault adalah Go module terpisah.
- Web Client menggunakan React, TypeScript, Vite, dan Tailwind.
- Default konfigurasi disimpan di file config masing-masing app; lihat `internal/config/defaults.go` untuk service Go dan `src/shared/config/defaults.ts` untuk Web Client.
- Root `.env` berisi database serta setting deployment penting seperti port, URL, CORS/proxy, SMTP, dan feature flag.
- `.env.example` tiap app mendokumentasikan setting penting untuk override; path internal dan identity service tetap berada di default config.
- Jangan mencampur file Compose dan app-local karena endpoint database, path socket, path storage, dan UID dapat berbeda.
- API Service dan Vault Core hanya membaca process environment; Makefile adalah loader eksplisit untuk `.env` standalone.
- Compose menghardcode path container dan ownership socket yang berbeda dari default standalone.

## Command utama

```bash
make deps
make ci
make compose-up
make compose-down
make run-api
make run-vault
make env-check
```

Command per area tersedia di `environment-a/api-service/Makefile` dan `environment-b/vault-core/Makefile`.

## Aturan perubahan

- Untuk fitur PP, mulai dari [business-flow.md](business-flow.md), [technical-flow.md](technical-flow.md), dan milestone pada [pp-roadmap.md](pp-roadmap.md).
- Migration baru dibuat berpasangan di `environment-a/api-service/db/migrations`.
- Setelah anotasi endpoint berubah, regenerasi Swagger memakai workflow API yang tersedia.
- Perubahan event atau UDS harus memperbarui producer, consumer, dan test terkait.
- Pengembangan PP harus memprioritaskan roadmap proposal dan tidak boleh mengorbankan immutability atau boundary storage demi kemudahan implementasi.
- Pertahankan API response dan naming yang sudah dipakai frontend; ubah contract hanya dengan alasan yang jelas.
- Setelah implementasi, gunakan hanya pemeriksaan ringan seperti `gofmt` check, TypeScript check, linter, static check, atau validasi konfigurasi. Tanyakan kepada user sebelum menjalankan testing.

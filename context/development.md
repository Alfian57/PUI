# Development workflow

PUI telah selesai dan lulus. Pengembangan aktif sekarang berada pada fase Proyek Professional (PP); prioritasnya adalah roadmap proposal, yaitu Concurrent Garbage Collection dan Read-Proxy.

## Struktur kerja

- Perintah lintas project dijalankan dari root dengan `Makefile`.
- API dan Vault adalah Go module terpisah.
- Web Client menggunakan React, TypeScript, Vite, dan Tailwind.
- Konfigurasi lokal berasal dari `.env`; gunakan `.env.example` sebagai template dan jangan commit secret.

## Command utama

```bash
make deps
make ci
make compose-up
make compose-down
make run-api
make run-vault
```

Command per area tersedia di `environment-a/api-service/Makefile` dan `environment-b/vault-core/Makefile`.

## Aturan perubahan

- Migration baru dibuat berpasangan di `environment-a/api-service/db/migrations`.
- Setelah anotasi endpoint berubah, regenerasi Swagger memakai workflow API yang tersedia.
- Perubahan event atau UDS harus memperbarui producer, consumer, dan test terkait.
- Pengembangan PP harus memprioritaskan roadmap proposal dan tidak boleh mengorbankan immutability atau boundary storage demi kemudahan implementasi.
- Pertahankan API response dan naming yang sudah dipakai frontend; ubah contract hanya dengan alasan yang jelas.
- Gunakan `gofmt`, TypeScript check, dan build sebagai bagian dari verifikasi.

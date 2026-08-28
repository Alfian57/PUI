# HashBox agent instructions

Instruksi canonical untuk semua AI agent di repository ini. File `AGENTS.md` yang lebih dekat dengan file yang sedang dikerjakan menambahkan aturan lokal; jangan mengulang aturan root.

## Cara membaca context

1. Baca file ini.
2. Baca [context/README.md](context/README.md).
3. Baca hanya dokumen context yang relevan dengan task.
4. Verifikasi detail yang berubah-ubah ke source code, konfigurasi, dan test.

Kode dan konfigurasi adalah operational truth. Context menjelaskan struktur dan intent; jika berbeda, periksa kode/config lalu perbarui context yang terdampak.

## Workflow kerja

- Mulai dengan discovery memakai `rg`, `rg --files`, dan inspeksi entrypoint/config yang relevan.
- Untuk task non-trivial, tulis rencana singkat sebelum mengubah file.
- Pertahankan boundary antar environment dan lakukan perubahan sekecil mungkin.
- Jalankan test/build yang proporsional terhadap area yang berubah.
- Handoff harus menyebutkan hasil, file penting, command verifikasi, dan risiko atau blocker.

## Guardrails

- Jangan menampilkan atau menambahkan secret, token, password, credential, atau data pengguna nyata.
- Jangan menjalankan command destruktif atau mengubah data eksternal tanpa otorisasi eksplisit.
- Jangan commit atau push otomatis; lakukan hanya jika diminta.
- Jangan memasukkan request body, header Authorization, atau konten sensitif ke log dan security event.
- Perubahan migration harus memiliki pasangan up/down. Perubahan kontrak UDS harus diperiksa pada semua consumer.
- Pertahankan pola dan dependency yang sudah digunakan project sebelum memperkenalkan abstraction baru.

## Definition of done

Perubahan dianggap selesai jika implementasi, test yang relevan, dokumentasi yang terdampak, dan status worktree telah diperiksa. Jangan menyamarkan test yang tidak dapat dijalankan; laporkan prasyaratnya.

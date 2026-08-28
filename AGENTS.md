# HashBox agent instructions

Instruksi canonical untuk semua AI agent di repository ini. File `AGENTS.md` yang lebih dekat dengan file yang sedang dikerjakan menambahkan aturan lokal; jangan mengulang aturan root.

## Otoritas proposal

[proposal-pui.md](proposal-pui.md) adalah acuan mutlak untuk scope, kebutuhan, arsitektur, dan arah pengembangan sistem. Jika source code, konfigurasi, atau dokumentasi bertentangan dengan proposal, proposal yang menang. Jangan memperluas atau mengubah scope berdasarkan asumsi dari implementasi saat ini; tandai konflik dan selaraskan perubahan dengan proposal.

PUI telah selesai dan lulus. Fase aktif repository sekarang adalah Proyek Professional (PP); baca [context/project-status.md](context/project-status.md) sebelum merencanakan fitur baru. Roadmap PP dari proposal, terutama Concurrent Garbage Collection dan Read-Proxy, harus diprioritaskan.

## Cara membaca context

1. Baca file ini.
2. Baca [proposal-pui.md](proposal-pui.md) untuk intent dan batasan sistem.
3. Baca [context/README.md](context/README.md).
4. Baca [context/project-status.md](context/project-status.md) jika task berkaitan dengan roadmap atau fitur baru.
5. Untuk fitur, baca business flow, technical flow, dan milestone PP yang relevan.
6. Baca hanya dokumen context lain yang relevan dengan task.
7. Verifikasi detail implementasi ke source code, konfigurasi, dan test.

Kode dan konfigurasi menunjukkan perilaku yang sedang berjalan, bukan authority atas scope. Context menjelaskan struktur dan intent; jika berbeda dari proposal, proposal harus diprioritaskan dan konflik perlu dilaporkan.

## Workflow kerja

- Mulai dengan discovery memakai `rg`, `rg --files`, dan inspeksi entrypoint/config yang relevan.
- Untuk task non-trivial, tulis rencana singkat sebelum mengubah file.
- Pertahankan boundary antar environment dan lakukan perubahan sekecil mungkin.
- Setelah implementasi fitur, jalankan hanya pemeriksaan ringan yang relevan: formatter check, linter, type check, static check, atau validasi konfigurasi. Jangan menjalankan test otomatis pada tahap ini.
- Setelah pemeriksaan ringan selesai, selalu tanyakan kepada user apakah test ingin dijalankan. Jangan menjalankan unit, integration, blackbox, atau security test sebelum user menyetujui.
- Handoff harus menyebutkan hasil, file penting, command verifikasi, dan risiko atau blocker.

## Guardrails

- Jangan menampilkan atau menambahkan secret, token, password, credential, atau data pengguna nyata.
- Jangan menjalankan command destruktif atau mengubah data eksternal tanpa otorisasi eksplisit.
- Jangan commit atau push otomatis; lakukan hanya jika diminta.
- Jangan memasukkan request body, header Authorization, atau konten sensitif ke log dan security event.
- Perubahan migration harus memiliki pasangan up/down. Perubahan kontrak UDS harus diperiksa pada semua consumer.
- Pertahankan pola dan dependency yang sudah digunakan project sebelum memperkenalkan abstraction baru.

## Definition of done

Perubahan dianggap selesai jika implementasi, pemeriksaan ringan, dokumentasi yang terdampak, dan status worktree telah diperiksa. Test dilakukan setelah konfirmasi user. Jangan menyamarkan pemeriksaan atau test yang tidak dapat dijalankan; laporkan prasyaratnya.

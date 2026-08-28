# Project status

## Fase aktif: Proyek Professional (PP)

PUI (Project Utama Informatika) telah selesai dan lulus. Repository ini sekarang memasuki fase PP.

Pengembangan PP wajib mengikuti roadmap pengembangan pada [proposal-pui.md](../proposal-pui.md), terutama:

- **Concurrent Garbage Collection**: membersihkan chunk fisik yang tidak lagi memiliki referensi aktif tanpa mengganggu proses baca dan tulis.
- **Read-Proxy**: menggantikan akses baca langsung ke direktori penyimpanan fisik agar rekonstruksi dan pengunduhan dikendalikan melalui Vault Core.

Urutan kerja awal sudah melewati contract/baseline, Concurrent Garbage Collection, dan Read-Proxy. Implementasi lifecycle retirement manifest sekarang sudah ditambahkan; prioritas berikutnya adalah integrasi dan regresi PP.

Detail milestone dan acceptance criteria ada di [pp-roadmap.md](pp-roadmap.md). Business flow ada di [business-flow.md](business-flow.md), sedangkan sequence dan boundary teknis ada di [technical-flow.md](technical-flow.md).

## Hasil audit fitur terakhir

Ringkasan status source dan gap ada di [feature-status.md](feature-status.md).
Hasil test terakhir ada di [test-evidence.md](test-evidence.md). PUI feature utama
tersedia; evidence unit sudah diverifikasi. Read-Proxy
sudah terpasang melalui UDS. Concurrent GC dan lifecycle retirement manifest sudah
tersedia di source, termasuk outbox, retry, grace period, active-upload protection,
orphan cleanup, dan reactivation; unit evidence PP sudah lulus. Milestone
integrasi/regresi live masih pending karena stack belum aktif.

## Aturan fase PP

- Setiap fitur baru harus mendukung tujuan proposal dan tidak memperluas scope tanpa dasar.
- Immutability, CAS, FastCDC, BLAKE3, pemisahan Environment A/B, dan keamanan UDS tetap dipertahankan.
- Implementasi PP harus disertai pembaruan test, dokumentasi, dan bukti perilaku yang dapat diverifikasi.
- Jika roadmap PP berbenturan dengan implementasi saat ini, selaraskan implementasi dengan proposal dan laporkan dampaknya.

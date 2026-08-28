# Project status

## Fase aktif: Proyek Professional (PP)

PUI (Project Utama Informatika) telah selesai dan lulus. Repository ini sekarang memasuki fase PP.

Pengembangan PP wajib mengikuti roadmap pengembangan pada [proposal-pui.md](../proposal-pui.md), terutama:

- **Concurrent Garbage Collection**: membersihkan chunk fisik yang tidak lagi memiliki referensi aktif tanpa mengganggu proses baca dan tulis.
- **Read-Proxy**: menggantikan akses baca langsung ke direktori penyimpanan fisik agar rekonstruksi dan pengunduhan dikendalikan melalui Vault Core.

Urutan kerja: tetapkan contract dan baseline, selesaikan Concurrent Garbage Collection, lalu implementasikan Read-Proxy dan lakukan integrasi/regresi.

Detail milestone dan acceptance criteria ada di [pp-roadmap.md](pp-roadmap.md). Business flow ada di [business-flow.md](business-flow.md), sedangkan sequence dan boundary teknis ada di [technical-flow.md](technical-flow.md).

## Aturan fase PP

- Setiap fitur baru harus mendukung tujuan proposal dan tidak memperluas scope tanpa dasar.
- Immutability, CAS, FastCDC, BLAKE3, pemisahan Environment A/B, dan keamanan UDS tetap dipertahankan.
- Implementasi PP harus disertai pembaruan test, dokumentasi, dan bukti perilaku yang dapat diverifikasi.
- Jika roadmap PP berbenturan dengan implementasi saat ini, selaraskan implementasi dengan proposal dan laporkan dampaknya.

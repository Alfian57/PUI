# HashBox E2E Testing & Presentation Guide

Panduan ini menjelaskan struktur pengujian E2E (End-to-End) dan skenario demonstrasi visual untuk presentasi Proyek Utama Informatika (PUI) Anda.

---

## 📂 Struktur Direktori Pengujian

```text
tests/
├── blackbox/                          # Pengujian Fungsional Blackbox
│   ├── bruno/                         # Koleksi API & Environment (Bruno)
│   │   ├── hashbox_api_collection.json
│   │   ├── hashbox_development_env.json
│   │   └── sample_files/
│   │       ├── 01_berkas_baru.txt
│   │       ├── 02_berkas_identik.txt
│   │       ├── 03_perubahan_sebagian_A.bin
│   │       ├── 03_perubahan_sebagian_B.bin
│   │       └── 04_berkas_kosong.txt
│   └── playwright/                    # UI Testing E2E (Playwright)
│       ├── tests/
│       │   ├── auth.spec.ts
│       │   └── file_manager.spec.ts
│       ├── sample_files/
│       │   └── sample_image.jpg
│       ├── playwright.config.ts
│       └── package.json
└── security/                          # Pengujian Keamanan
    ├── run_security_tests.sh          # Script otomatisasi pengujian keamanan (CLI)
    └── demo_immutability.sh           # Script separation of authority demo (split-screen)
```

---

## 🚀 Persiapan Awal

1. **Pastikan Container Docker Berjalan**:
   ```bash
   make compose-up
   ```
2. **Install Playwright Dependencies**:
   Masuk ke folder `tests/blackbox/playwright` dan install modul Node.js:
   ```bash
   cd tests/blackbox/playwright
   npm install
   npx playwright install chromium
   ```

---

## 🖥️ 1. Demonstrasi UI dengan Playwright (Visual Web Demo)

Untuk menunjukkan otomatisasi browser secara visual di depan penguji, Anda dapat menggunakan mode **Headed** atau **UI Mode**:

### **A. Menjalankan di Background (Headless Mode)**
Untuk menjalankan seluruh pengujian E2E fungsional di latar belakang tanpa memunculkan browser popup:
```bash
make blackbox-ui-headless
```

### **B. Menjalankan Mode Visual (Headed Browser)**
Playwright akan membuka browser Chrome secara fisik dan menjalankan seluruh simulasi secara otomatis di layar Anda:
```bash
make blackbox-ui-headed
```

### **C. Menjalankan UI Mode (Sangat Direkomendasikan untuk Presentasi)**
Membuka antarmuka grafis interaktif Playwright (GUI) di mana penguji bisa melihat langkah-demi-langkah dan *timeline* tes secara *real-time*:
```bash
make blackbox-ui-gui
```
*Klik tombol **Play** di bagian atas untuk menjalankan simulasi secara otomatis.*

---

## 📡 2. Demonstrasi API dengan Bruno (Visual API Demo)

**Bruno** adalah alternatif open-source untuk Postman yang sangat bersih dan cepat.

### **Cara Demo Menggunakan Bruno GUI:**
1. Buka aplikasi **Bruno** di laptop Anda.
2. **Import Koleksi**:
   * Klik menu utama Bruno di pojok kiri atas -> Pilih **Import Collection**.
   * Pilih tipe import **Postman Collection** -> Pilih file `tests/blackbox/bruno/hashbox_api_collection.json`.
3. **Import Environment**:
   * Klik menu utama Bruno -> Pilih **Import Environment** (atau via panel environment).
   * Pilih file `tests/blackbox/bruno/hashbox_development_env.json`.
4. **Pilih Environment**:
   * Di pojok kanan atas aplikasi Bruno, ubah pilihan environment dari *No Environment* menjadi **HashBox Development**.
5. Jalankan request secara berurutan untuk mendemokan fungsionalitas sistem. Anda dapat menyalin dan memperbarui nilai variabel `token`, `directory_id`, dan `file_id` secara manual di panel environment Bruno setelah setiap request selesai. Hal ini sangat berguna untuk menunjukkan visualisasi alur dan pelacakan data secara transparan di depan dosen penguji.

---

## 🔒 3. Demonstrasi Immutability via Web UI + Storage Monitor

Demonstrasi visual sederhana untuk membuktikan bahwa chunk fisik tetap utuh meski file dihapus dari UI.

### **Langkah-Langkah Demo:**

1. Unggah file `laporan_penting.txt` via Web UI (http://localhost:5173).
2. Lakukan **Hapus Permanen** pada file tersebut dari halaman Sampah.
3. Tunjukkan folder `./data/vault/chunks` di terminal — chunk fisik tetap ada.

```bash
# Monitoring manual chunk di host
find ./data/vault/chunks -type f | wc -l
```

4. Untuk demonstrasi yang lebih menyeluruh dengan bukti teknis, gunakan demo di **Seksi 4** berikut.

## 🛡️ 4. Demonstrasi Separation of Authority (Split-Screen CLI Demo)

Demo utama yang membuktikan bahwa penguasaan lapisan aplikasi **tidak** memberikan akses ke penyimpanan fisik immutable di Vault Core. Setiap klaim dibuktikan dengan output nyata dari sistem.

### **Persiapan Split-Screen:**

Bagi layar menjadi dua:

* **Sisi Kiri (Sisi Penyerang)**: Terminal untuk menjalankan demo
* **Sisi Kanan (Sisi Vault Core)**: Log stream Vault Core

```bash
# Sisi Kanan — jalankan ini dulu
docker compose logs -f vault-core

# Sisi Kiri — jalankan demo
make security-simulate
```

### **Alur Demo (5 Fase):**

| Fase | Label | Apa yang terjadi |
|------|-------|------------------|
| **0** | BEFORE | Upload file target, rekam hash/chunk/manifest dari sistem |
| **1** | ATTACK A | Hapus permanen metadata via API — **berhasil** (Postgres terhapus) |
| **2** | PROOF | Cek Vault Core via UDS — manifest & chunk **tetap utuh** |
| **3** | ATTACK B | DELETE/PUT langsung ke UDS — **403 ditolak**, log kanan muncul `[SECURITY ACTION DENIED]` |
| **4** | AFTER | Rekonstruksi objek dari Vault Core, bandingkan byte-to-byte dengan file asli |

### **Apa yang dibuktikan:**

Demo ini menampilkan kontras yang nyata:
- Serangan ke lapisan aplikasi (Postgres) **berhasil** — metadata hilang, file tidak bisa diakses via API normal.
- Data fisik di Vault Core **tidak tersentuh** — manifest, chunk, dan isi file dapat direkonstruksi utuh setelah serangan.
- Serangan langsung ke UDS **ditolak** di tingkat protokol, bukan hanya lapisan aplikasi.

Setiap nilai yang ditampilkan (hash, chunk count, exists status) berasal dari respons sistem nyata — dapat diverifikasi penguji.

---

## 📺 5. Demonstrasi Pengujian Keamanan Otomatis

Untuk verifikasi pass/fail tanpa visual interaktif (cocok untuk CI atau demo cepat):

```bash
make security-test
```

Output menampilkan hasil tiap skenario serangan beserta respons Vault Core.

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
    ├── securitylab_integration_test.go # [Tipe 2] Integration test (Go) — dev/CI
    └── go.mod                          # Modul standalone untuk integration test
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

## 🛡️ 4. Pengujian Keamanan: Mitigasi Ransomware (Security Lab)

HashBox melindungi penyimpanan dari ransomware lewat **pemisahan otoritas**: penguasaan lapisan aplikasi **tidak** memberi akses untuk menghapus/menimpa konten fisik immutable di Vault Core. Untuk membuktikannya tersedia **dua tipe pengujian** yang menjalankan **logika skenario yang sama** (`SecurityLabService` di api-service), sehingga apa yang dipresentasikan persis sama dengan apa yang diuji saat development — bukan jalur demo terpisah.

Skenario 5 fase (semua nilai berasal dari respons sistem nyata, dapat diverifikasi penguji):

| Fase | Label | Apa yang terjadi |
|------|-------|------------------|
| **0** | BEFORE | Upload berkas demo throwaway, rekam `file_hash`, `chunk_count`, `manifest_id`, status chunk fisik |
| **1** | ATTACK A | Soft delete + hapus permanen metadata via API — **berhasil** (PostgreSQL terhapus) |
| **2** | PROOF | Query Vault Core via UDS — manifest & semua chunk **tetap utuh** |
| **3** | ATTACK B | DELETE/PUT/PATCH langsung ke UDS — **403 `operation_forbidden`**, log Vault Core memunculkan `[SECURITY ACTION DENIED]` |
| **4** | AFTER | Rekonstruksi objek dari Vault Core, bandingkan byte-to-byte dengan berkas asli (`sha256`) |

> Berkas yang diserang selalu **berkas demo throwaway** (mis. `ransomware_demo_<timestamp>.txt`) yang diunggah oleh skenario itu sendiri — data asli Anda tidak tersentuh. Karena Vault Core selalu menolak operasi destruktif, simulasi aman diulang.

### **Gate keamanan (WAJIB diperhatikan)**

Security Lab melakukan upload + hapus permanen **nyata** pada akun pemanggil, sehingga **dimatikan secara default**:

| Variabel | Lokasi | Default | Untuk apa |
|---|---|---|---|
| `SECURITY_LAB_ENABLED` | api-service | `false` | Mengaktifkan endpoint `GET /api/v1/security-lab/run` (SSE). Saat `false`, endpoint membalas 404. |
| `VITE_SECURITY_LAB_ENABLED` | web-client | `false` | Menampilkan menu & halaman `/app/security-lab`. Enforcement sebenarnya tetap di API. |

Aktifkan keduanya hanya di lingkungan demo/skripsi.

---

### **🖥️ Tipe 1 — Demo Visual untuk Presentasi (browser, otomatis)**

Halaman **Security Lab** di web client (`/app/security-lab`) menjalankan skenario secara live via Server-Sent Events dan menampilkan **data faktual** tiap fase: hash, chunk count, manifest id, respons mentah 403 dari Vault Core, dan hasil perbandingan byte-to-byte. Badge status: `OK`, `DITOLAK VAULT CORE`, `PELANGGARAN`.

**Cara manual (untuk dipresentasikan sendiri):**

1. Pastikan stack berjalan dan gate aktif:
   ```bash
   # .env: SECURITY_LAB_ENABLED=true dan VITE_SECURITY_LAB_ENABLED=true
   make compose-up
   ```
2. Login di http://localhost:5173, buka menu **Keamanan → Security Lab**.
3. Klik **Mulai Simulasi Serangan** dan tunjukkan timeline 5 fase yang terisi data nyata.

**Cara otomatis (Playwright membuka browser sungguhan):**

```bash
make security-demo
```

Playwright login, membuka halaman Security Lab, menjalankan skenario, dan memverifikasi: kelima fase muncul, ada event `DITOLAK VAULT CORE`, respons `operation_forbidden` terlihat, tidak ada `PELANGGARAN`, dan verdict akhir `passed`.

---

### **🔬 Tipe 2 — Pengujian Development (headless, CI)**

Pengujian ringkas tanpa browser, untuk dipakai sehari-hari dan di CI. Menjalankan skenario yang sama lewat endpoint SSE lalu meng-assert setiap invariant pada ringkasan terstruktur.

Prasyarat: stack berjalan, `SECURITY_LAB_ENABLED=true`, user dev ter-seed.

```bash
make security-test
```

Test akan:
- Login sebagai user dev (`gading@gmail.com`), memanggil `GET /api/v1/security-lab/run`.
- Mem-parse stream SSE dan meng-assert: serangan aplikasi berhasil, manifest Vault Core utuh, **semua** serangan UDS ditolak, rekonstruksi byte-to-byte identik, `file_hash`/`chunk_count` awal == akhir, manifest tetap immutable.
- `SKIP` otomatis bila stack tidak berjalan atau Security Lab belum diaktifkan (404).

> Variabel opsional: `HASHBOX_API_BASE_URL`, `HASHBOX_TEST_EMAIL`, `HASHBOX_TEST_PASSWORD`.

---

## 📦 6. Bukti Penyimpanan: Pemecahan Chunk & Deduplikasi

Demo CLI yang membuktikan, dengan data nyata, bagaimana sebuah berkas dipecah menjadi beberapa chunk dan disimpan di Vault Core. Cocok untuk menunjukkan cara kerja Content-Addressable Storage (FastCDC + BLAKE3) di depan penguji.

Prasyarat: stack berjalan (`make compose-up`), host punya `curl` dan `jq`.

```bash
make prove-chunking
```

Skrip menjalankan 6 langkah:

| Langkah | Apa yang dibuktikan |
|---------|---------------------|
| **1** | Login + snapshot jumlah chunk fisik awal di `./data/vault/chunks` |
| **2** | Membuat berkas demo acak (default 4 MB) lalu mengunggahnya; menampilkan respons API `chunk_count`, `new_chunk_count`, `reuse_chunk_count`, `dedup_ratio` |
| **3** | Menghitung ulang chunk fisik di volume Docker — pertambahan persis = jumlah chunk baru. Menampilkan path & ukuran chunk (`chunks/<2hex>/<2hex>/<BLAKE3>.bin`) |
| **4** | Manifest dari Vault Core (peta chunk) + baris metadata di PostgreSQL — membuktikan Postgres hanya menyimpan metadata, konten fisik hanya di Vault Core |
| **5** | Mengunggah berkas dengan isi identik → **0 chunk baru** (deduplikasi) |
| **6** | Mengunduh & membandingkan SHA-256 — berkas dirakit ulang dari chunk secara **identik** |

> Catatan FastCDC: ukuran chunk min 64 KB / avg 256 KB / max 1 MB. Berkas kecil (beberapa KB) hanya menjadi **1 chunk**; karena itu demo memakai berkas ≥1 MB agar terpecah menjadi banyak chunk. Atur ukuran via `DEMO_SIZE_MB`, mis. `DEMO_SIZE_MB=8 make prove-chunking`.

### Inspeksi manual volume (opsional)

Folder `./data/vault` dimiliki user internal Vault Core (uid `10002`), sehingga di host harus dibaca via `sudo` atau dari dalam container (justru memperkuat narasi: host biasa pun tidak bisa membaca penyimpanan):

```bash
# Jumlah chunk fisik
docker exec pui-vault-core sh -c "find /var/lib/pui/chunks -type f -name '*.bin' | wc -l"

# Daftar beberapa chunk (nama file = BLAKE3 hash isinya)
docker exec pui-vault-core sh -c "find /var/lib/pui/chunks -type f -name '*.bin' | head"

# Metadata berkas di PostgreSQL
docker exec pui-postgres psql -U pui -d pui -c \
  "SELECT nama, ukuran, id_manifest, chunk_count FROM files ORDER BY dibuat_pada DESC LIMIT 5;"
```



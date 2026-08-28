# Technical flow

Dokumen ini menjelaskan boundary dan sequence teknis. Proposal tetap menjadi authority; label **current** menunjukkan perilaku yang perlu diverifikasi ke kode, sedangkan **PP target** menunjukkan hasil yang harus dicapai.

## Upload dan commit

1. Web Client mengirim multipart/file stream ke API Service.
2. API memvalidasi identity, ownership, nama, ukuran, dan directory lalu membuat metadata `pending`.
3. API mengirim stream ke Vault Core melalui UDS.
4. Vault Core menjalankan FastCDC, hash BLAKE3, lookup dedup, penulisan chunk baru, dan commit manifest di BadgerDB.
5. API menerima hasil manifest/hash/chunk lalu mengubah metadata menjadi `committed`.
6. Jika salah satu tahap gagal sebelum commit, API tidak boleh mempublikasikan object sebagai valid; cleanup/recovery harus mengikuti contract yang tersedia.

## Download dan retrieval

- **Current**: API memvalidasi ownership lalu meminta object ke endpoint `GET /internal/v1/read-proxy/objects/{manifest_id}` melalui UDS dan meneruskan hasil ke Web Client. API tidak memiliki mount atau akses filesystem ke direktori chunk.
- Vault Core membaca manifest/chunk, memverifikasi integritas sesuai mode strict/streaming, merekonstruksi object, dan mengembalikan stream beserta `Content-Length` melalui boundary UDS yang diautentikasi peer.
- Endpoint lama `/internal/v1/objects/{manifest_id}` dipertahankan sebagai alias kompatibilitas; client API current memakai endpoint Read-Proxy eksplisit.
- Hasil retrieval harus identik dengan content yang diunggah, tidak membocorkan path fisik, dan tetap melewati peer authorization.

## Metadata, manifest, dan chunk

- PostgreSQL menyimpan identity, ownership, directory, status, dan metadata aplikasi.
- BadgerDB menyimpan metadata permanen Vault seperti manifest dan referensi chunk.
- Direktori chunk menyimpan content-addressed data berdasarkan hash.
- Metadata aplikasi boleh berubah secara logis; manifest/chunk immutable tidak boleh dimodifikasi oleh API.

## Concurrent Garbage Collection — PP current

1. GC membaca manifest dan membangun himpunan chunk yang masih memiliki reference aktif.
2. GC mengidentifikasi chunk tanpa reference aktif.
3. GC hanya menghapus kandidat yang sudah aman terhadap operasi upload, commit, restore, dan retrieval yang berjalan bersamaan.
4. Proses harus aman diulang, aman terhadap crash, dan tidak menghapus chunk yang masih dibutuhkan object committed.
5. Hasil GC harus dapat dibuktikan melalui count, reference check, dan regresi retrieval.

**Implementasi current:**

- Vault Core memakai lifecycle read/write lock: touch chunk dan commit manifest berjalan sebagai reader, sedangkan sweep GC mengambil writer lock.
- Upload aktif mendaftarkan chunk yang sudah disentuh di registry proses. Candidate tersebut dilewati sampai upload selesai; grace period tetap menjadi fallback setelah restart process.
- GC scan metadata fail-safe: manifest atau chunk record yang malformed menghentikan sweep sebelum deletion.
- Deletion berurutan file fisik lalu metadata. Jika deletion gagal, record dipertahankan agar dapat di-retry; file `.bin` tanpa metadata juga dibersihkan bila sudah melewati grace period.
- Scheduler background current berjalan setiap 10 menit dengan grace period 30 menit. Retrieval tetap concurrent karena GC hanya menghapus chunk yang tidak ada pada manifest snapshot.

## Read-Proxy — PP current

1. Request download publik diautentikasi dan ownership-nya diverifikasi oleh API Service.
2. API mengirim hanya `manifest_id` ke Vault Core melalui UDS peer-authorized.
3. Vault Core mengambil manifest, membaca chunk fisik, memverifikasi hash, dan mengalirkan object ke API.
4. API meneruskan bytes ke Web Client tanpa pernah membuka direktori chunk.

Read-Proxy tidak memberi API hak delete/write dan tidak mengekspos path fisik atau daftar chunk pada response download.

## UDS dan security event

- API → Vault Core memakai UDS dengan peer UID allowlist.
- Vault Core menolak method destruktif pada manifest/chunk dan mengembalikan `operation_forbidden`.
- Vault Core → API memakai socket event terpisah dengan peer credential allowlist.
- API menyimpan event keamanan, menyediakan histori admin, dan mengirim event baru melalui SSE.
- Timeout atau kegagalan publisher event tidak boleh mengubah response security denial yang sudah benar.

## Boundary wajib

- Web Client tidak mengakses database, BadgerDB, chunk, atau UDS.
- Vault Core tetap network-isolated.
- API tidak memperoleh hak write/delete terhadap content store.
- Read-Proxy PP harus mempersempit boundary retrieval, bukan memberi API akses storage baru.

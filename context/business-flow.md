# Business flow

Business scope mengikuti [proposal-pui.md](../proposal-pui.md). Web Client adalah antarmuka demonstrasi; nilai utama sistem berada pada penyimpanan immutable, deduplikasi, rekonstruksi, dan ketahanan terhadap manipulasi.

## Aktor

- **User**: autentikasi, mengelola direktori dan berkas miliknya, serta mengunduh object.
- **Admin/operator**: melihat informasi operasional dan bukti keamanan yang memang tersedia pada implementasi.
- **API Service**: memvalidasi request, mengelola metadata, dan mengatur akses ke Vault Core.
- **Vault Core**: menyimpan content dan manifest immutable.
- **Simulated attacker**: menguasai lapisan aplikasi dalam skenario security testing dan mencoba operasi destruktif.

## Lifecycle berkas

| Kondisi | Makna bisnis | Aturan penting |
|---|---|---|
| `pending` | Upload belum selesai | Belum boleh dianggap object valid |
| `committed` | Metadata dan manifest berhasil dikomit | Object dapat dibaca dan diverifikasi |
| `failed` | Upload atau commit gagal | Metadata tidak boleh menyatakan object valid |
| Soft deleted | Status logis di aplikasi ditandai terhapus | Manifest dan chunk fisik tetap ada |
| Restored | Status logis dikembalikan aktif | Object kembali dapat diakses sesuai authorization |
| Permanent metadata deleted | Metadata aplikasi dihapus permanen | Jika menjadi reference committed terakhir, API mengantrikan retirement manifest; content tetap dipertahankan sampai grace period GC |

## Alur inti

1. User login dan memperoleh session/token.
2. User mengunggah berkas melalui Web Client.
3. API membuat metadata sementara, meneruskan stream ke Vault Core, lalu menyimpan hasil commit setelah manifest tersedia.
4. Vault Core memecah content dengan FastCDC, menghitung BLAKE3, menggunakan ulang chunk identik, dan menyimpan manifest.
5. User dapat melihat metadata keamanan/deduplikasi dan mengunduh object yang direkonstruksi.
6. Soft delete dan restore hanya mengubah keadaan logis metadata aplikasi.
7. Permanent delete menghapus metadata aplikasi secara atomik dan mengantrikan retirement
   manifest hanya jika tidak ada file committed lain yang masih merujukinya. Worker
   akan retry saat Vault tidak tersedia; GC baru boleh mereclaim chunk setelah manifest
   retired melewati grace period.

## Alur gagal dan keamanan

- Credential atau request tidak valid ditolak tanpa membuat object sah.
- Nama aktif yang bentrok, manifest tidak tersedia, kegagalan upload, timeout, dan kegagalan commit harus menghasilkan error yang dapat ditelusuri tanpa meninggalkan metadata committed palsu.
- User tanpa authorization tidak boleh membaca atau mengubah resource user lain.
- Pada skenario ransomware, penguasaan API boleh menghilangkan metadata aplikasi, tetapi tidak boleh menghapus atau menimpa manifest/chunk immutable melalui Vault Core.
- Operasi destruktif yang ditolak dan hasil security testing menjadi bukti monitoring; pencatatan bukti tidak boleh melemahkan enforcement keamanan.

## Invariant bisnis

- Object `committed` dapat direkonstruksi byte-for-byte dari manifest.
- Deduplikasi tidak mengubah isi object.
- Penghapusan metadata tidak sama dengan penghapusan content fisik.
- Retirement hanya menandai manifest tidak aktif; physical reclamation dilakukan GC
  setelah grace period dan hanya bila tidak ada manifest aktif atau upload aktif.
- Semua fitur PP harus mempertahankan invariant di atas dan membuktikan hasilnya melalui test atau evidence yang relevan.

## Konsekuensi PP

Retirement manifest adalah state lifecycle internal Vault, bukan operasi delete atau
overwrite content. Manifest tombstone tetap tersedia untuk audit/retrieval selama grace
period; upload identik dapat mengaktifkannya kembali. Soft delete/restore tidak memicu
retirement karena metadata aplikasi masih dapat kembali aktif.

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
| Permanent metadata deleted | Metadata aplikasi dihapus permanen | Tidak berarti content fisik di Vault ikut dihapus |

## Alur inti

1. User login dan memperoleh session/token.
2. User mengunggah berkas melalui Web Client.
3. API membuat metadata sementara, meneruskan stream ke Vault Core, lalu menyimpan hasil commit setelah manifest tersedia.
4. Vault Core memecah content dengan FastCDC, menghitung BLAKE3, menggunakan ulang chunk identik, dan menyimpan manifest.
5. User dapat melihat metadata keamanan/deduplikasi dan mengunduh object yang direkonstruksi.
6. Soft delete dan restore hanya mengubah keadaan logis metadata aplikasi.

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
- Semua fitur PP harus mempertahankan invariant di atas dan membuktikan hasilnya melalui test atau evidence yang relevan.

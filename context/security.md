# Security model

## Invariant

- Authenticated user hanya boleh mengakses resource miliknya; route admin memerlukan role `admin`.
- Rate limiter menahan brute force dan request berlebihan pada API.
- Vault Core hanya dapat diakses melalui UDS dengan peer UID allowlist.
- Method destruktif terhadap manifest/chunk ditolak oleh policy Vault Core.
- Metadata aplikasi dapat terhapus saat simulasi, tetapi content store immutable harus tetap dapat dibaca dan direkonstruksi.

## Security monitoring

API merekam failed login, unauthorized/forbidden request, rate-limit block, penolakan Vault Core, event Security Lab, dan summary run. Event disimpan di PostgreSQL selama 30 hari, hanya tersedia melalui endpoint admin, dan event baru dikirim melalui SSE.

Bridge Vault → API memakai socket filesystem terpisah dan memvalidasi peer credential. Kegagalan mencatat event tidak boleh mengubah response penolakan Vault yang sudah benar.

## Safe handling

- Jangan log credential, Authorization header, request body, atau konten file.
- Security Lab hanya boleh aktif pada environment demo/testing dan menggunakan berkas throwaway.
- Jangan menonaktifkan immutable policy atau UDS authorization untuk mempermudah test; gunakan fixture/test seam yang sudah ada.

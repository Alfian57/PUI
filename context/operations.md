# Operations

## Menjalankan stack

```bash
cp .env.example .env
make env-check
make compose-up
make compose-seed
```

Seeder default membuat dua akun bootstrap (`gading@gmail.com` dan
`admin@gmail.com`, keduanya memakai password development `password`). Untuk
fixture sintetis lengkap dengan minimal 1.000 baris per tabel metadata, gunakan
`make compose-seed-full`, atau `make seed-full` pada API service lokal. Fixture
full memakai password `seed-password` untuk akun sintetis; akun bootstrap tetap
memakai `password`. Full seed juga mengunggah 500 dummy files melalui API/Vault
Core sehingga manifest yang dihasilkan nyata.

Web tersedia di `http://localhost:5173`, API di `http://localhost:8080/api/v1`, dan Swagger di `/api/v1/swagger/index.html`.

## Runtime boundary

- API berjalan pada network publik dan database network.
- Vault Core berjalan dengan `network_mode: none`.
- Volume `data/uds` dibagi untuk socket Vault dan security event bridge.
- Ownership socket dikontrol oleh UID/GID Compose; `SECURITY_EVENTS_ALLOWED_UIDS` harus cocok dengan UID Vault Core.
- PostgreSQL menyimpan metadata dan security events; Badger/chunk volume menyimpan content store.

## Diagnosis singkat

- Cek status: `docker compose ps` dan `docker compose logs -f api-service vault-core`.
- Jika API gagal start, periksa database URL, migration path, Vault socket, dan permission `data/uds`.
- Jika event Vault tidak muncul, periksa path socket event, ownership/group volume, dan allowlist UID.
- Hentikan stack dengan `make compose-down`; jangan menghapus volume kecuali ada otorisasi eksplisit.

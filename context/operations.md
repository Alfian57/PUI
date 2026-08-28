# Operations

## Menjalankan stack

```bash
cp .env.example .env
make compose-up
docker exec -i pui-postgres psql -U pui -d pui < environment-a/api-service/db/seeds/dev_admin.sql
```

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

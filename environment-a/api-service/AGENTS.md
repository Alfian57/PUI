# API Service local instructions

Instruksi ini melengkapi [root AGENTS.md](../../AGENTS.md); context umum ada di [context/development.md](../../context/development.md) dan [context/security.md](../../context/security.md).

- Gunakan pola Go/Gin/GORM yang sudah ada dan pertahankan error mapping domain.
- Migration PostgreSQL wajib memiliki file `.up.sql` dan `.down.sql`; jangan mengubah migration yang sudah dipakai tanpa alasan kompatibilitas.
- Endpoint admin harus melalui auth dan role guard. Jangan memasukkan credential atau body ke activity/security event.
- Perubahan Vault client atau security event bridge harus diuji bersama contract UDS dan timeout/error path.
- Verifikasi minimal: `gofmt -l .`, `go test ./...`, `go vet ./...`.
- Regenerasi Swagger hanya jika anotasi/API contract berubah dan periksa hasil generated file.

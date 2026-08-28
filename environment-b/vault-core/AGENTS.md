# Vault Core local instructions

Instruksi ini melengkapi [root AGENTS.md](../../AGENTS.md); context umum ada di [context/architecture.md](../../context/architecture.md) dan [context/security.md](../../context/security.md).

- Vault Core adalah storage boundary: tetap network-isolated dan hanya melayani UDS yang sudah diautentikasi peer credential.
- Jangan mengubah immutable policy untuk mengakomodasi caller; operasi destruktif harus tetap ditolak.
- Perubahan protocol atau security event publisher harus mempertahankan compatibility dengan API Service dan menguji peer UID/error path.
- Jangan log isi file atau payload sensitif; log hanya metadata operasional yang diperlukan.
- Verifikasi minimal: `gofmt -l .`, `go test ./...`, `go vet ./...`.

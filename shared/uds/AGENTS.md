# Shared UDS contract instructions

Instruksi ini melengkapi [root AGENTS.md](../../AGENTS.md). Folder ini berisi contract lintas API Service dan Vault Core.

- Perlakukan perubahan tipe, field, status, atau path sebagai perubahan protocol.
- Periksa kedua consumer/producer dan test terkait sebelum menyelesaikan perubahan.
- Pertahankan backward compatibility jika memungkinkan; dokumentasikan breaking change secara eksplisit.
- Jangan menambahkan credential atau konten file ke contract.

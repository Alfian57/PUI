# Test local instructions

Instruksi ini melengkapi [root AGENTS.md](../AGENTS.md); detail command ada di [context/testing.md](../context/testing.md).

- Bedakan unit test, blackbox UI, dan security integration test; tulis prasyaratnya di test atau README.
- Test yang memerlukan stack hidup harus memakai user/file demo dan tidak menyentuh data production.
- Security Lab boleh melakukan upload dan permanent delete hanya pada file throwaway yang dibuat oleh skenario.
- Assert outcome dan invariant yang dapat diverifikasi, termasuk error path, UDS authorization, dan event monitoring bila relevan.
- Jangan menyimpan token, secret, atau artifact sensitif di fixture dan output test.

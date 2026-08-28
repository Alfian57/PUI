# Web Client local instructions

Instruksi ini melengkapi [root AGENTS.md](../../AGENTS.md); context umum ada di [context/architecture.md](../../context/architecture.md) dan [context/testing.md](../../context/testing.md).

- Gunakan React/TypeScript/Vite/Tailwind dan komponen UI yang sudah ada sebelum membuat pola baru.
- Route yang memerlukan role harus memakai guard yang sesuai; jangan mengandalkan visibilitas sidebar sebagai authorization.
- API call harus memakai client, type, dan query key yang sudah ada; sesuaikan type dengan response backend.
- Untuk stream, polling, dan query gunakan cleanup, cancellation, serta state error yang jelas.
- Verifikasi minimal: `npm run lint` dan `npm run build`.

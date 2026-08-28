# PP roadmap

PUI telah selesai dan lulus. Fase aktif adalah Proyek Professional (PP), dengan scope wajib mengikuti pengembangan lanjutan pada [proposal-pui.md](../proposal-pui.md).

## Baseline dan gap

Baseline PUI mencakup upload, FastCDC, BLAKE3, CAS, deduplikasi, manifest, download, soft delete, restore, konsistensi metadata, dan simulasi manipulasi ransomware.

Sebelum mengubah kode, audit baseline terhadap proposal dan catat gap. Jangan menganggap implementasi current sebagai target PP, terutama pada boundary retrieval dan lifecycle content yang akan dipengaruhi GC.

## Milestone 0 — Contract dan baseline

**Tujuan:** menetapkan reference model dan batas retrieval sebelum perubahan storage.

**Output:** business flow, technical flow, reference/manifest contract, baseline metrics/evidence, dan daftar gap current-vs-target.

**Acceptance criteria:** object committed memiliki reference yang dapat ditelusuri; retrieval dan metadata status dapat diverifikasi; tidak ada keputusan desain yang bertentangan dengan proposal.

## Milestone 1 — Concurrent Garbage Collection

**Tujuan:** membersihkan chunk fisik tanpa mengganggu operasi baca/tulis dan tanpa menghapus chunk yang masih direferensikan.

**Dependency:** reference/manifest contract dan baseline crash-consistency harus jelas.

**Implementasi current:** Vault Core melakukan authoritative manifest scan, melindungi upload aktif
dengan lifecycle lock dan registry proses, serta menghapus file fisik sebelum metadata agar
sweep dapat diulang dengan aman. Manifest retired menjadi tombstone dengan `retired_at`; chunk
baru dapat direclaim setelah grace period dari retirement terbaru. Scheduler current berjalan
setiap 10 menit dengan grace period 30 menit.

Permanent delete file/folder menghapus metadata dan membuat durable outbox hanya untuk manifest
yang tidak lagi memiliki reference committed. Worker API memakai claim `SKIP LOCKED`, retry
berjarak, dan lifecycle UDS `retire`/`retain`. Upload identik dan commit baru dapat mengaktifkan
kembali manifest retired. Soft delete/restore tidak memicu retirement.

**Acceptance criteria:**

- chunk tanpa reference aktif dapat diidentifikasi dan dibersihkan;
- chunk yang masih dipakai object committed tidak pernah terhapus;
- GC aman berjalan bersamaan dengan upload, commit, retrieval, dan restore;
- retry tidak menghasilkan kerusakan tambahan dan crash tidak membuat object valid kehilangan chunk;
- permanent delete terakhir tidak meninggalkan manifest aktif tanpa lifecycle retirement;
- kegagalan Vault/outbox dapat dipulihkan melalui retry tanpa kehilangan content;
- object aktif tetap dapat direkonstruksi byte-for-byte setelah GC;
- test dan evidence mencakup kandidat aman, kandidat aktif, concurrency, retry, dan recovery.

## Milestone 2 — Read-Proxy

**Tujuan:** menggantikan akses baca langsung ke storage fisik dengan retrieval yang dikendalikan Vault Core.

**Dependency:** contract retrieval dan hasil regresi GC.

**Status:** implemented pada source; evidence end-to-end masih menunggu regresi PP.

**Implementasi:** API memakai endpoint UDS eksplisit `/internal/v1/read-proxy/objects/{manifest_id}`.
Vault Core menjadi satu-satunya komponen yang membuka manifest/chunk dan API hanya meneruskan stream.
Endpoint object lama dipertahankan sebagai alias kompatibilitas.

**Acceptance criteria:**

- API tidak membutuhkan read-only mount atau akses langsung ke direktori chunk;
- Vault Core menjadi pemilik proses pembacaan manifest, chunk, dan rekonstruksi object;
- request retrieval melewati UDS peer authorization;
- path fisik dan detail internal storage tidak bocor ke caller;
- hasil unduh sama dengan content asli;
- request tidak valid, object hilang, timeout, dan peer tidak berwenang memiliki outcome yang aman;
- test dan dokumentasi API/Vault/UDS diperbarui.

## Milestone 3 — Integrasi dan pembuktian

Jalankan regresi lifecycle file, deduplikasi, metadata, GC, Read-Proxy, crash consistency, dan ransomware scenario. Hasil akhir harus menunjukkan bahwa pengembangan PP menambah efisiensi dan boundary retrieval tanpa merusak immutability, ownership, atau rekonstruksi object.

## Batas scope

Tetap pada lingkungan single-node dan boundary proposal. High availability, replikasi terdistribusi, dan perluasan fitur administrasi bukan target PP kecuali proposal atau keputusan project diperbarui secara eksplisit.

Setiap milestone wajib memperbarui source, test, context, dan evidence yang relevan. Setelah implementasi, agent hanya menjalankan pemeriksaan ringan lalu meminta persetujuan user sebelum testing.

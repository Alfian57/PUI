-- Step 1: Rename duplicate active filenames so the unique index below can be created
-- without failing on pre-existing data.
-- For each group of duplicate names (per user + directory + lower(name), only active files),
-- keep the newest one as-is and rename the rest by appending " (n)".
-- This is idempotent: on clean data it is a no-op.
WITH ranked AS (
    SELECT
        id_berkas,
        row_number() OVER (
            PARTITION BY id_pengguna, COALESCE(id_direktori::text, 'ROOT'), lower(nama)
            ORDER BY dibuat_pada DESC, id_berkas
        ) AS rn
    FROM files
    WHERE dihapus_pada IS NULL
      AND status_penyimpanan IN ('pending', 'committed')
)
UPDATE files f
SET nama = f.nama || ' (' || r.rn || ')'
FROM ranked r
WHERE f.id_berkas = r.id_berkas
  AND r.rn > 1;

-- Step 2: Create partial unique indexes.
-- Two separate indexes are required because PostgreSQL treats NULL != NULL,
-- so a single index on (id_pengguna, id_direktori, lower(nama)) would not
-- enforce uniqueness among root files (id_direktori IS NULL).

CREATE UNIQUE INDEX uniq_active_filename_in_dir
    ON files (id_pengguna, id_direktori, lower(nama))
    WHERE id_direktori IS NOT NULL
      AND dihapus_pada IS NULL
      AND status_penyimpanan IN ('pending', 'committed');

CREATE UNIQUE INDEX uniq_active_filename_root
    ON files (id_pengguna, lower(nama))
    WHERE id_direktori IS NULL
      AND dihapus_pada IS NULL
      AND status_penyimpanan IN ('pending', 'committed');

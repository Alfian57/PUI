DROP INDEX IF EXISTS idx_files_status_penyimpanan;

ALTER TABLE files
    DROP CONSTRAINT IF EXISTS files_status_penyimpanan_check;

ALTER TABLE files
    DROP COLUMN IF EXISTS status_penyimpanan;

ALTER TABLE files
    RENAME COLUMN dihapus_pada TO deleted_at;

ALTER TABLE files
    RENAME COLUMN dibuat_pada TO created_at;

ALTER TABLE files
    RENAME COLUMN dibintangi_pada TO starred_at;

ALTER TABLE files
    RENAME COLUMN id_manifest TO manifest_id;

UPDATE files
SET manifest_id = ''
WHERE manifest_id IS NULL;

ALTER TABLE files
    ALTER COLUMN manifest_id SET NOT NULL;

ALTER TABLE files
    RENAME COLUMN ukuran TO size_bytes;

ALTER TABLE files
    RENAME COLUMN nama TO name;

ALTER TABLE files
    RENAME COLUMN id_direktori TO directory_id;

ALTER TABLE files
    RENAME COLUMN id_pengguna TO user_id;

ALTER TABLE files
    RENAME COLUMN id_berkas TO id;

ALTER TABLE directory_closure
    RENAME COLUMN kedalaman TO depth;

ALTER TABLE directory_closure
    RENAME COLUMN id_turunan TO descendant_id;

ALTER TABLE directory_closure
    RENAME COLUMN id_induk TO ancestor_id;

ALTER TABLE directories
    RENAME COLUMN dihapus_pada TO deleted_at;

ALTER TABLE directories
    RENAME COLUMN dibuat_pada TO created_at;

ALTER TABLE directories
    RENAME COLUMN dibintang_pada TO starred_at;

ALTER TABLE directories
    RENAME COLUMN nama TO name;

ALTER TABLE directories
    RENAME COLUMN id_pengguna TO user_id;

ALTER TABLE directories
    RENAME COLUMN id_direktori TO id;

ALTER TABLE users
    RENAME COLUMN dibuat_pada TO created_at;

ALTER TABLE users
    RENAME COLUMN peran TO role;

ALTER TABLE users
    RENAME COLUMN nama TO full_name;

ALTER TABLE users
    RENAME COLUMN id_pengguna TO id;

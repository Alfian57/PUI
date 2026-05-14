ALTER TABLE users
    RENAME COLUMN id TO id_pengguna;

ALTER TABLE users
    RENAME COLUMN full_name TO nama;

ALTER TABLE users
    RENAME COLUMN role TO peran;

ALTER TABLE users
    RENAME COLUMN created_at TO dibuat_pada;

ALTER TABLE directories
    RENAME COLUMN id TO id_direktori;

ALTER TABLE directories
    RENAME COLUMN user_id TO id_pengguna;

ALTER TABLE directories
    RENAME COLUMN name TO nama;

ALTER TABLE directories
    RENAME COLUMN starred_at TO dibintang_pada;

ALTER TABLE directories
    RENAME COLUMN created_at TO dibuat_pada;

ALTER TABLE directories
    RENAME COLUMN deleted_at TO dihapus_pada;

ALTER TABLE directory_closure
    RENAME COLUMN ancestor_id TO id_induk;

ALTER TABLE directory_closure
    RENAME COLUMN descendant_id TO id_turunan;

ALTER TABLE directory_closure
    RENAME COLUMN depth TO kedalaman;

ALTER TABLE files
    RENAME COLUMN id TO id_berkas;

ALTER TABLE files
    RENAME COLUMN user_id TO id_pengguna;

ALTER TABLE files
    RENAME COLUMN directory_id TO id_direktori;

ALTER TABLE files
    RENAME COLUMN name TO nama;

ALTER TABLE files
    RENAME COLUMN size_bytes TO ukuran;

ALTER TABLE files
    RENAME COLUMN manifest_id TO id_manifest;

ALTER TABLE files
    ALTER COLUMN id_manifest DROP NOT NULL;

ALTER TABLE files
    RENAME COLUMN starred_at TO dibintangi_pada;

ALTER TABLE files
    RENAME COLUMN created_at TO dibuat_pada;

ALTER TABLE files
    RENAME COLUMN deleted_at TO dihapus_pada;

ALTER TABLE files
    ADD COLUMN IF NOT EXISTS status_penyimpanan VARCHAR(20) NOT NULL DEFAULT 'committed';

ALTER TABLE files
    DROP CONSTRAINT IF EXISTS files_status_penyimpanan_check;

ALTER TABLE files
    ADD CONSTRAINT files_status_penyimpanan_check
    CHECK (status_penyimpanan IN ('pending', 'committed', 'failed'));

CREATE INDEX IF NOT EXISTS idx_files_status_penyimpanan
    ON files (status_penyimpanan);

CREATE TABLE IF NOT EXISTS files (
    id_berkas         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_pengguna       UUID             NOT NULL REFERENCES users(id_pengguna) ON DELETE CASCADE,
    id_direktori      UUID             NULL     REFERENCES directories(id_direktori) ON DELETE RESTRICT,
    nama              VARCHAR(255)     NOT NULL,
    ukuran            BIGINT           NOT NULL,
    mime_type         VARCHAR(150)     NOT NULL,
    id_manifest       VARCHAR(64)      NULL,
    chunk_count       INTEGER          NOT NULL DEFAULT 0,
    new_chunk_count   INTEGER          NOT NULL DEFAULT 0,
    reuse_chunk_count INTEGER          NOT NULL DEFAULT 0,
    dedup_ratio       DOUBLE PRECISION NOT NULL DEFAULT 0,
    status_penyimpanan VARCHAR(20)     NOT NULL DEFAULT 'committed',
    dibintangi_pada   TIMESTAMP        NULL,
    dibuat_pada       TIMESTAMP        NOT NULL DEFAULT NOW(),
    dihapus_pada      TIMESTAMP        NULL,
    CONSTRAINT files_status_penyimpanan_check
        CHECK (status_penyimpanan IN ('pending', 'committed', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_files_directory_id          ON files (id_direktori);
CREATE INDEX IF NOT EXISTS idx_files_manifest_id           ON files (id_manifest);
CREATE INDEX IF NOT EXISTS idx_files_deleted_at            ON files (dihapus_pada);
CREATE INDEX IF NOT EXISTS idx_files_starred_at            ON files (dibintangi_pada);
CREATE INDEX IF NOT EXISTS idx_files_user_location_deleted ON files (id_pengguna, id_direktori, dihapus_pada);
CREATE INDEX IF NOT EXISTS idx_files_user_root_deleted     ON files (id_pengguna, dihapus_pada) WHERE id_direktori IS NULL;
CREATE INDEX IF NOT EXISTS idx_files_status_penyimpanan    ON files (status_penyimpanan);

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

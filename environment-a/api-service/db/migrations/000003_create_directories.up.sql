CREATE TABLE IF NOT EXISTS directories (
    id_direktori  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_pengguna   UUID         NOT NULL REFERENCES users(id_pengguna) ON DELETE CASCADE,
    nama          VARCHAR(255) NOT NULL,
    dibintang_pada TIMESTAMP   NULL,
    dibuat_pada   TIMESTAMP    NOT NULL DEFAULT NOW(),
    dihapus_pada  TIMESTAMP    NULL
);

CREATE INDEX IF NOT EXISTS idx_directories_deleted_at  ON directories (dihapus_pada);
CREATE INDEX IF NOT EXISTS idx_directories_starred_at  ON directories (dibintang_pada);

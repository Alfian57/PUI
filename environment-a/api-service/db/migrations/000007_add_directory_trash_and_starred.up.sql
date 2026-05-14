ALTER TABLE directories
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL,
    ADD COLUMN IF NOT EXISTS starred_at TIMESTAMP NULL;

CREATE INDEX IF NOT EXISTS idx_directories_deleted_at
    ON directories (deleted_at);

CREATE INDEX IF NOT EXISTS idx_directories_starred_at
    ON directories (starred_at);

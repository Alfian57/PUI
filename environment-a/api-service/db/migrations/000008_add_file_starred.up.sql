ALTER TABLE files
    ADD COLUMN IF NOT EXISTS starred_at TIMESTAMP NULL;

CREATE INDEX IF NOT EXISTS idx_files_starred_at
    ON files (starred_at);

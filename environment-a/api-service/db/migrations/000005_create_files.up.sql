CREATE TABLE IF NOT EXISTS files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    directory_id UUID NOT NULL REFERENCES directories(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    size_bytes BIGINT NOT NULL,
    mime_type VARCHAR(150) NOT NULL,
    manifest_id VARCHAR(64) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS idx_files_directory_id
    ON files (directory_id);

CREATE INDEX IF NOT EXISTS idx_files_manifest_id
    ON files (manifest_id);

CREATE INDEX IF NOT EXISTS idx_files_deleted_at
    ON files (deleted_at);

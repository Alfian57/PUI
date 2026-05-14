ALTER TABLE files
    ADD COLUMN IF NOT EXISTS user_id UUID NULL REFERENCES users(id) ON DELETE CASCADE;

UPDATE files f
SET user_id = d.user_id
FROM directories d
WHERE f.directory_id = d.id
  AND f.user_id IS NULL;

ALTER TABLE files
    ALTER COLUMN user_id SET NOT NULL,
    ALTER COLUMN directory_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_files_user_location_deleted
    ON files (user_id, directory_id, deleted_at);

CREATE INDEX IF NOT EXISTS idx_files_user_root_deleted
    ON files (user_id, deleted_at)
    WHERE directory_id IS NULL;

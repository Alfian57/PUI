DROP INDEX IF EXISTS idx_files_user_root_deleted;
DROP INDEX IF EXISTS idx_files_user_location_deleted;

DELETE FROM files
WHERE directory_id IS NULL;

ALTER TABLE files
    ALTER COLUMN directory_id SET NOT NULL,
    DROP COLUMN IF EXISTS user_id;

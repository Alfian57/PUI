DROP INDEX IF EXISTS idx_directories_starred_at;
DROP INDEX IF EXISTS idx_directories_deleted_at;

ALTER TABLE directories
    DROP COLUMN IF EXISTS starred_at,
    DROP COLUMN IF EXISTS deleted_at;

DROP INDEX IF EXISTS idx_files_starred_at;

ALTER TABLE files
    DROP COLUMN IF EXISTS starred_at;

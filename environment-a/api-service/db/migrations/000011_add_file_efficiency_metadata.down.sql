ALTER TABLE files
    DROP COLUMN IF EXISTS dedup_ratio,
    DROP COLUMN IF EXISTS reuse_chunk_count,
    DROP COLUMN IF EXISTS new_chunk_count,
    DROP COLUMN IF EXISTS chunk_count;

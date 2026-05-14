CREATE TABLE IF NOT EXISTS directory_closure (
    ancestor_id UUID NOT NULL REFERENCES directories(id) ON DELETE CASCADE,
    descendant_id UUID NOT NULL REFERENCES directories(id) ON DELETE CASCADE,
    depth INTEGER NOT NULL CHECK (depth >= 0),
    PRIMARY KEY (ancestor_id, descendant_id)
);

CREATE INDEX IF NOT EXISTS idx_directory_closure_descendant_id
    ON directory_closure (descendant_id);

CREATE INDEX IF NOT EXISTS idx_directory_closure_ancestor_depth
    ON directory_closure (ancestor_id, depth);

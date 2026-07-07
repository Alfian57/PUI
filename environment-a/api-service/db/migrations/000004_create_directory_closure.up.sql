CREATE TABLE IF NOT EXISTS directory_closure (
    id_induk   UUID    NOT NULL REFERENCES directories(id_direktori) ON DELETE CASCADE,
    id_turunan UUID    NOT NULL REFERENCES directories(id_direktori) ON DELETE CASCADE,
    kedalaman  INTEGER NOT NULL CHECK (kedalaman >= 0),
    PRIMARY KEY (id_induk, id_turunan)
);

CREATE INDEX IF NOT EXISTS idx_directory_closure_descendant_id   ON directory_closure (id_turunan);
CREATE INDEX IF NOT EXISTS idx_directory_closure_ancestor_depth  ON directory_closure (id_induk, kedalaman);

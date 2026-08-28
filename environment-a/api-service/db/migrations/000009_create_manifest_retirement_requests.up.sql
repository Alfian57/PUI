CREATE TABLE IF NOT EXISTS manifest_retirement_requests (
    manifest_id  VARCHAR(64) PRIMARY KEY,
    status       VARCHAR(20) NOT NULL DEFAULT 'pending',
    attempts     INTEGER NOT NULL DEFAULT 0,
    available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_error   TEXT NOT NULL DEFAULT '',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ NULL,
    CONSTRAINT manifest_retirement_requests_status_check
        CHECK (status IN ('pending', 'completed'))
);

CREATE INDEX IF NOT EXISTS idx_manifest_retirement_requests_pending
    ON manifest_retirement_requests (status, available_at);

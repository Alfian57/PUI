CREATE TABLE IF NOT EXISTS security_events (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id      UUID NULL,
    event_type  VARCHAR(60) NOT NULL,
    source      VARCHAR(30) NOT NULL,
    severity    VARCHAR(20) NOT NULL,
    outcome     VARCHAR(20) NOT NULL,
    user_id     UUID NULL REFERENCES users(id_pengguna) ON DELETE SET NULL,
    client_ip   INET NULL,
    method      VARCHAR(10) NOT NULL DEFAULT '',
    path        VARCHAR(255) NOT NULL DEFAULT '',
    status_code SMALLINT NOT NULL DEFAULT 0,
    error_code  VARCHAR(100) NOT NULL DEFAULT '',
    phase       VARCHAR(30) NOT NULL DEFAULT '',
    step        VARCHAR(100) NOT NULL DEFAULT '',
    title       VARCHAR(255) NOT NULL DEFAULT '',
    detail      TEXT NOT NULL DEFAULT '',
    details     JSONB NOT NULL DEFAULT '{}'::jsonb,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_events_occurred_at
    ON security_events (occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_type_outcome
    ON security_events (event_type, outcome, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_run_id
    ON security_events (run_id, occurred_at ASC);

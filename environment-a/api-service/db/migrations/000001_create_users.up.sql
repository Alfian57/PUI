CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
    id_pengguna UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama        VARCHAR(150) NOT NULL,
    email       VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    peran       VARCHAR(20)  NOT NULL DEFAULT 'user',
    dibuat_pada TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT users_role_check CHECK (peran IN ('user', 'admin'))
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users (peran);

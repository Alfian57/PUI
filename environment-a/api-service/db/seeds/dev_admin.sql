-- Development-only seed script.
-- Apply manually when you need a local bootstrap user:
-- psql "$DATABASE_URL" -f db/seeds/dev_admin.sql

INSERT INTO users (full_name, email, password_hash, role)
VALUES (
    'Alfian Gading',
    'gading@gmail.com',
    crypt('password', gen_salt('bf')),
    'user'
)
ON CONFLICT (email) DO UPDATE
SET full_name = EXCLUDED.full_name,
    role = EXCLUDED.role;

INSERT INTO users (full_name, email, password_hash, role)
VALUES (
    'Admin HashBox',
    'admin@gmail.com',
    crypt('password', gen_salt('bf')),
    'admin'
)
ON CONFLICT (email) DO UPDATE
SET full_name = EXCLUDED.full_name,
    role = EXCLUDED.role;

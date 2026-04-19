-- Development-only seed script.
-- Apply manually when you need a local bootstrap user:
-- psql "$API_DATABASE_URL" -f environment-a/api-service/db/seeds/dev_admin.sql

INSERT INTO users (full_name, email, password_hash)
VALUES (
    'Administrator Local',
    'admin@pui.local',
    crypt('admin123', gen_salt('bf'))
)
ON CONFLICT (email) DO NOTHING;

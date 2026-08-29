-- Full development/demo seed.
--
-- This file seeds the PostgreSQL metadata phase. The `seed-full` Make target
-- follows it with scripts/seed_full_content.sh, which uploads 500 real dummy
-- files through API Service so their manifests are created by Vault Core.
--
-- The seed is set-based and idempotent. It keeps existing application data and
-- upserts only deterministic fixture rows. Run it only against a local/demo
-- database because it creates a large synthetic dataset.

\set ON_ERROR_STOP on

BEGIN;

SET LOCAL TIME ZONE 'UTC';

-- -------------------------------------------------------------------------
-- Users: 1,000 rows, with both supported roles represented.
-- -------------------------------------------------------------------------
INSERT INTO users (nama, email, password_hash, peran)
VALUES
    ('Alfian Gading', 'gading@gmail.com', crypt('password', gen_salt('bf')), 'user'),
    ('Admin HashBox', 'admin@gmail.com', crypt('password', gen_salt('bf')), 'admin')
ON CONFLICT (email) DO UPDATE
SET nama = EXCLUDED.nama,
    peran = EXCLUDED.peran;

CREATE TEMP TABLE _hashbox_seed_users ON COMMIT DROP AS
WITH seed_numbers AS (
    SELECT seed_no
    FROM generate_series(1, 1000) AS numbers(seed_no)
), fixture_users AS (
    SELECT
        seed_no,
        CASE seed_no
            WHEN 1 THEN (SELECT id_pengguna FROM users WHERE email = 'gading@gmail.com')
            WHEN 2 THEN (SELECT id_pengguna FROM users WHERE email = 'admin@gmail.com')
            ELSE md5('hashbox:full:user:' || seed_no)::uuid
        END AS id_pengguna,
        CASE seed_no
            WHEN 1 THEN 'Alfian Gading'
            WHEN 2 THEN 'Admin HashBox'
            ELSE 'Seed User ' || lpad(seed_no::text, 4, '0')
        END AS nama,
        CASE seed_no
            WHEN 1 THEN 'gading@gmail.com'
            WHEN 2 THEN 'admin@gmail.com'
            ELSE 'seed.user.' || lpad(seed_no::text, 4, '0') || '@example.test'
        END AS email,
        CASE
            WHEN seed_no = 2 OR seed_no % 10 = 0 THEN 'admin'
            ELSE 'user'
        END AS peran
    FROM seed_numbers
)
SELECT
    id_pengguna,
    seed_no,
    nama,
    email,
    peran,
    NOW() - (seed_no || ' days')::interval AS dibuat_pada
FROM fixture_users;

INSERT INTO users (id_pengguna, nama, email, password_hash, peran, dibuat_pada)
SELECT
    id_pengguna,
    nama,
    email,
    crypt('seed-password', gen_salt('bf', 4)),
    peran,
    dibuat_pada
FROM _hashbox_seed_users
WHERE seed_no > 2
ON CONFLICT DO NOTHING;

-- -------------------------------------------------------------------------
-- Access sessions: 500 active and 500 revoked sessions.
-- -------------------------------------------------------------------------
CREATE TEMP TABLE _hashbox_seed_sessions ON COMMIT DROP AS
SELECT
    md5('hashbox:full:session:' || numbers.seed_no)::uuid AS id,
    users.id_pengguna AS user_id,
    encode(digest('hashbox:full:access-token:' || numbers.seed_no, 'sha256'), 'hex') AS access_token_hash,
    NOW() + CASE
        WHEN numbers.seed_no % 2 = 0 THEN interval '14 days'
        ELSE interval '-2 days'
    END AS expires_at,
    CASE
        WHEN numbers.seed_no % 2 = 0 THEN NULL::timestamp
        ELSE NOW() - interval '1 day'
    END AS revoked_at,
    NOW() - (numbers.seed_no || ' hours')::interval AS created_at
FROM generate_series(1, 1000) AS numbers(seed_no)
JOIN _hashbox_seed_users AS users ON users.seed_no = numbers.seed_no;

INSERT INTO access_sessions (id, user_id, access_token_hash, expires_at, revoked_at, created_at)
SELECT id, user_id, access_token_hash, expires_at, revoked_at, created_at
FROM _hashbox_seed_sessions
ON CONFLICT (id) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    access_token_hash = EXCLUDED.access_token_hash,
    expires_at = EXCLUDED.expires_at,
    revoked_at = EXCLUDED.revoked_at,
    created_at = EXCLUDED.created_at;

-- -------------------------------------------------------------------------
-- Directories: 1,000 rows across 100 users. Each user owns one root and
-- nine children, which also gives the closure table meaningful hierarchy.
-- -------------------------------------------------------------------------
CREATE TEMP TABLE _hashbox_seed_directories ON COMMIT DROP AS
WITH directory_shape AS (
    SELECT
        seed_no,
        ((seed_no - 1) / 10) + 1 AS user_no,
        ((seed_no - 1) % 10) + 1 AS slot_no
    FROM generate_series(1, 1000) AS numbers(seed_no)
)
SELECT
    md5('hashbox:full:directory:' || shape.seed_no)::uuid AS id_direktori,
    users.id_pengguna,
    shape.seed_no,
    shape.user_no,
    shape.slot_no,
    'Seed Folder ' || lpad(shape.user_no::text, 3, '0') || '-' || lpad(shape.slot_no::text, 2, '0') AS nama,
    CASE WHEN shape.slot_no = 1 THEN 0 ELSE 1 END AS depth,
    CASE
        WHEN shape.slot_no = 1 THEN NULL::uuid
        ELSE md5('hashbox:full:directory:' || ((shape.user_no - 1) * 10 + 1))::uuid
    END AS parent_id,
    NOW() - (shape.seed_no || ' days')::interval AS dibuat_pada,
    CASE
        WHEN shape.slot_no = 10 THEN NOW() - (shape.seed_no || ' hours')::interval
        ELSE NULL::timestamp
    END AS dihapus_pada,
    CASE
        WHEN shape.slot_no IN (3, 6, 9) THEN NOW() - (shape.seed_no || ' hours')::interval
        ELSE NULL::timestamp
    END AS dibintang_pada
FROM directory_shape AS shape
JOIN _hashbox_seed_users AS users ON users.seed_no = shape.user_no;

INSERT INTO directories (id_direktori, id_pengguna, nama, dibintang_pada, dibuat_pada, dihapus_pada)
SELECT id_direktori, id_pengguna, nama, dibintang_pada, dibuat_pada, dihapus_pada
FROM _hashbox_seed_directories
ON CONFLICT (id_direktori) DO UPDATE SET
    id_pengguna = EXCLUDED.id_pengguna,
    nama = EXCLUDED.nama,
    dibintang_pada = EXCLUDED.dibintang_pada,
    dibuat_pada = EXCLUDED.dibuat_pada,
    dihapus_pada = EXCLUDED.dihapus_pada;

INSERT INTO directory_closure (id_induk, id_turunan, kedalaman)
SELECT id_direktori, id_direktori, 0
FROM _hashbox_seed_directories
UNION ALL
SELECT parent_id, id_direktori, 1
FROM _hashbox_seed_directories
WHERE parent_id IS NOT NULL
ON CONFLICT (id_induk, id_turunan) DO UPDATE SET
    kedalaman = EXCLUDED.kedalaman;

-- -------------------------------------------------------------------------
-- Files: 1,000 metadata rows in this phase: exactly 500 pending and 500
-- failed. The content phase adds exactly 500 committed files with real Vault
-- manifests, producing the final 500/500/500 status distribution.
-- -------------------------------------------------------------------------
CREATE TEMP TABLE _hashbox_seed_files ON COMMIT DROP AS
WITH file_shape AS (
    SELECT
        seed_no,
        ((seed_no - 1) % 100) + 1 AS user_no,
        (((seed_no - 1) / 100) % 10) + 1 AS slot_no,
        CASE WHEN seed_no <= 500 THEN 'pending' ELSE 'failed' END AS status,
        CASE seed_no % 6
            WHEN 0 THEN 'application/pdf'
            WHEN 1 THEN 'image/png'
            WHEN 2 THEN 'text/plain'
            WHEN 3 THEN 'application/zip'
            WHEN 4 THEN 'text/csv'
            ELSE 'video/mp4'
        END AS mime_type,
        CASE seed_no % 6
            WHEN 0 THEN 'pdf'
            WHEN 1 THEN 'png'
            WHEN 2 THEN 'txt'
            WHEN 3 THEN 'zip'
            WHEN 4 THEN 'csv'
            ELSE 'mp4'
        END AS extension
    FROM generate_series(1, 1000) AS numbers(seed_no)
), file_values AS (
    SELECT
        shape.*,
        users.id_pengguna,
        directories.id_direktori,
        NULL::text AS id_manifest,
        CASE
            WHEN shape.status = 'pending' THEN 4096 + (shape.seed_no * 11)
            ELSE 0
        END::bigint AS ukuran,
        0 AS chunk_count,
        0 AS new_chunk_count,
        0 AS reuse_chunk_count
    FROM file_shape AS shape
    JOIN _hashbox_seed_users AS users ON users.seed_no = shape.user_no
    JOIN _hashbox_seed_directories AS directories
        ON directories.seed_no = ((shape.user_no - 1) * 10 + shape.slot_no)
)
SELECT
    seed_no,
    md5('hashbox:full:file:' || seed_no)::uuid AS id_berkas,
    id_pengguna,
    CASE WHEN seed_no % 20 = 0 THEN NULL::uuid ELSE id_direktori END AS id_direktori,
    'seed-file-' || lpad(seed_no::text, 4, '0') || '.' || extension AS nama,
    ukuran,
    mime_type,
    id_manifest,
    chunk_count,
    new_chunk_count,
    reuse_chunk_count,
    0::double precision AS dedup_ratio,
    status AS status_penyimpanan,
    NULL::timestamp AS dihapus_pada,
    NULL::timestamp AS dibintangi_pada,
    CASE
        WHEN status = 'pending' THEN NOW() - (seed_no || ' seconds')::interval
        ELSE NOW() - (seed_no || ' hours')::interval
    END AS dibuat_pada
FROM file_values;

INSERT INTO files (
    id_berkas, id_pengguna, id_direktori, nama, ukuran, mime_type, id_manifest,
    chunk_count, new_chunk_count, reuse_chunk_count, dedup_ratio,
    status_penyimpanan, dibintangi_pada, dibuat_pada, dihapus_pada
)
SELECT
    id_berkas, id_pengguna, id_direktori, nama, ukuran, mime_type, id_manifest,
    chunk_count, new_chunk_count, reuse_chunk_count, dedup_ratio,
    status_penyimpanan, dibintangi_pada, dibuat_pada, dihapus_pada
FROM _hashbox_seed_files
ON CONFLICT (id_berkas) DO UPDATE SET
    id_pengguna = EXCLUDED.id_pengguna,
    id_direktori = EXCLUDED.id_direktori,
    nama = EXCLUDED.nama,
    ukuran = EXCLUDED.ukuran,
    mime_type = EXCLUDED.mime_type,
    id_manifest = EXCLUDED.id_manifest,
    chunk_count = EXCLUDED.chunk_count,
    new_chunk_count = EXCLUDED.new_chunk_count,
    reuse_chunk_count = EXCLUDED.reuse_chunk_count,
    dedup_ratio = EXCLUDED.dedup_ratio,
    status_penyimpanan = EXCLUDED.status_penyimpanan,
    dibintangi_pada = EXCLUDED.dibintangi_pada,
    dibuat_pada = EXCLUDED.dibuat_pada,
    dihapus_pada = EXCLUDED.dihapus_pada;

-- -------------------------------------------------------------------------
-- Activity logs: 1,000 rows covering every activity action currently
-- presented by the UI.
-- -------------------------------------------------------------------------
WITH activity_shape AS (
    SELECT
        numbers.seed_no,
        users.id_pengguna AS user_id,
        sessions.id AS session_id,
        directories.id_direktori AS directory_id,
        files.id_berkas AS file_id,
        CASE numbers.seed_no % 22
            WHEN 0 THEN 'LOGIN'
            WHEN 1 THEN 'REGISTER'
            WHEN 2 THEN 'LOGOUT'
            WHEN 3 THEN 'UPLOAD'
            WHEN 4 THEN 'UPLOAD_FAILED'
            WHEN 5 THEN 'DOWNLOAD'
            WHEN 6 THEN 'DOWNLOAD_TRASHED'
            WHEN 7 THEN 'REQUEST_PASSWORD_RESET'
            WHEN 8 THEN 'CONFIRM_PASSWORD_RESET'
            WHEN 9 THEN 'DELETE_SOFT'
            WHEN 10 THEN 'DELETE_FILE_PERMANENT'
            WHEN 11 THEN 'DELETE_DIRECTORY_SOFT'
            WHEN 12 THEN 'DELETE_DIRECTORY_PERMANENT'
            WHEN 13 THEN 'RESTORE_FILE'
            WHEN 14 THEN 'RESTORE_DIRECTORY'
            WHEN 15 THEN 'STAR_FILE'
            WHEN 16 THEN 'UNSTAR_FILE'
            WHEN 17 THEN 'STAR_DIRECTORY'
            WHEN 18 THEN 'UNSTAR_DIRECTORY'
            WHEN 19 THEN 'CREATE_DIRECTORY'
            ELSE 'UPDATE_PROFILE'
        END AS action
    FROM generate_series(1, 1000) AS numbers(seed_no)
    JOIN _hashbox_seed_users AS users ON users.seed_no = numbers.seed_no
    JOIN _hashbox_seed_sessions AS sessions ON sessions.user_id = users.id_pengguna
    JOIN _hashbox_seed_directories AS directories ON directories.seed_no = numbers.seed_no
    JOIN _hashbox_seed_files AS files ON files.seed_no = numbers.seed_no
)
INSERT INTO activity_logs (id, user_id, action, resource_type, resource_id, created_at)
SELECT
    md5('hashbox:full:activity:' || seed_no)::uuid,
    user_id,
    action,
    CASE
        WHEN action IN ('LOGIN', 'LOGOUT') THEN 'SESSION'
        WHEN action IN ('REGISTER', 'REQUEST_PASSWORD_RESET', 'CONFIRM_PASSWORD_RESET', 'UPDATE_PROFILE') THEN 'USER'
        WHEN action IN (
            'DELETE_DIRECTORY_SOFT', 'DELETE_DIRECTORY_PERMANENT', 'RESTORE_DIRECTORY',
            'STAR_DIRECTORY', 'UNSTAR_DIRECTORY', 'CREATE_DIRECTORY'
        ) THEN 'DIRECTORY'
        ELSE 'FILE'
    END,
    CASE
        WHEN action IN ('LOGIN', 'LOGOUT') THEN session_id
        WHEN action IN ('REGISTER', 'REQUEST_PASSWORD_RESET', 'CONFIRM_PASSWORD_RESET', 'UPDATE_PROFILE') THEN user_id
        WHEN action IN (
            'DELETE_DIRECTORY_SOFT', 'DELETE_DIRECTORY_PERMANENT', 'RESTORE_DIRECTORY',
            'STAR_DIRECTORY', 'UNSTAR_DIRECTORY', 'CREATE_DIRECTORY'
        ) THEN directory_id
        ELSE file_id
    END,
    NOW() - (seed_no || ' minutes')::interval
FROM activity_shape
ON CONFLICT (id) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    action = EXCLUDED.action,
    resource_type = EXCLUDED.resource_type,
    resource_id = EXCLUDED.resource_id,
    created_at = EXCLUDED.created_at;

-- -------------------------------------------------------------------------
-- Security events: 1,000 rows, exactly 200 for each supported outcome:
-- detected, blocked, info, ok, and breach.
-- -------------------------------------------------------------------------
WITH security_shape AS (
    SELECT
        numbers.seed_no,
        users.id_pengguna AS user_id,
        (numbers.seed_no - 1) % 5 AS variant
    FROM generate_series(1, 1000) AS numbers(seed_no)
    JOIN _hashbox_seed_users AS users ON users.seed_no = ((numbers.seed_no - 1) % 1000) + 1
)
INSERT INTO security_events (
    id, run_id, event_type, source, severity, outcome, user_id, client_ip,
    method, path, status_code, error_code, phase, step, title, detail, details,
    occurred_at
)
SELECT
    md5('hashbox:full:security-event:' || seed_no)::uuid,
    CASE WHEN variant IN (3, 4) THEN md5('hashbox:full:security-run:' || ((seed_no - 1) / 10))::uuid ELSE NULL::uuid END,
    CASE variant
        WHEN 0 THEN 'FAILED_LOGIN'
        WHEN 1 THEN 'UNAUTHORIZED_REQUEST'
        WHEN 2 THEN 'FORBIDDEN_REQUEST'
        WHEN 3 THEN 'SECURITY_LAB_EVENT'
        ELSE 'SECURITY_LAB_SUMMARY'
    END,
    CASE WHEN variant IN (3, 4) THEN 'security_lab' ELSE 'api' END,
    CASE variant
        WHEN 0 THEN 'medium'
        WHEN 1 THEN 'high'
        WHEN 2 THEN 'high'
        WHEN 3 THEN 'medium'
        ELSE 'critical'
    END,
    CASE variant
        WHEN 0 THEN 'detected'
        WHEN 1 THEN 'blocked'
        WHEN 2 THEN 'info'
        WHEN 3 THEN 'ok'
        ELSE 'breach'
    END,
    user_id,
    ('192.0.2.' || ((seed_no % 254) + 1))::inet,
    CASE variant
        WHEN 0 THEN 'POST'
        WHEN 3 THEN 'POST'
        ELSE 'GET'
    END,
    CASE variant
        WHEN 0 THEN '/api/v1/auth/login'
        WHEN 1 THEN '/api/v1/files'
        WHEN 2 THEN '/api/v1/admin/security-monitor'
        ELSE '/api/v1/security-lab/run'
    END,
    CASE variant
        WHEN 0 THEN 401
        WHEN 1 THEN 401
        WHEN 2 THEN 403
        WHEN 3 THEN 200
        ELSE 500
    END,
    CASE variant
        WHEN 0 THEN 'invalid_credentials'
        WHEN 1 THEN 'unauthorized'
        WHEN 2 THEN 'forbidden'
        WHEN 3 THEN ''
        ELSE 'security_lab_breach_simulation'
    END,
    CASE WHEN variant IN (3, 4) THEN 'proof' ELSE 'request' END,
    CASE variant
        WHEN 0 THEN 'login'
        WHEN 1 THEN 'authorization'
        WHEN 2 THEN 'authorization'
        WHEN 3 THEN 'verify_manifest'
        ELSE 'application_layer_compromise'
    END,
    CASE variant
        WHEN 0 THEN 'Login gagal terdeteksi'
        WHEN 1 THEN 'Request tanpa sesi diblokir'
        WHEN 2 THEN 'Akses tanpa izin ditolak'
        WHEN 3 THEN 'Security Lab berhasil diverifikasi'
        ELSE 'Simulasi kompromi aplikasi tercatat'
    END,
    CASE variant
        WHEN 0 THEN 'Kredensial tidak valid dicatat tanpa menyimpan rahasia.'
        WHEN 1 THEN 'Permintaan tanpa sesi aktif dihentikan oleh API.'
        WHEN 2 THEN 'Policy authorization menolak akses resource.'
        WHEN 3 THEN 'Bukti immutable berhasil dibaca dalam simulasi.'
        ELSE 'Event breach sintetis untuk menguji tampilan monitoring.'
    END,
    jsonb_build_object('seed', true, 'sequence', seed_no, 'scenario', 'full-fixture'),
    NOW() - (seed_no || ' minutes')::interval
FROM security_shape
ON CONFLICT (id) DO UPDATE SET
    run_id = EXCLUDED.run_id,
    event_type = EXCLUDED.event_type,
    source = EXCLUDED.source,
    severity = EXCLUDED.severity,
    outcome = EXCLUDED.outcome,
    user_id = EXCLUDED.user_id,
    client_ip = EXCLUDED.client_ip,
    method = EXCLUDED.method,
    path = EXCLUDED.path,
    status_code = EXCLUDED.status_code,
    error_code = EXCLUDED.error_code,
    phase = EXCLUDED.phase,
    step = EXCLUDED.step,
    title = EXCLUDED.title,
    detail = EXCLUDED.detail,
    details = EXCLUDED.details,
    occurred_at = EXCLUDED.occurred_at;

-- -------------------------------------------------------------------------
-- Password reset tokens: 500 unused and 500 used tokens.
-- -------------------------------------------------------------------------
INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, used_at, created_at)
SELECT
    md5('hashbox:full:reset-token:' || numbers.seed_no)::uuid,
    users.id_pengguna,
    encode(digest('hashbox:full:reset-token-value:' || numbers.seed_no, 'sha256'), 'hex'),
    CASE WHEN numbers.seed_no % 2 = 0 THEN NOW() - interval '1 day' ELSE NOW() + interval '7 days' END,
    CASE WHEN numbers.seed_no % 2 = 0 THEN NOW() - interval '12 hours' ELSE NULL::timestamp END,
    NOW() - (numbers.seed_no || ' hours')::interval
FROM generate_series(1, 1000) AS numbers(seed_no)
    JOIN _hashbox_seed_users AS users ON users.seed_no = ((numbers.seed_no - 1) % 1000) + 1
ON CONFLICT (id) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    token_hash = EXCLUDED.token_hash,
    expires_at = EXCLUDED.expires_at,
    used_at = EXCLUDED.used_at,
    created_at = EXCLUDED.created_at;

-- -------------------------------------------------------------------------
-- Manifest retirement requests: 500 pending and 500 completed requests for
-- old content that no longer has an application row.
-- -------------------------------------------------------------------------
INSERT INTO manifest_retirement_requests (
    manifest_id, status, attempts, available_at, last_error, created_at, completed_at
)
SELECT
    md5('hashbox:full:retired-manifest:' || seed_no),
    CASE WHEN seed_no <= 500 THEN 'pending' ELSE 'completed' END,
    CASE WHEN seed_no <= 500 THEN seed_no % 4 ELSE 1 + (seed_no % 4) END,
    CASE WHEN seed_no <= 500 THEN NOW() - interval '5 minutes' ELSE NOW() - interval '10 days' END,
    CASE WHEN seed_no <= 500 THEN '' ELSE '' END,
    NOW() - (seed_no || ' days')::interval,
    CASE WHEN seed_no <= 500 THEN NULL::timestamptz ELSE NOW() - interval '8 days' END
FROM generate_series(1, 1000) AS numbers(seed_no)
ON CONFLICT (manifest_id) DO UPDATE SET
    status = EXCLUDED.status,
    attempts = EXCLUDED.attempts,
    available_at = EXCLUDED.available_at,
    last_error = EXCLUDED.last_error,
    created_at = EXCLUDED.created_at,
    completed_at = EXCLUDED.completed_at;

-- Fail loudly if a future schema change accidentally drops a required fixture
-- section or changes one of the documented status distributions.
DO $$
DECLARE
    table_name text;
    table_count bigint;
    expected_status_count bigint;
BEGIN
    FOREACH table_name IN ARRAY ARRAY[
        'users', 'access_sessions', 'directories', 'directory_closure',
        'files', 'activity_logs', 'password_reset_tokens', 'security_events',
        'manifest_retirement_requests'
    ] LOOP
        EXECUTE format('SELECT COUNT(*) FROM %I', table_name) INTO table_count;
        IF table_count < 1000 THEN
            RAISE EXCEPTION 'full seed requires at least 1000 rows in %, found %', table_name, table_count;
        END IF;
    END LOOP;

    SELECT COUNT(*) INTO expected_status_count
    FROM files
    WHERE id_berkas IN (SELECT id_berkas FROM _hashbox_seed_files)
      AND status_penyimpanan = 'pending';
    IF expected_status_count <> 500 THEN
        RAISE EXCEPTION 'full seed expected 500 pending files, found %', expected_status_count;
    END IF;

    SELECT COUNT(*) INTO expected_status_count
    FROM files
    WHERE id_berkas IN (SELECT id_berkas FROM _hashbox_seed_files)
      AND status_penyimpanan = 'failed';
    IF expected_status_count <> 500 THEN
        RAISE EXCEPTION 'full seed expected 500 failed files, found %', expected_status_count;
    END IF;

    SELECT COUNT(*) INTO expected_status_count
    FROM security_events
    WHERE id IN (
        SELECT md5('hashbox:full:security-event:' || seed_no)::uuid
        FROM generate_series(1, 1000) AS numbers(seed_no)
    )
      AND outcome = 'detected';
    IF expected_status_count <> 200 THEN
        RAISE EXCEPTION 'full seed expected 200 detected security events, found %', expected_status_count;
    END IF;

    SELECT COUNT(*) INTO expected_status_count
    FROM security_events
    WHERE id IN (
        SELECT md5('hashbox:full:security-event:' || seed_no)::uuid
        FROM generate_series(1, 1000) AS numbers(seed_no)
    )
      AND outcome = 'blocked';
    IF expected_status_count <> 200 THEN
        RAISE EXCEPTION 'full seed expected 200 blocked security events, found %', expected_status_count;
    END IF;

    SELECT COUNT(*) INTO expected_status_count
    FROM security_events
    WHERE id IN (
        SELECT md5('hashbox:full:security-event:' || seed_no)::uuid
        FROM generate_series(1, 1000) AS numbers(seed_no)
    )
      AND outcome = 'info';
    IF expected_status_count <> 200 THEN
        RAISE EXCEPTION 'full seed expected 200 info security events, found %', expected_status_count;
    END IF;

    SELECT COUNT(*) INTO expected_status_count
    FROM security_events
    WHERE id IN (
        SELECT md5('hashbox:full:security-event:' || seed_no)::uuid
        FROM generate_series(1, 1000) AS numbers(seed_no)
    )
      AND outcome = 'ok';
    IF expected_status_count <> 200 THEN
        RAISE EXCEPTION 'full seed expected 200 ok security events, found %', expected_status_count;
    END IF;

    SELECT COUNT(*) INTO expected_status_count
    FROM security_events
    WHERE id IN (
        SELECT md5('hashbox:full:security-event:' || seed_no)::uuid
        FROM generate_series(1, 1000) AS numbers(seed_no)
    )
      AND outcome = 'breach';
    IF expected_status_count <> 200 THEN
        RAISE EXCEPTION 'full seed expected 200 breach security events, found %', expected_status_count;
    END IF;
END $$;

COMMIT;

-- Useful post-seed checks when this file is run interactively:
-- SELECT 'users' AS table_name, COUNT(*) FROM users;
-- SELECT status_penyimpanan, COUNT(*) FROM files GROUP BY status_penyimpanan ORDER BY status_penyimpanan;
-- SELECT outcome, COUNT(*) FROM security_events GROUP BY outcome ORDER BY outcome;

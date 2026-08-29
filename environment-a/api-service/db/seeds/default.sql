-- Default development seed.
-- Creates only the two accounts used by the local application walkthrough.
-- Safe to run repeatedly.

INSERT INTO users (nama, email, password_hash, peran)
VALUES (
    'Alfian Gading',
    'gading@gmail.com',
    crypt('password', gen_salt('bf')),
    'user'
)
ON CONFLICT (email) DO UPDATE
SET nama = EXCLUDED.nama,
    peran = EXCLUDED.peran;

INSERT INTO users (nama, email, password_hash, peran)
VALUES (
    'Admin HashBox',
    'admin@gmail.com',
    crypt('password', gen_salt('bf')),
    'admin'
)
ON CONFLICT (email) DO UPDATE
SET nama = EXCLUDED.nama,
    peran = EXCLUDED.peran;

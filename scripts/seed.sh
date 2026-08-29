#!/usr/bin/env sh
# scripts/seed.sh
# Dijalankan oleh service seeder di docker-compose.
# Mengecek apakah tabel users sudah terisi; jika belum, jalankan dev_admin.sql.
# Aman dijalankan berulang: hanya seed saat database benar-benar kosong.
set -eu

SEED_FILE="${SEED_FILE:-/seeds/dev_admin.sql}"

echo "seeder: memeriksa apakah database sudah ter-seed..."

COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d '[:space:]' || echo "error")

if [ "$COUNT" = "error" ]; then
  echo "seeder: tabel users belum ada, kemungkinan migrasi belum selesai."
  exit 1
fi

if [ "$COUNT" -gt "0" ]; then
  echo "seeder: database sudah terisi ($COUNT user), seed dilewati."
  exit 0
fi

echo "seeder: database kosong, menjalankan $SEED_FILE..."
psql "$DATABASE_URL" -f "$SEED_FILE"
echo "seeder: selesai."

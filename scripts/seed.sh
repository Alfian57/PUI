#!/usr/bin/env sh
# scripts/seed.sh
# Dijalankan oleh service seeder di docker-compose.
# Mode default hanya membuat dua akun bootstrap. Mode full membuat fixture
# development lengkap dan idempotent; gunakan hanya pada database lokal/demo.
set -eu

SEED_MODE="${SEED_MODE:-default}"

case "$SEED_MODE" in
  default)
    SEED_FILE="${SEED_FILE:-/seeds/default.sql}"
    ;;
  full)
    SEED_FILE="${SEED_FILE:-/seeds/full.sql}"
    ;;
  *)
    echo "seeder: SEED_MODE harus default atau full (diterima: $SEED_MODE)"
    exit 1
    ;;
esac

echo "seeder: memeriksa apakah database sudah ter-seed..."

COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d '[:space:]' || echo "error")

if [ "$COUNT" = "error" ]; then
  echo "seeder: tabel users belum ada, kemungkinan migrasi belum selesai."
  exit 1
fi

if [ "$SEED_MODE" = "default" ] && [ "$COUNT" -gt "0" ]; then
  echo "seeder: database sudah terisi ($COUNT user), seed dilewati."
  exit 0
fi

if [ "$SEED_MODE" = "full" ] && [ "$COUNT" -gt "0" ]; then
  echo "seeder: mode full dipilih; database memiliki $COUNT user, fixture tetap dijalankan secara idempotent."
else
  echo "seeder: database kosong, menjalankan $SEED_FILE..."
fi
psql --set ON_ERROR_STOP=1 "$DATABASE_URL" -f "$SEED_FILE"
echo "seeder: selesai."

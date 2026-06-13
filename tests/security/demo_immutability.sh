#!/bin/bash
# =============================================================================
#  demo_immutability.sh — HashBox Separation of Authority Demo
#
#  Struktur:
#    FASE 0  BEFORE   — rekam state awal nyata dari sistem
#    FASE 1  ATTACK A — serangan ke lapisan aplikasi (Postgres)
#    FASE 2  PROOF    — buktikan Vault Core tetap utuh
#    FASE 3  ATTACK B — serangan langsung ke UDS Vault Core
#    FASE 4  AFTER    — rekonstruksi & perbandingan byte-to-byte
#
#  Cara pakai (split-screen):
#    Kiri : bash tests/security/demo_immutability.sh
#    Kanan: docker compose logs -f vault-core
#
#  Prasyarat: make compose-up, jq, curl, docker
# =============================================================================

set -euo pipefail

# ── Warna ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GRN='\033[0;32m'
YEL='\033[0;33m'
BLU='\033[0;34m'
CYN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

BASE_URL="http://127.0.0.1:8080/api/v1"
UDS_SOCK="/var/run/pui/uds/vault-core.sock"
CONTAINER="pui-api-service"

# ── Helper ───────────────────────────────────────────────────────────────────
hr()     { echo -e "${BLU}${BOLD}──────────────────────────────────────────────────────────────${NC}"; }
header() { hr; echo -e "${BLU}${BOLD}  $1${NC}"; hr; }
ok()     { echo -e "  ${GRN}${BOLD}✔${NC}  $1"; }
fail()   { echo -e "  ${RED}${BOLD}✘${NC}  $1"; }
info()   { echo -e "  ${CYN}→${NC}  $1"; }
warn()   { echo -e "  ${YEL}⚠${NC}  $1"; }

assert_eq() {
    local label="$1" got="$2" want="$3"
    if [ "$got" = "$want" ]; then
        ok "$label: ${GRN}$got${NC}"
    else
        fail "$label: got=${RED}$got${NC} want=${GRN}$want${NC}"
        FAILURES=$((FAILURES + 1))
    fi
}

uds_curl() {
    docker exec "$CONTAINER" curl -s "$@" --unix-socket "$UDS_SOCK"
}

FAILURES=0
TMPDIR_DEMO=$(mktemp -d)
trap 'rm -rf "$TMPDIR_DEMO"' EXIT

# ── Preflight ─────────────────────────────────────────────────────────────────
clear
echo -e "${BOLD}"
echo "  ╔══════════════════════════════════════════════════════════════╗"
echo "  ║     HASHBOX — SEPARATION OF AUTHORITY DEMO                  ║"
echo "  ║     Immutable Vault Core vs. Compromised Application Layer  ║"
echo "  ╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo -e "  ${CYN}Panel kanan yang direkomendasikan:${NC}"
echo -e "  ${BOLD}  docker compose logs -f vault-core${NC}"
echo ""
echo -e "  Tekan ${BOLD}Enter${NC} untuk memulai demo..."
read -r

# Pastikan curl tersedia di container
docker exec -u 0 "$CONTAINER" which curl > /dev/null 2>&1 || \
    docker exec -u 0 "$CONTAINER" apk add --no-cache curl > /dev/null 2>&1

# =============================================================================
header "FASE 0 — BEFORE: Rekam State Awal Sistem"
# =============================================================================

info "Login ke HashBox..."
LOGIN_RESP=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"gading@gmail.com","password":"password"}')
TOKEN=$(echo "$LOGIN_RESP" | jq -r '.access_token')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    fail "Login gagal. Pastikan stack berjalan (make compose-up) dan user seed sudah ada."
    echo "  Response: $LOGIN_RESP"
    exit 1
fi
ok "Login berhasil. Token diterima."

info "Membuat file target dengan isi yang diketahui..."
FILE_CONTENT="DATA PENTING: HashBox Immutability Demo $(date '+%Y-%m-%d %H:%M:%S')"
TARGET_FILE="$TMPDIR_DEMO/target.txt"
echo "$FILE_CONTENT" > "$TARGET_FILE"
CONTENT_HASH=$(sha256sum "$TARGET_FILE" | cut -d' ' -f1)
ok "File target dibuat. SHA-256 lokal: ${GRN}$CONTENT_HASH${NC}"

info "Mengunggah file target ke HashBox..."
UPLOAD_RESP=$(curl -s -X POST "$BASE_URL/files" \
    -H "Authorization: Bearer $TOKEN" \
    -F "file=@$TARGET_FILE;filename=target_demo.txt")
FILE_ID=$(echo "$UPLOAD_RESP"   | jq -r '.file.id')
STATUS=$(echo "$UPLOAD_RESP"    | jq -r '.file.status_penyimpanan')

if [ -z "$FILE_ID" ] || [ "$FILE_ID" = "null" ]; then
    fail "Upload gagal."
    echo "  Response: $UPLOAD_RESP"
    exit 1
fi
ok "Upload berhasil. File ID: ${GRN}$FILE_ID${NC}"

info "Mengambil info manifest dari Vault Core (via API)..."
MANIFEST_RESP=$(curl -s "$BASE_URL/files/$FILE_ID/manifest" \
    -H "Authorization: Bearer $TOKEN")
MANIFEST_ID=$(echo "$MANIFEST_RESP"  | jq -r '.manifest.manifest_id')
FILE_HASH=$(echo "$MANIFEST_RESP"    | jq -r '.manifest.file_hash')
CHUNK_COUNT=$(echo "$MANIFEST_RESP"  | jq -r '.manifest.chunk_count')
IMMUTABLE=$(echo "$MANIFEST_RESP"    | jq -r '.manifest.immutable')

# Chunk hashes hanya tersedia via UDS langsung (ManifestInfoDTO tidak expose field ini)
MANIFEST_UDS_EARLY=$(uds_curl "http://unix/internal/v1/manifests/$MANIFEST_ID")
ALL_CHUNK_HASHES=$(echo "$MANIFEST_UDS_EARLY" | jq -r '.manifest_record.chunk_hashes[]? // empty' 2>/dev/null)
FIRST_CHUNK=$(echo "$MANIFEST_UDS_EARLY" | jq -r '.manifest_record.chunk_hashes[0]')

echo ""
echo -e "  ┌─ STATE AWAL (diambil dari sistem) ──────────────────────────┐"
echo -e "  │  File ID     : ${GRN}$FILE_ID${NC}"
echo -e "  │  Manifest ID : ${GRN}$MANIFEST_ID${NC}"
echo -e "  │  File Hash   : ${GRN}$FILE_HASH${NC}"
echo -e "  │  Chunk Count : ${GRN}$CHUNK_COUNT${NC}"
echo -e "  │  Immutable   : ${GRN}$IMMUTABLE${NC}"
echo -e "  └─────────────────────────────────────────────────────────────┘"

info "Verifikasi chunk fisik pertama via UDS Vault Core..."
CHUNK_STATUS=$(uds_curl "http://unix/internal/v1/chunks/$FIRST_CHUNK/status")
CHUNK_EXISTS=$(echo "$CHUNK_STATUS" | jq -r '.exists')
assert_eq "Chunk fisik ada di disk" "$CHUNK_EXISTS" "true"

info "Download file dan simpan isi awal untuk perbandingan nanti..."
curl -s "$BASE_URL/files/$FILE_ID/download" \
    -H "Authorization: Bearer $TOKEN" \
    -o "$TMPDIR_DEMO/original.txt"
ORIGINAL_HASH=$(sha256sum "$TMPDIR_DEMO/original.txt" | cut -d' ' -f1)
ok "Isi awal tersimpan. SHA-256 download: ${GRN}$ORIGINAL_HASH${NC}"

echo ""
echo -e "  Tekan ${BOLD}Enter${NC} untuk melanjutkan ke serangan..."
read -r

# =============================================================================
header "FASE 1 — ATTACK A: Serangan ke Lapisan Aplikasi (Postgres)"
# =============================================================================

warn "Skenario: Penyerang telah menguasai server aplikasi dan token JWT."
warn "Penyerang menghapus file dari database metadata (Postgres)."
echo ""

info "Langkah 1/2 — Soft delete file dari direktori aktif..."
SD_RESP=$(curl -s -X DELETE "$BASE_URL/files/$FILE_ID" \
    -H "Authorization: Bearer $TOKEN")
SD_STATUS=$(echo "$SD_RESP" | jq -r '.status')
echo "  Raw response: ${YEL}$SD_RESP${NC}"
assert_eq "Soft delete berhasil (metadata diubah)" "$SD_STATUS" "ok"

info "Langkah 2/2 — Hapus permanen metadata dari Postgres..."
PD_RESP=$(curl -s -X DELETE "$BASE_URL/files/$FILE_ID/permanent" \
    -H "Authorization: Bearer $TOKEN")
PD_STATUS=$(echo "$PD_RESP" | jq -r '.status')
echo "  Raw response: ${YEL}$PD_RESP${NC}"
assert_eq "Permanent delete berhasil (metadata Postgres TERHAPUS)" "$PD_STATUS" "ok"

info "Konfirmasi: coba ambil file via API (harus 404)..."
VERIFY_APP=$(curl -s -o /dev/null -w "%{http_code}" \
    "$BASE_URL/files/$FILE_ID" \
    -H "Authorization: Bearer $TOKEN")
assert_eq "File tidak ditemukan di database aplikasi" "$VERIFY_APP" "404"

echo ""
echo -e "  ${RED}${BOLD}⚠  SERANGAN LAPISAN APLIKASI BERHASIL${NC}"
echo -e "  ${RED}   Metadata file telah dihapus dari Postgres.${NC}"
echo -e "  ${RED}   File tidak bisa diakses melalui API normal.${NC}"
echo ""
echo -e "  Tekan ${BOLD}Enter${NC} untuk melihat kondisi Vault Core..."
read -r

# =============================================================================
header "FASE 2 — PROOF: Vault Core Tetap Utuh"
# =============================================================================

warn "Meskipun metadata aplikasi hilang, apakah data fisik di Vault Core aman?"
echo ""

info "Cek manifest via UDS langsung (bypass lapisan aplikasi)..."
MANIFEST_UDS=$(uds_curl "http://unix/internal/v1/manifests/$MANIFEST_ID")
MANIFEST_UDS_STATUS=$(echo "$MANIFEST_UDS" | jq -r '.status')
echo "  Raw UDS response:"
echo "$MANIFEST_UDS" | jq '.' | sed 's/^/    /'
assert_eq "Manifest masih ada di Vault Core" "$MANIFEST_UDS_STATUS" "ok"

info "Verifikasi ulang semua chunk fisik via UDS..."
ALL_CHUNKS=$(echo "$MANIFEST_UDS_EARLY" | jq -r '.manifest_record.chunk_hashes[]? // empty' 2>/dev/null)
CHUNK_NUM=0
while IFS= read -r hash; do
    [ -z "$hash" ] && continue
    CHUNK_NUM=$((CHUNK_NUM + 1))
    CS=$(uds_curl "http://unix/internal/v1/chunks/$hash/status")
    EXISTS=$(echo "$CS" | jq -r '.exists')
    assert_eq "Chunk $CHUNK_NUM ($( echo "$hash" | cut -c1-16)...) ada di disk" "$EXISTS" "true"
done <<< "$ALL_CHUNKS"

echo ""
echo -e "  ${GRN}${BOLD}✔  VAULT CORE TETAP UTUH${NC}"
echo -e "  ${GRN}   Semua $CHUNK_COUNT chunk fisik masih ada di disk.${NC}"
echo -e "  ${GRN}   Manifest immutable tetap terkunci di BadgerDB.${NC}"
echo ""
echo -e "  Tekan ${BOLD}Enter${NC} untuk serangan langsung ke UDS..."
read -r

# =============================================================================
header "FASE 3 — ATTACK B: Serangan Langsung ke UDS Vault Core"
# =============================================================================

warn "Skenario: Penyerang mencoba menyerang Vault Core langsung via Unix Domain Socket."
warn "Perhatikan panel kanan — log Vault Core akan menampilkan penolakan secara real-time."
echo ""

info "Serangan DELETE: mencoba hapus manifest via UDS..."
echo "  Command: curl -X DELETE http://unix/internal/v1/manifests/$MANIFEST_ID --unix-socket $UDS_SOCK"
DEL_RESP=$(uds_curl -X DELETE "http://unix/internal/v1/manifests/$MANIFEST_ID")
DEL_CODE=$(echo "$DEL_RESP" | jq -r '.error.code')
echo "  Raw UDS response:"
echo "$DEL_RESP" | jq '.' | sed 's/^/    /'
assert_eq "DELETE ditolak Vault Core" "$DEL_CODE" "operation_forbidden"

echo ""
info "Serangan PUT: mencoba timpa manifest via UDS..."
echo "  Command: curl -X PUT -d '{\"corrupted\":true}' http://unix/internal/v1/manifests/$MANIFEST_ID --unix-socket $UDS_SOCK"
PUT_RESP=$(uds_curl -X PUT \
    -H "Content-Type: application/json" \
    -d '{"corrupted":true}' \
    "http://unix/internal/v1/manifests/$MANIFEST_ID")
PUT_CODE=$(echo "$PUT_RESP" | jq -r '.error.code')
echo "  Raw UDS response:"
echo "$PUT_RESP" | jq '.' | sed 's/^/    /'
assert_eq "PUT ditolak Vault Core" "$PUT_CODE" "operation_forbidden"

echo ""
info "Serangan PATCH: mencoba modifikasi partial manifest via UDS..."
PATCH_RESP=$(uds_curl -X PATCH \
    -H "Content-Type: application/json" \
    -d '{"immutable":false}' \
    "http://unix/internal/v1/manifests/$MANIFEST_ID")
PATCH_CODE=$(echo "$PATCH_RESP" | jq -r '.error.code')
echo "  Raw UDS response:"
echo "$PATCH_RESP" | jq '.' | sed 's/^/    /'
assert_eq "PATCH ditolak Vault Core" "$PATCH_CODE" "operation_forbidden"

echo ""
echo -e "  ${GRN}${BOLD}🛡  SEMUA SERANGAN UDS DITOLAK${NC}"
echo -e "  ${GRN}   Lihat panel kanan — [SECURITY ACTION DENIED] dari Vault Core.${NC}"
echo ""
echo -e "  Tekan ${BOLD}Enter${NC} untuk rekonstruksi dan verifikasi akhir..."
read -r

# =============================================================================
header "FASE 4 — AFTER: Rekonstruksi & Verifikasi Byte-to-Byte"
# =============================================================================

info "Rekonstruksi objek langsung dari Vault Core via UDS (bypass API aplikasi)..."
docker exec "$CONTAINER" curl -s \
    --unix-socket "$UDS_SOCK" \
    "http://unix/internal/v1/objects/$MANIFEST_ID" \
    > "$TMPDIR_DEMO/reconstructed.txt"
RECONSTRUCTED_HASH=$(sha256sum "$TMPDIR_DEMO/reconstructed.txt" | cut -d' ' -f1)
ok "Rekonstruksi berhasil. SHA-256: ${GRN}$RECONSTRUCTED_HASH${NC}"

info "Perbandingan byte-to-byte: rekonstruksi vs file asli..."
if diff -q "$TMPDIR_DEMO/original.txt" "$TMPDIR_DEMO/reconstructed.txt" > /dev/null 2>&1; then
    ok "Isi file IDENTIK — data tidak berubah sedikit pun"
    DIFF_RESULT="PASS"
else
    fail "Isi file BERBEDA — data rusak"
    diff "$TMPDIR_DEMO/original.txt" "$TMPDIR_DEMO/reconstructed.txt"
    DIFF_RESULT="FAIL"
    FAILURES=$((FAILURES + 1))
fi

info "Verifikasi final: manifest di Vault Core pasca semua serangan..."
FINAL_MANIFEST=$(uds_curl "http://unix/internal/v1/manifests/$MANIFEST_ID")
FINAL_HASH=$(echo "$FINAL_MANIFEST"        | jq -r '.manifest_record.file_hash')
FINAL_CHUNKS=$(echo "$FINAL_MANIFEST"      | jq -r '.manifest_record.chunk_count')
FINAL_IMMUTABLE=$(echo "$FINAL_MANIFEST"   | jq -r '.manifest_record.immutable')

# =============================================================================
hr
echo -e "${BOLD}  RINGKASAN: BEFORE vs AFTER${NC}"
hr
echo ""
echo -e "  ┌────────────────────────┬───────────────────────────────────────┐"
echo -e "  │ Invariant              │ Hasil                                 │"
echo -e "  ├────────────────────────┼───────────────────────────────────────┤"

check_row() {
    local label="$1" before="$2" after="$3"
    # Truncate panjang nilai ke 37 karakter untuk tampilan tabel
    local display
    if [ ${#after} -gt 37 ]; then
        display="${after:0:34}..."
    else
        display="$after"
    fi
    if [ "$before" = "$after" ]; then
        printf "  │ %-22s │ ${GRN}✔${NC} %-37s │\n" "$label" "$display"
    else
        printf "  │ %-22s │ ${RED}✘${NC} %-37s │\n" "$label" "BERUBAH: ${after:0:29}"
        FAILURES=$((FAILURES + 1))
    fi
}

check_row "File Hash (BLAKE3)"    "$FILE_HASH"    "$FINAL_HASH"
check_row "Chunk Count"           "$CHUNK_COUNT"  "$FINAL_CHUNKS"
check_row "Immutable Flag"        "$IMMUTABLE"    "$FINAL_IMMUTABLE"
check_row "Rekonstruksi Konten"   "PASS"          "$DIFF_RESULT"

echo -e "  ├────────────────────────┼───────────────────────────────────────┤"

# Status metadata aplikasi
printf "  │ %-22s │ ${RED}✘${NC} %-37s │\n" "Metadata Postgres"  "TERHAPUS (serangan A berhasil)"
# Status Vault Core
printf "  │ %-22s │ ${GRN}✔${NC} %-37s │\n" "Vault Core Manifest" "UTUH (tidak dapat dihapus)"
printf "  │ %-22s │ ${GRN}✔${NC} %-37s │\n" "Chunk Fisik di Disk" "$CHUNK_COUNT chunk (tidak berubah)"

echo -e "  └────────────────────────┴───────────────────────────────────────┘"
echo ""

if [ "$FAILURES" -eq 0 ]; then
    echo -e "  ${GRN}${BOLD}✔  DEMO SELESAI — SEMUA INVARIANT TERJAGA${NC}"
    echo -e "  ${GRN}   Pemisahan otoritas (Separation of Authority) terbukti:${NC}"
    echo -e "  ${GRN}   Penguasaan lapisan aplikasi TIDAK memberikan akses ke${NC}"
    echo -e "  ${GRN}   penyimpanan fisik immutable di Vault Core.${NC}"
else
    echo -e "  ${RED}${BOLD}✘  $FAILURES assertion gagal — periksa output di atas${NC}"
fi
echo ""

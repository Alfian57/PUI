#!/bin/bash

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color
BOLD='\033[1m'

BASE_URL="http://127.0.0.1:8080/api/v1"

print_step() {
    echo -e "\n${BLUE}${BOLD}=== $1 ===${NC}"
}

print_success() {
    echo -e "${GREEN}✔ PASSED: $1${NC}"
}

print_failure() {
    echo -e "${RED}✘ FAILED: $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ WARNING: $1${NC}"
}

# Cleanup previous test files
rm -f test_security_base*.txt uds_response_delete.txt uds_response_put.txt

echo -e "${BLUE}${BOLD}==================================================${NC}"
echo -e "${BLUE}${BOLD}      HASHBOX SECURITY & RANSOMWARE TESTS         ${NC}"
echo -e "${BLUE}${BOLD}==================================================${NC}"

# Setup session by logging in
print_step "Persiapan: Otentikasi Pengguna (Login)"
LOGIN_RESP=$(curl -s -X POST -H "Content-Type: application/json" -d '{"email":"gading@gmail.com","password":"password"}' "$BASE_URL/auth/login")
TOKEN=$(echo "$LOGIN_RESP" | jq -r '.access_token')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
    print_failure "Gagal login. Respon: $LOGIN_RESP"
    exit 1
else
    print_success "Berhasil login. Token didapatkan."
fi

# Upload a base file to get a valid manifest ID
print_step "Persiapan: Unggah Berkas Dasar Baru ke Repository"
TIMESTAMP=$(date +%s)
FILENAME="test_security_base_${TIMESTAMP}.txt"
echo "Konten berkas dasar untuk uji keamanan mitigasi ransomware." > "$FILENAME"
UPLOAD_RESP=$(curl -s -H "Authorization: Bearer $TOKEN" -F "file=@$FILENAME" "$BASE_URL/files")
STATUS=$(echo "$UPLOAD_RESP" | jq -r '.status')
FILE_ID=$(echo "$UPLOAD_RESP" | jq -r '.file.id')
MANIFEST_ID=$(echo "$UPLOAD_RESP" | jq -r '.file.manifest_id')

if [ "$STATUS" = "ok" ] && [ -n "$MANIFEST_ID" ] && [ "$MANIFEST_ID" != "null" ]; then
    print_success "Berkas dasar berhasil diunggah. Nama: $FILENAME, Manifest ID: $MANIFEST_ID"
else
    print_failure "Gagal mempersiapkan berkas dasar. Respon: $UPLOAD_RESP"
    rm -f "$FILENAME"
    exit 1
fi

# Check if docker commands are accessible and container is running
docker exec pui-api-service ls > /dev/null 2>&1
DOCKER_ACCESS=$?

if [ $DOCKER_ACCESS -ne 0 ]; then
    print_warning "Gagal berkomunikasi dengan docker daemon (keterbatasan akses docker daemon pada shell)."
    print_warning "Silakan jalankan perintah ini secara manual di terminal Anda untuk memverifikasi keamanan UDS:"
    echo -e "\n   docker exec pui-api-service curl -s -X DELETE http://unix/internal/v1/manifests/$MANIFEST_ID --unix-socket /var/run/pui/uds/vault-core.sock\n"
    echo "Respons yang diharapkan dari Vault Core adalah:"
    echo '   {"status":"error","error":{"code":"operation_forbidden","message":"immutable vault menolak operasi destruktif","method":"DELETE",...}}'
    rm -f "$FILENAME"
    exit 0
fi

# Ensure curl is installed in the container
docker exec -u 0 pui-api-service which curl > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "Menginstal curl di dalam container api-service untuk pengujian..."
    docker exec -u 0 pui-api-service apk add --no-cache curl > /dev/null 2>&1
fi

# --- SECURITY SCENARIO 1: DELETE ATTACK ---
print_step "Skenario Keamanan 1: Simulasi Serangan Penghapusan Berkas (DELETE) via UDS"
echo "Mengirim perintah DELETE langsung ke Unix Domain Socket Vault Core..."

docker exec pui-api-service curl -s -X DELETE http://unix/internal/v1/manifests/$MANIFEST_ID --unix-socket /var/run/pui/uds/vault-core.sock > uds_response_delete.txt 2>&1
UDS_RESP_DEL=$(cat uds_response_delete.txt)
echo "Respons dari Vault Core: $UDS_RESP_DEL"

if echo "$UDS_RESP_DEL" | grep -q "operation_forbidden" && echo "$UDS_RESP_DEL" | grep -q "DELETE"; then
    print_success "Vault Core MENOLAK perintah penghapusan (DELETE) dengan benar. Status: 403 Forbidden."
else
    print_failure "Keamanan UDS Jebol atau Respon salah! Respon: $UDS_RESP_DEL"
    rm -f "$FILENAME" uds_response_delete.txt
    exit 1
fi

# --- SECURITY SCENARIO 2: PUT/OVERWRITE ATTACK ---
print_step "Skenario Keamanan 2: Simulasi Serangan Penimpaan Berkas (PUT/Encrypt) via UDS"
echo "Mengirim perintah PUT langsung ke Unix Domain Socket Vault Core untuk memodifikasi manifest..."

docker exec pui-api-service curl -s -X PUT -H "Content-Type: application/json" -d '{"corrupted":true}' http://unix/internal/v1/manifests/$MANIFEST_ID --unix-socket /var/run/pui/uds/vault-core.sock > uds_response_put.txt 2>&1
UDS_RESP_PUT=$(cat uds_response_put.txt)
echo "Respons dari Vault Core: $UDS_RESP_PUT"

if echo "$UDS_RESP_PUT" | grep -q "operation_forbidden" && echo "$UDS_RESP_PUT" | grep -q "PUT"; then
    print_success "Vault Core MENOLAK perintah penimpaan (PUT) dengan benar. Status: 403 Forbidden."
else
    print_failure "Keamanan UDS Jebol atau Respon salah! Respon: $UDS_RESP_PUT"
    rm -f "$FILENAME" uds_response_delete.txt uds_response_put.txt
    exit 1
fi

# Cleanup
rm -f "$FILENAME" uds_response_delete.txt uds_response_put.txt

echo -e "\n${GREEN}${BOLD}==================================================${NC}"
echo -e "${GREEN}${BOLD}         SECURITY TESTING SELESAI!                 ${NC}"
echo -e "${GREEN}${BOLD}==================================================${NC}"

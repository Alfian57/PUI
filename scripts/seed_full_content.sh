#!/usr/bin/env bash
# Generate and upload deterministic fixture files for the PostgreSQL full seed.
# The files are temporary: their durable content is written by Vault Core.

set -euo pipefail

API_BASE_URL="${HASHBOX_API_BASE_URL:-http://127.0.0.1:8080/api/v1}"
SEED_EMAIL="${HASHBOX_SEED_EMAIL:-gading@gmail.com}"
SEED_PASSWORD="${HASHBOX_SEED_PASSWORD:-password}"
SEED_FILE_COUNT="${HASHBOX_SEED_FILE_COUNT:-500}"
SEED_DELAY_SECONDS="${HASHBOX_SEED_DELAY_SECONDS:-0.6}"
SEED_TEMP_ROOT="${HASHBOX_SEED_TEMP_ROOT:-${TMPDIR:-/tmp}}"
SEED_PDF_FIXTURE_URL="${HASHBOX_SEED_PDF_FIXTURE_URL:-https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf}"
SEED_VIDEO_FIXTURE_URL="${HASHBOX_SEED_VIDEO_FIXTURE_URL:-https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4}"
SEED_REPAIR_INVALID_MEDIA="${HASHBOX_SEED_REPAIR_INVALID_MEDIA:-false}"

case "$SEED_FILE_COUNT" in
    ''|*[!0-9]*|0)
        echo "seed content: HASHBOX_SEED_FILE_COUNT harus berupa angka positif" >&2
        exit 1
        ;;
esac

for dependency in curl jq base64 grep head mktemp seq tr wc; do
    command -v "$dependency" >/dev/null || {
        echo "seed content: $dependency wajib terpasang" >&2
        exit 1
        }
done

TEMP_DIR="$(mktemp -d "$SEED_TEMP_ROOT/hashbox-seed-files.XXXXXX")"
trap 'rm -rf "$TEMP_DIR"' EXIT
PDF_FIXTURE_PATH="$TEMP_DIR/seed-fixture.pdf"
VIDEO_FIXTURE_PATH="$TEMP_DIR/seed-fixture.mp4"

download_fixture() {
    local url="$1"
    local output_path="$2"
    local label="$3"

    echo "seed content: downloading valid $label fixture..."
    curl --silent --show-error --fail --location --retry 3 \
        --output "$output_path" "$url"
}

ensure_pdf_fixture() {
    if [ ! -s "$PDF_FIXTURE_PATH" ]; then
        download_fixture "$SEED_PDF_FIXTURE_URL" "$PDF_FIXTURE_PATH" "PDF"
    fi

    if [ "$(head -c 5 "$PDF_FIXTURE_PATH")" != '%PDF-' ]; then
        echo "seed content: downloaded PDF fixture is not a PDF" >&2
        return 1
    fi
}

ensure_video_fixture() {
    if [ ! -s "$VIDEO_FIXTURE_PATH" ]; then
        download_fixture "$SEED_VIDEO_FIXTURE_URL" "$VIDEO_FIXTURE_PATH" "MP4 video"
    fi

    if ! grep -a -m 1 -q 'ftyp' "$VIDEO_FIXTURE_PATH"; then
        echo "seed content: downloaded video fixture is not an MP4 container" >&2
        return 1
    fi
}

fixture_size() {
    wc -c <"$1" | tr -d '[:space:]'
}

create_dummy_file() {
    local output_path="$1"
    local sequence="$2"
    local mime_type="$3"

    case "$mime_type" in
        application/pdf)
            ensure_pdf_fixture
            cp "$PDF_FIXTURE_PATH" "$output_path"
            ;;
        image/png)
            printf '%s' 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=' | base64 -d >"$output_path"
            ;;
        text/plain)
            {
                printf 'HashBox dummy text fixture\nsequence=%s\n' "$sequence"
                printf 'This file is generated locally for development and testing only.\n'
                printf 'The content is intentionally synthetic and contains no user data.\n'
            } >"$output_path"
            ;;
        application/zip)
            # Valid empty ZIP archive; identical bytes intentionally exercise deduplication.
            printf '%s' 'UEsFBgAAAAAAAAAAAAAAAAAAAAAAAA==' | base64 -d >"$output_path"
            ;;
        text/csv)
            {
                printf 'sequence,kind,value\n'
                for row in $(seq 1 48); do
                    printf '%s,fixture,row-%s\n' "$sequence" "$row"
                done
            } >"$output_path"
            ;;
        video/mp4)
            ensure_video_fixture
            cp "$VIDEO_FIXTURE_PATH" "$output_path"
            ;;
        *)
            echo "seed content: MIME fixture tidak dikenal: $mime_type" >&2
            return 1
            ;;
    esac
}

repair_existing_media_fixture() {
    local token="$1"
    local file_id="$2"
    local file_name="$3"
    local deleted_at="$4"

    if [ "$SEED_REPAIR_INVALID_MEDIA" != 'true' ]; then
        echo "seed content: $file_name is an invalid old media fixture; set HASHBOX_SEED_REPAIR_INVALID_MEDIA=true to replace it" >&2
        return 1
    fi

    echo "seed content: replacing invalid media fixture $file_name"
    if [ "$deleted_at" = 'null' ] || [ -z "$deleted_at" ]; then
        api_delete "$token" "/files/$file_id"
    fi
    api_delete "$token" "/files/$file_id/permanent"
}

api_delete() {
    local token="$1"
    local path="$2"
    local attempt=1
    local http_code=''

    while :; do
        http_code="$(curl --silent --show-error \
            -o /dev/null \
            -w '%{http_code}' \
            --request DELETE \
            -H "Authorization: Bearer $token" \
            "$API_BASE_URL$path" || true)"
        case "$http_code" in
            2??)
                return 0
                ;;
            429)
                if [ "$attempt" -ge 6 ]; then
                    echo "seed content: DELETE $path gagal (HTTP $http_code)" >&2
                    return 1
                fi
                sleep "$((attempt * 2))"
                attempt=$((attempt + 1))
                ;;
            *)
                echo "seed content: DELETE $path gagal (HTTP $http_code)" >&2
                return 1
                ;;
        esac
    done
}

fixture_properties() {
    local sequence="$1"
    case $((sequence % 6)) in
        0) printf 'application/pdf pdf\n' ;;
        1) printf 'image/png png\n' ;;
        2) printf 'text/plain txt\n' ;;
        3) printf 'application/zip zip\n' ;;
        4) printf 'text/csv csv\n' ;;
        *) printf 'video/mp4 mp4\n' ;;
    esac
}

api_get() {
    local token="$1"
    local path="$2"
    local output_path="$3"
    curl --silent --show-error --fail \
        -H "Authorization: Bearer $token" \
        "$API_BASE_URL$path" >"$output_path"
}

load_existing_files() {
    local token="$1"
    local offset=0
    local total=0
    local response_path="$TEMP_DIR/list-response.json"
    local page_path="$TEMP_DIR/list-page.json"
    local merged_path="$TEMP_DIR/existing-files-next.json"

    printf '[]' >"$TEMP_DIR/existing-files.json"
    while :; do
        api_get "$token" "/files?include_deleted=true&limit=200&offset=$offset" "$response_path"
        total="$(jq -r '.total // 0' "$response_path")"
        jq -c '.files // []' "$response_path" >"$page_path"
        jq -s '.[0] + .[1]' "$TEMP_DIR/existing-files.json" "$page_path" >"$merged_path"
        mv "$merged_path" "$TEMP_DIR/existing-files.json"

        offset=$((offset + 200))
        if [ "$offset" -ge "$total" ]; then
            break
        fi
    done
}

login_response="$TEMP_DIR/login-response.json"
curl --silent --show-error --fail \
    -H 'Content-Type: application/json' \
    -d "$(jq -cn --arg email "$SEED_EMAIL" --arg password "$SEED_PASSWORD" '{email: $email, password: $password}')" \
    "$API_BASE_URL/auth/login" >"$login_response"
TOKEN="$(jq -r '.access_token // empty' "$login_response")"
if [ -z "$TOKEN" ]; then
    echo "seed content: login akun seed gagal" >&2
    exit 1
fi

load_existing_files "$TOKEN"

uploaded=0
skipped=0
echo "seed content: memastikan $SEED_FILE_COUNT fixture files committed melalui Vault Core..."

for sequence in $(seq 1 "$SEED_FILE_COUNT"); do
    read -r mime_type extension < <(fixture_properties "$sequence")
    file_name="seed-content-$(printf '%04d' "$sequence").$extension"
    if jq -e --arg name "$file_name" 'any(.[]; .name == $name)' "$TEMP_DIR/existing-files.json" >/dev/null; then
        existing_fixture="$(jq -c --arg name "$file_name" 'first(.[] | select(.name == $name))' "$TEMP_DIR/existing-files.json")"
        existing_status="$(jq -r '.status_penyimpanan // empty' <<<"$existing_fixture")"
        existing_size="$(jq -r '.size_bytes // 0' <<<"$existing_fixture")"
        existing_id="$(jq -r '.id // empty' <<<"$existing_fixture")"
        existing_deleted_at="$(jq -r 'if .deleted_at == null then "null" else .deleted_at end' <<<"$existing_fixture")"
        expected_size=''

        case "$mime_type" in
            application/pdf)
                ensure_pdf_fixture
                expected_size="$(fixture_size "$PDF_FIXTURE_PATH")"
                ;;
            video/mp4)
                ensure_video_fixture
                expected_size="$(fixture_size "$VIDEO_FIXTURE_PATH")"
                ;;
        esac

        if [ -n "$expected_size" ] \
            && [ "$existing_status" = 'committed' ] \
            && [ "$existing_size" != "$expected_size" ]; then
            repair_existing_media_fixture "$TOKEN" "$existing_id" "$file_name" "$existing_deleted_at"
            jq --arg name "$file_name" '[.[] | select(.name != $name)]' "$TEMP_DIR/existing-files.json" >"$TEMP_DIR/existing-files-next.json"
            mv "$TEMP_DIR/existing-files-next.json" "$TEMP_DIR/existing-files.json"
        else
            skipped=$((skipped + 1))
            continue
        fi
    fi

    file_path="$TEMP_DIR/$file_name"
    create_dummy_file "$file_path" "$sequence" "$mime_type"
    response_path="$TEMP_DIR/upload-response.json"
    upload_attempt=1
    while :; do
        http_code="$(curl --silent --show-error \
            -o "$response_path" \
            -w '%{http_code}' \
            -H "Authorization: Bearer $TOKEN" \
            -F "file=@$file_path;filename=$file_name;type=$mime_type" \
            "$API_BASE_URL/files" || true)"
        if [ "$http_code" != '429' ] || [ "$upload_attempt" -ge 6 ]; then
            break
        fi
        sleep "$((upload_attempt * 2))"
        upload_attempt=$((upload_attempt + 1))
    done

    if [ "$http_code" != '201' ]; then
        error_detail="$(jq -c 'if type == "object" then {status, code, error, message} else . end' "$response_path" 2>/dev/null || true)"
        echo "seed content: upload $file_name gagal (HTTP $http_code): $error_detail" >&2
        exit 1
    fi

    storage_status="$(jq -r '.file.status_penyimpanan // empty' "$response_path")"
    manifest_id="$(jq -r '.file.manifest_id // empty' "$response_path")"
    if [ "$storage_status" != 'committed' ] || [ -z "$manifest_id" ]; then
        echo "seed content: respons upload $file_name tidak committed" >&2
        exit 1
    fi

    uploaded=$((uploaded + 1))
    if [ "$sequence" -lt "$SEED_FILE_COUNT" ]; then
        sleep "$SEED_DELAY_SECONDS"
    fi
done

echo "seed content: selesai (uploaded=$uploaded, skipped=$skipped, total=$((uploaded + skipped)))."

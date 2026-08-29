#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/docker-compose.yml"
ROOT_TEMPLATE="$ROOT_DIR/.env.example"
API_TEMPLATE="$ROOT_DIR/environment-a/api-service/.env.example"
WEB_TEMPLATE="$ROOT_DIR/environment-a/web-client/.env.example"
VAULT_TEMPLATE="$ROOT_DIR/environment-b/vault-core/.env.example"

errors=()
warnings=()

record_error() {
    errors+=("$1")
}

record_warning() {
    warnings+=("$1")
}

has_key() {
    local file="$1"
    local key="$2"
    awk -F= -v wanted="$key" '
        $1 == wanted { found = 1; exit }
        END { exit(found ? 0 : 1) }
    ' "$file"
}

has_required_compose_ref() {
    local key="$1"
    awk -v wanted="$key" '
        index($0, "${" wanted ":?") > 0 { found = 1; exit }
        END { exit(found ? 0 : 1) }
    ' "$COMPOSE_FILE"
}

value_for() {
    local file="$1"
    local key="$2"
    awk -v wanted="$key" '
        index($0, "=") > 0 {
            name = substr($0, 1, index($0, "=") - 1)
            if (name == wanted) {
                value = substr($0, index($0, "=") + 1)
                sub(/\r$/, "", value)
                print value
                exit
            }
        }
    ' "$file"
}

compare_defaults() {
    local left_file="$1"
    local left_key="$2"
    local right_file="$3"
    local right_key="$4"

    if [[ ! -f "$left_file" || ! -f "$right_file" ]]; then
        return
    fi

    local left_value right_value
    left_value="$(value_for "$left_file" "$left_key")"
    right_value="$(value_for "$right_file" "$right_key")"
    if [[ "$left_value" != "$right_value" ]]; then
        record_error "default drift: ${left_file#"$ROOT_DIR/"}:$left_key != ${right_file#"$ROOT_DIR/"}:$right_key"
    fi
}

require_file() {
    local file="$1"
    if [[ ! -f "$file" ]]; then
        record_error "missing required template: ${file#"$ROOT_DIR/"}"
    fi
}

require_keys() {
    local file="$1"
    shift
    for key in "$@"; do
        if [[ -f "$file" ]] && ! has_key "$file" "$key"; then
            record_error "${file#"$ROOT_DIR/"} missing documented key: $key"
        fi
    done
}

check_forbidden_keys() {
    local file="$1"
    shift
    for key in "$@"; do
        if [[ -f "$file" ]] && has_key "$file" "$key"; then
            record_error "${file#"$ROOT_DIR/"} must keep internal setting in config/Compose: $key"
        fi
    done
}

for file in "$ROOT_TEMPLATE" "$API_TEMPLATE" "$WEB_TEMPLATE" "$VAULT_TEMPLATE"; do
    require_file "$file"
done

require_keys "$ROOT_TEMPLATE" \
    WEB_PORT API_PORT VITE_API_BASE_URL VITE_SECURITY_LAB_ENABLED \
    POSTGRES_DB POSTGRES_USER POSTGRES_PASSWORD API_DATABASE_URL \
    API_ALLOWED_ORIGIN TRUSTED_PROXIES MAX_UPLOAD_SIZE_BYTES \
    RATE_LIMIT_PER_MINUTE SESSION_TTL_MINUTES SECURITY_LAB_ENABLED \
    API_PUBLIC_WEB_URL API_PASSWORD_RESET_TTL_MINUTES \
    API_SMTP_HOST API_SMTP_PORT API_SMTP_USERNAME API_SMTP_PASSWORD \
    API_SMTP_FROM_EMAIL API_SMTP_FROM_NAME \
    FASTCDC_MIN_CHUNK_SIZE FASTCDC_AVG_CHUNK_SIZE FASTCDC_MAX_CHUNK_SIZE \
    STRICT_DOWNLOAD_VERIFY STRICT_VERIFY_MAX_BYTES \
    PGADMIN_DEFAULT_EMAIL PGADMIN_DEFAULT_PASSWORD

require_keys "$API_TEMPLATE" \
    HTTP_ADDR ALLOWED_ORIGIN TRUSTED_PROXIES DATABASE_URL \
    MAX_UPLOAD_SIZE_BYTES RATE_LIMIT_PER_MINUTE SESSION_TTL_MINUTES \
    SECURITY_LAB_ENABLED PUBLIC_WEB_URL PASSWORD_RESET_TTL_MINUTES \
    SMTP_HOST SMTP_PORT SMTP_USERNAME SMTP_PASSWORD SMTP_FROM_EMAIL SMTP_FROM_NAME

require_keys "$WEB_TEMPLATE" VITE_API_BASE_URL VITE_SECURITY_LAB_ENABLED
require_keys "$VAULT_TEMPLATE" \
    FASTCDC_MIN_CHUNK_SIZE FASTCDC_AVG_CHUNK_SIZE FASTCDC_MAX_CHUNK_SIZE \
    STRICT_DOWNLOAD_VERIFY STRICT_VERIFY_MAX_BYTES

# These are developer-facing examples that intentionally share defaults across
# execution modes. Database URLs and internal paths remain mode-specific.
compare_defaults "$ROOT_TEMPLATE" VITE_API_BASE_URL "$WEB_TEMPLATE" VITE_API_BASE_URL
compare_defaults "$ROOT_TEMPLATE" VITE_SECURITY_LAB_ENABLED "$WEB_TEMPLATE" VITE_SECURITY_LAB_ENABLED
compare_defaults "$ROOT_TEMPLATE" API_ALLOWED_ORIGIN "$API_TEMPLATE" ALLOWED_ORIGIN
compare_defaults "$ROOT_TEMPLATE" TRUSTED_PROXIES "$API_TEMPLATE" TRUSTED_PROXIES
compare_defaults "$ROOT_TEMPLATE" MAX_UPLOAD_SIZE_BYTES "$API_TEMPLATE" MAX_UPLOAD_SIZE_BYTES
compare_defaults "$ROOT_TEMPLATE" RATE_LIMIT_PER_MINUTE "$API_TEMPLATE" RATE_LIMIT_PER_MINUTE
compare_defaults "$ROOT_TEMPLATE" SESSION_TTL_MINUTES "$API_TEMPLATE" SESSION_TTL_MINUTES
compare_defaults "$ROOT_TEMPLATE" SECURITY_LAB_ENABLED "$API_TEMPLATE" SECURITY_LAB_ENABLED
compare_defaults "$ROOT_TEMPLATE" API_PUBLIC_WEB_URL "$API_TEMPLATE" PUBLIC_WEB_URL
compare_defaults "$ROOT_TEMPLATE" API_PASSWORD_RESET_TTL_MINUTES "$API_TEMPLATE" PASSWORD_RESET_TTL_MINUTES
compare_defaults "$ROOT_TEMPLATE" API_SMTP_HOST "$API_TEMPLATE" SMTP_HOST
compare_defaults "$ROOT_TEMPLATE" API_SMTP_PORT "$API_TEMPLATE" SMTP_PORT
compare_defaults "$ROOT_TEMPLATE" API_SMTP_USERNAME "$API_TEMPLATE" SMTP_USERNAME
compare_defaults "$ROOT_TEMPLATE" API_SMTP_PASSWORD "$API_TEMPLATE" SMTP_PASSWORD
compare_defaults "$ROOT_TEMPLATE" API_SMTP_FROM_EMAIL "$API_TEMPLATE" SMTP_FROM_EMAIL
compare_defaults "$ROOT_TEMPLATE" API_SMTP_FROM_NAME "$API_TEMPLATE" SMTP_FROM_NAME
compare_defaults "$ROOT_TEMPLATE" FASTCDC_MIN_CHUNK_SIZE "$VAULT_TEMPLATE" FASTCDC_MIN_CHUNK_SIZE
compare_defaults "$ROOT_TEMPLATE" FASTCDC_AVG_CHUNK_SIZE "$VAULT_TEMPLATE" FASTCDC_AVG_CHUNK_SIZE
compare_defaults "$ROOT_TEMPLATE" FASTCDC_MAX_CHUNK_SIZE "$VAULT_TEMPLATE" FASTCDC_MAX_CHUNK_SIZE
compare_defaults "$ROOT_TEMPLATE" STRICT_DOWNLOAD_VERIFY "$VAULT_TEMPLATE" STRICT_DOWNLOAD_VERIFY
compare_defaults "$ROOT_TEMPLATE" STRICT_VERIFY_MAX_BYTES "$VAULT_TEMPLATE" STRICT_VERIFY_MAX_BYTES

compose_refs="$({
    grep -oE '\$\{[A-Z][A-Z0-9_]*' "$COMPOSE_FILE" || true
} | sed 's/^\${//' | sort -u)"
while IFS= read -r key; do
    [[ -z "$key" ]] && continue
    if ! has_key "$ROOT_TEMPLATE" "$key"; then
        record_error ".env.example missing Compose override key: $key"
    fi
done <<< "$compose_refs"

for key in API_DATABASE_URL POSTGRES_DB POSTGRES_USER POSTGRES_PASSWORD; do
    if ! has_required_compose_ref "$key"; then
        record_error "Compose must require environment key: $key"
    fi
done

config_only_keys=(
    COMPOSE_PROJECT_NAME APP_NAME APP_ENV VITE_ENVIRONMENT_NAME
    VAULT_UDS_PATH API_MIGRATIONS_PATH MIGRATIONS_PATH
    SECURITY_EVENTS_UDS_PATH SECURITY_EVENTS_ALLOWED_UIDS
    UDS_PATH BADGER_PATH CHUNK_ROOT UDS_OWNER_UID UDS_OWNER_GID UDS_ALLOWED_UIDS
)

for template in "$ROOT_TEMPLATE" "$API_TEMPLATE" "$WEB_TEMPLATE" "$VAULT_TEMPLATE"; do
    check_forbidden_keys "$template" "${config_only_keys[@]}"
done

# Existing ignored root env files are user-managed. Report only keys that the
# root Compose file no longer consumes; values are never printed or modified.
root_retired_keys=(
    COMPOSE_PROJECT_NAME APP_NAME APP_ENV API_HTTP_ADDR VITE_ENVIRONMENT_NAME
    VAULT_UDS_PATH API_MIGRATIONS_PATH MIGRATIONS_PATH
    SECURITY_EVENTS_UDS_PATH SECURITY_EVENTS_ALLOWED_UIDS
    UDS_PATH BADGER_PATH CHUNK_ROOT UDS_OWNER_UID UDS_OWNER_GID UDS_ALLOWED_UIDS
)

if [[ -f "$ROOT_DIR/.env" ]]; then
    for key in "${root_retired_keys[@]}"; do
        if has_key "$ROOT_DIR/.env" "$key"; then
            record_warning ".env contains no-longer-consumed root override: $key"
        fi
    done
fi

if (( ${#errors[@]} > 0 )); then
    printf 'Environment configuration check failed:\n' >&2
    printf ' - %s\n' "${errors[@]}" >&2
    exit 1
fi

if (( ${#warnings[@]} > 0 )); then
    printf 'Environment configuration warnings:\n' >&2
    printf ' - %s\n' "${warnings[@]}" >&2
fi

echo "Environment templates document important overrides and internal defaults remain centralized."

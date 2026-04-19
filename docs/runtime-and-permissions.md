# Runtime and Permission Notes

## Runtime Versions

- Go: 1.21
- Node.js: 20+
- PostgreSQL: 16 (docker image `postgres:16-alpine`)
- BadgerDB: v4

## Mandatory Environment Paths

- VAULT_UDS_PATH: `/var/run/pui/uds/vault-core.sock`
- BADGER_PATH: `/var/lib/pui/badger`
- CHUNK_ROOT: `/var/lib/pui/chunks`
- UDS_OWNER_UID: `10002` (vault runtime identity)
- UDS_OWNER_GID: `20000` (shared UDS group)
- UDS_ALLOWED_UIDS: `10001` (API runtime identity allowlist)

## Process Ownership Model

Recommended OS users for production-like setup:

- `pui-api` for API Service
- `pui-vault` for Vault Core

## Filesystem Permission Targets

- UDS directory (`/var/run/pui/uds`): mode `0750` (owner can manage, group can traverse/connect)
- UDS socket (`vault-core.sock`): mode `0660`
- Chunk root (`/var/lib/pui/chunks`): mode `0750`
- Badger path (`/var/lib/pui/badger`): mode `0750`

## Security Boundary

- API Service must not have direct filesystem access to chunk payload files.
- API Service must not access BadgerDB storage path directly.
- Vault Core validates Linux peer credentials (`SO_PEERCRED`) and only accepts allowed API UID(s).
- Vault Core rejects destructive UDS operations (`DELETE`, `PUT`, `PATCH`) with `operation_forbidden`.

## Development Defaults

- Compose in this repository is for local development and demonstration, not final production hardening.
- PostgreSQL is kept internal-only (not published to host) by default.
- The default admin bootstrap was removed from schema migration; use `environment-a/api-service/db/seeds/dev_admin.sql` only for local setup when needed.

## Claim Boundaries

- Current immutability guarantee applies to committed chunk payload files and committed manifest objects.
- Chunk metadata fields (for example reference counters) are still mutable operational metadata, so this is not absolute full-metadata WORM.

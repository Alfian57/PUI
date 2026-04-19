# Local Backup Procedure

## PostgreSQL Backup

1. Create dump:
   - `docker exec pui-postgres pg_dump -U pui -d pui > backup-postgres.sql`
2. Verify file size is non-zero.
3. Store with timestamp in an external location.

## Vault Snapshot

1. Stop write traffic temporarily (or stop API + Vault containers).
2. Archive BadgerDB and chunk directories:
   - `tar -czf backup-vault-$(date +%Y%m%d-%H%M%S).tar.gz data/vault/badger data/vault/chunks`
3. Record hash of archive for integrity:
   - `sha256sum backup-vault-*.tar.gz`

## Restore Notes

- Restore PostgreSQL from `backup-postgres.sql` before bringing API online.
- Restore Vault directories (`badger`, `chunks`) together to keep metadata/data consistency.
- Ensure ownership and permissions match deployment notes before starting services.

# Full-seed file fixtures

The full seed generates its dummy files on demand in a temporary directory via
[`scripts/seed_full_content.sh`](../../../../scripts/seed_full_content.sh). It
does not commit hundreds of duplicate binaries to the repository.

The generator cycles through these MIME variants:

- `application/pdf`
- `image/png`
- `text/plain`
- `application/zip`
- `text/csv`
- `video/mp4`

The generated files are uploaded through API Service, so Vault Core creates the
real manifest and chunk records. Temporary host files are removed after each
run.

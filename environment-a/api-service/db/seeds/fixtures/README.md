# Full-seed file fixtures

The full seed generates its fixture files on demand in a temporary directory via
[`scripts/seed_full_content.sh`](../../../../scripts/seed_full_content.sh). It
does not commit hundreds of duplicate binaries to the repository.

The generator cycles through these MIME variants:

- `application/pdf` (downloaded from the W3C PDF test fixture)
- `image/png`
- `text/plain`
- `application/zip`
- `text/csv`
- `video/mp4` (downloaded from the MDN CC0 flower video fixture)

The generated files are uploaded through API Service, so Vault Core creates the
real manifest and chunk records. Temporary host files are removed after each
run. The PDF and MP4 URLs can be overridden with
`HASHBOX_SEED_PDF_FIXTURE_URL` and `HASHBOX_SEED_VIDEO_FIXTURE_URL`.

Sources:

- [W3C dummy PDF](https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf)
- [MDN CC0 flower MP4](https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4)

If a previous full-seed run created the old invalid PDF/MP4 placeholders, rerun
with `HASHBOX_SEED_REPAIR_INVALID_MEDIA=true` so the seeder removes only the
matching `seed-content-*.pdf` and `seed-content-*.mp4` fixtures before uploading
the valid replacements.

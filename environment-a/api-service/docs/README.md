# API Swagger Docs

Dokumentasi API dihasilkan dengan Swaggo.

## Generate Ulang

```bash
go run github.com/swaggo/swag/cmd/swag@v1.16.6 init -g cmd/api-service/main.go -o docs --parseInternal
```

## Akses UI Swagger

Saat `api-service` berjalan:

- Swagger UI: `GET /api/v1/swagger/index.html`
- Swagger JSON: `GET /api/v1/swagger/doc.json`
- Swagger YAML: `environment-a/api-service/docs/swagger.yaml`

## Catatan

- File `docs.go`, `swagger.json`, dan `swagger.yaml` adalah artefak generated.
- Jika menambah/mengubah endpoint, jalankan generate ulang agar dokumentasi sinkron.

SHELL := /bin/bash
.DEFAULT_GOAL := help

ENV_FILE ?= .env
ENV_RUN = set -a; [ -f "$(ENV_FILE)" ] && . "$(ENV_FILE)"; set +a

.PHONY: help doctor run build fmt fmt-check vet test ci swagger \
	migrate-up migrate-down migrate-down-all migrate-version migrate-fresh seed-dev-admin

help: ## Show available make targets
	@awk 'BEGIN {FS = ":.*##"; print "Usage: make <target>\n"} /^[a-zA-Z0-9_.-]+:.*##/ {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

doctor: ## Check local prerequisites and .env-derived settings
	@bash -lc '$(ENV_RUN); \
		echo "ENV_FILE=$(ENV_FILE)"; \
		if [ ! -f "$(ENV_FILE)" ]; then echo "warning: $(ENV_FILE) not found"; fi; \
		command -v go >/dev/null || { echo "error: go is not installed"; exit 1; }; \
		if [ -z "$${DATABASE_URL}" ]; then echo "warning: DATABASE_URL is empty"; else echo "DATABASE_URL is set"; fi; \
		if [ -z "$${MIGRATIONS_PATH}" ]; then echo "warning: MIGRATIONS_PATH is empty"; else echo "MIGRATIONS_PATH=$${MIGRATIONS_PATH}"; fi; \
		if command -v psql >/dev/null; then echo "psql is available"; else echo "warning: psql is not installed"; fi'

run: ## Run api-service locally using service .env
	@bash -lc '$(ENV_RUN); go run ./cmd/api-service'

build: ## Build api-service binary
	@go build ./cmd/api-service

fmt: ## Format Go files in api-service
	@gofmt -w .

fmt-check: ## Check whether Go files are formatted
	@unformatted=$$(gofmt -l .); \
	if [[ -n "$$unformatted" ]]; then \
		echo "Unformatted files:"; \
		echo "$$unformatted"; \
		exit 1; \
	fi

vet: ## Run go vet for api-service
	@go vet ./...

test: ## Run tests for api-service
	@go test ./...

ci: fmt-check vet test ## Run local CI checks for api-service

swagger: ## Regenerate Swagger docs
	@go run github.com/swaggo/swag/cmd/swag@v1.16.6 init -g cmd/api-service/main.go -o docs --parseInternal

migrate-up: ## Apply all pending database migrations from service .env
	@bash -lc '$(ENV_RUN); go run ./cmd/migrate up'

migrate-down: ## Roll back one database migration step from service .env
	@bash -lc '$(ENV_RUN); go run ./cmd/migrate down'

migrate-down-all: ## Roll back all database migrations (destructive)
	@bash -lc '$(ENV_RUN); go run ./cmd/migrate down-all'

migrate-version: ## Show current migration version and dirty status from service .env
	@bash -lc '$(ENV_RUN); go run ./cmd/migrate version'

migrate-fresh: ## Roll back all migrations then re-apply them (dev only)
	@bash -lc '$(ENV_RUN); go run ./cmd/migrate fresh'

seed: ## Apply dev admin seed via psql using service .env
	@bash -lc '$(ENV_RUN); \
		command -v psql >/dev/null || { echo "psql is not installed"; exit 1; }; \
		if [ -z "$${DATABASE_URL}" ]; then echo "DATABASE_URL is required"; exit 1; fi; \
		psql "$${DATABASE_URL}" -f db/seeds/dev_admin.sql'

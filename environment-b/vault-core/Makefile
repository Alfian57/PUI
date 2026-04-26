SHELL := /bin/bash
.DEFAULT_GOAL := help

ENV_FILE ?= .env
ENV_RUN = set -a; [ -f "$(ENV_FILE)" ] && . "$(ENV_FILE)"; set +a

.PHONY: help doctor run build fmt fmt-check vet test ci

help: ## Show available make targets
	@awk 'BEGIN {FS = ":.*##"; print "Usage: make <target>\n"} /^[a-zA-Z0-9_.-]+:.*##/ {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

doctor: ## Check local prerequisites and .env-derived settings
	@bash -lc '$(ENV_RUN); \
		echo "ENV_FILE=$(ENV_FILE)"; \
		if [ ! -f "$(ENV_FILE)" ]; then echo "warning: $(ENV_FILE) not found"; fi; \
		command -v go >/dev/null || { echo "error: go is not installed"; exit 1; }; \
		for key in UDS_PATH BADGER_PATH CHUNK_ROOT; do \
			value=$${!key}; \
			if [ -z "$$value" ]; then echo "warning: $$key is empty"; else echo "$$key=$$value"; fi; \
		done'

run: ## Run vault-core locally using service .env
	@bash -lc '$(ENV_RUN); go run ./cmd/vault-core'

build: ## Build vault-core binary
	@go build ./cmd/vault-core

fmt: ## Format Go files in vault-core
	@gofmt -w .

fmt-check: ## Check whether Go files are formatted
	@unformatted=$$(gofmt -l .); \
	if [[ -n "$$unformatted" ]]; then \
		echo "Unformatted files:"; \
		echo "$$unformatted"; \
		exit 1; \
	fi

vet: ## Run go vet for vault-core
	@go vet ./...

test: ## Run tests for vault-core
	@go test ./...

ci: fmt-check vet test ## Run local CI checks for vault-core

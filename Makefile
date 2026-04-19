SHELL := /bin/bash
.DEFAULT_GOAL := help

GO_MODULES := environment-a/api-service environment-b/vault-core shared/uds
WEB_DIR := environment-a/web-client
API_DIR := environment-a/api-service
VAULT_DIR := environment-b/vault-core
COMPOSE_FILE := docker-compose.yml

.PHONY: help deps ci ci-go ci-web ci-compose \
	go-fmt go-fmt-check go-vet go-test \
	web-install web-build web-dev \
	compose-config compose-up compose-down compose-logs \
	docker-build docker-build-api docker-build-vault docker-build-web \
	run-api run-vault clean

help: ## Show available make targets
	@awk 'BEGIN {FS = ":.*##"; print "Usage: make <target>\n"} /^[a-zA-Z0-9_.-]+:.*##/ {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

deps: ## Install dependencies for Go modules and web client
	@set -euo pipefail; \
	for module in $(GO_MODULES); do \
		echo "Downloading Go deps in $$module"; \
		(cd "$$module" && go mod download); \
	done
	@echo "Installing npm deps in $(WEB_DIR)"
	@cd $(WEB_DIR) && npm ci

go-fmt: ## Format Go code in all modules
	@set -euo pipefail; \
	for module in $(GO_MODULES); do \
		echo "Formatting Go files in $$module"; \
		(cd "$$module" && gofmt -w .); \
	done

go-fmt-check: ## Check if Go code is formatted
	@set -euo pipefail; \
	for module in $(GO_MODULES); do \
		echo "Checking gofmt in $$module"; \
		unformatted=$$(cd "$$module" && gofmt -l .); \
		if [[ -n "$$unformatted" ]]; then \
			echo "Unformatted files found in $$module:"; \
			echo "$$unformatted"; \
			exit 1; \
		fi; \
	done

go-vet: ## Run go vet for all modules
	@set -euo pipefail; \
	for module in $(GO_MODULES); do \
		echo "Running go vet in $$module"; \
		(cd "$$module" && go vet ./...); \
	done

go-test: ## Run go test for all modules
	@set -euo pipefail; \
	for module in $(GO_MODULES); do \
		echo "Running go test in $$module"; \
		(cd "$$module" && go test ./...); \
	done

web-install: ## Install web-client dependencies
	@cd $(WEB_DIR) && npm ci

web-build: ## Build web-client
	@cd $(WEB_DIR) && npm run build

web-dev: ## Start web-client dev server
	@cd $(WEB_DIR) && npm run dev

compose-config: ## Validate docker-compose configuration
	@docker compose -f $(COMPOSE_FILE) config -q

compose-up: ## Start full stack via docker compose
	@docker compose -f $(COMPOSE_FILE) up -d --build

compose-down: ## Stop full stack via docker compose
	@docker compose -f $(COMPOSE_FILE) down

compose-logs: ## Tail logs from docker compose stack
	@docker compose -f $(COMPOSE_FILE) logs -f

docker-build-api: ## Build local api-service image
	@docker build -t pui-api-service:local $(API_DIR)

docker-build-vault: ## Build local vault-core image
	@docker build -t pui-vault-core:local $(VAULT_DIR)

docker-build-web: ## Build local web-client image
	@docker build -t pui-web-client:local $(WEB_DIR)

docker-build: docker-build-api docker-build-vault docker-build-web ## Build all local Docker images

ci-go: go-fmt-check go-vet go-test ## Run Go CI checks

ci-web: web-install web-build ## Run web CI checks

ci-compose: compose-config ## Run compose config validation

ci: ci-go ci-web ci-compose ## Run all local CI checks

run-api: ## Run api-service locally
	@cd $(API_DIR) && go run ./cmd/api-service

run-vault: ## Run vault-core locally
	@cd $(VAULT_DIR) && go run ./cmd/vault-core

clean: ## Clean generated web artifacts
	@rm -rf $(WEB_DIR)/dist

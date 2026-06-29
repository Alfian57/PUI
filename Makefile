SHELL := /bin/bash
.DEFAULT_GOAL := help

GO_MODULES := environment-a/api-service environment-b/vault-core shared/uds
WEB_DIR := environment-a/web-client
API_DIR := environment-a/api-service
VAULT_DIR := environment-b/vault-core
COMPOSE_FILE := docker-compose.yml

.PHONY: help deps ci ci-go ci-web ci-compose \
	go-fmt go-fmt-check go-vet \
	unit-test unit-test-coverage-html \
	blackbox-test blackbox-ui-headless blackbox-ui-headed blackbox-ui-gui \
	security-test security-demo \
	prove-chunking \
	test-all \
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

# ===== UNIT TESTING =====

unit-test: ## Run Go unit tests with race detector and coverage
	@set -euo pipefail; \
	overall=0; \
	for module in $(GO_MODULES); do \
		printf "\n\033[1;34m▶ %s\033[0m\n" "$$module"; \
		output=$$(cd "$$module" && go test -race -cover ./... 2>&1); \
		exit_code=$$?; \
		echo "$$output" | while IFS= read -r line; do \
			case "$$line" in \
				ok\ *) printf "  \033[32m✔\033[0m %s\n" "$${line#ok   }" ;; \
				FAIL*) printf "  \033[31m✘\033[0m %s\n" "$$line" ;; \
				*'coverage: 0.0%'*) ;; \
				'?'*)  ;; \
				*)     printf "  %s\n" "$$line" ;; \
			esac; \
		done; \
		[ $$exit_code -ne 0 ] && overall=1; \
	done; \
	printf "\n"; \
	if [ $$overall -eq 0 ]; then \
		printf "\033[1;32m✔ All tests passed\033[0m\n\n"; \
	else \
		printf "\033[1;31m✘ Some tests failed\033[0m\n\n"; exit 1; \
	fi

# ===== BLACKBOX TESTING =====

blackbox-test: blackbox-ui-headed ## Run E2E blackbox UI tests (Bruno API tests must be run manually via Bruno GUI)

blackbox-ui-headless: ## Run Playwright E2E UI tests in headless mode (background)
	@cd tests/blackbox/playwright && npm install && npx playwright install chromium && npm run test

blackbox-ui-headed: ## Run Playwright E2E UI tests in headed mode (opens browser popup)
	@cd tests/blackbox/playwright && npm install && npx playwright install chromium && npm run test:headed


# ===== SECURITY TESTING =====
# Two complementary modes (see tests/README.md):
#   Tipe 1 (presentasi) : security-demo  -> visual browser console via Playwright
#   Tipe 2 (development): security-test  -> headless Go integration test

security-demo: ## [Tipe 1/presentasi] Run visual Security Lab demo in a real browser (Playwright, headed)
	@cd tests/blackbox/playwright && npm install && npx playwright install chromium && npm run test:security-demo

security-test: ## [Tipe 2/dev] Run security integration test (ransomware mitigation) against the live stack
	@echo "Prasyarat: make compose-up + SECURITY_LAB_ENABLED=true + user dev ter-seed."
	@cd tests/security && GOWORK=off go test -tags=integration -count=1 -v ./...

# ===== STORAGE PROOF =====

prove-chunking: ## Bukti visual: upload sebuah berkas lalu tunjukkan pemecahan chunk, dedup & integritas (butuh stack hidup + curl + jq)
	@bash scripts/prove_chunking.sh

# ===== TEST AGGREGATES =====

test-all: blackbox-test security-test ## Run all automated tests: blackbox (Playwright) + security

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

ci-go: go-fmt-check go-vet unit-test ## Run Go CI checks

ci-web: web-install web-build ## Run web CI checks

ci-compose: compose-config ## Run compose config validation

ci: ci-go ci-web ci-compose ## Run all local CI checks

run-api: ## Run api-service locally
	@cd $(API_DIR) && go run ./cmd/api-service

run-vault: ## Run vault-core locally
	@cd $(VAULT_DIR) && go run ./cmd/vault-core

clean: ## Clean generated web artifacts
	@rm -rf $(WEB_DIR)/dist

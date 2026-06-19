# Central development commands for the Residential Proxy project.
#
# Run `make help` to list the available targets.

APP_NAME := residential-proxy

PROXY_ENGINE_DIR := apps/proxy-engine
SCRAPER_DIR      := apps/scraper
CHECKER_DIR      := apps/health-checker
WEB_DIR          := apps/web

ifeq ($(OS),Windows_NT)
AIR  ?= air.exe
PNPM ?= pnpm.cmd
else
AIR  ?= air
PNPM ?= pnpm
endif

GO ?= go

.DEFAULT_GOAL := help

.PHONY: \
	help dev all start \
	dev-proxy-engine dev-scraper dev-checker dev-health-checker dev-proxy-health dev-web \
	proxy-engine scraper checker health-checker proxy-health web \
	install install-web install-go \
	install-air \
	build build-web build-go \
	test test-web test-go typecheck clean

help: ## Show this help message
	@echo "$(APP_NAME) development commands"
	@echo ""
	@echo "  make dev                 Run all Go services with Air and the web app"
	@echo "  make proxy-engine        Run proxy-engine with hot reload"
	@echo "  make scraper             Run scraper with hot reload"
	@echo "  make checker             Run health-checker with hot reload"
	@echo "  make proxy-health        Alias for health-checker (legacy name)"
	@echo "  make web                 Run the AdonisJS/Vite web app"
	@echo ""
	@echo "  make install             Install web and Go dependencies"
	@echo "  make install-air         Install the Air hot-reload CLI"
	@echo "  make build               Build all applications"
	@echo "  make test                Test all applications"
	@echo "  make typecheck           Typecheck the web application"
	@echo "  make clean               Remove generated Go and web build output"

# Recursive Make keeps every long-running process attached to this terminal.
# Make will propagate Ctrl+C to the Air and web development processes.
dev all start:
	@$(MAKE) --no-print-directory -j4 dev-proxy-engine dev-scraper dev-checker dev-web

dev-proxy-engine: ## Run proxy-engine using apps/proxy-engine/.air.toml
	@echo "[proxy-engine] starting with Air"
	@cd "$(PROXY_ENGINE_DIR)" && $(AIR) -c .air.toml

dev-scraper: ## Run scraper using apps/scraper/.air.toml
	@echo "[scraper] starting with Air"
	@cd "$(SCRAPER_DIR)" && $(AIR) -c .air.toml

dev-checker: ## Run health-checker using apps/health-checker/.air.toml
	@echo "[health-checker] starting with Air"
	@cd "$(CHECKER_DIR)" && $(AIR) -c .air.toml

dev-web: ## Run the AdonisJS/Vite development server
	@echo "[web] starting development server"
	@cd "$(WEB_DIR)" && $(PNPM) dev

# Friendly and backwards-compatible aliases.
proxy-engine: dev-proxy-engine
scraper: dev-scraper
checker health-checker dev-health-checker: dev-checker
proxy-health dev-proxy-health: dev-checker
web: dev-web

install: install-web install-go ## Install all dependencies

install-web:
	@cd "$(WEB_DIR)" && $(PNPM) install

install-go:
	@cd "$(PROXY_ENGINE_DIR)" && $(GO) mod download
	@cd "$(SCRAPER_DIR)" && $(GO) mod download
	@cd "$(CHECKER_DIR)" && $(GO) mod download

install-air: ## Install Air into Go's binary directory
	@$(GO) install github.com/air-verse/air@latest
	@echo "Air installed. Ensure the Go bin directory is available in PATH."

build: build-web build-go ## Build all applications

build-web:
	@cd "$(WEB_DIR)" && $(PNPM) build

build-go:
	@cd "$(PROXY_ENGINE_DIR)" && $(GO) build ./...
	@cd "$(SCRAPER_DIR)" && $(GO) build ./...
	@cd "$(CHECKER_DIR)" && $(GO) build ./...

test: test-web test-go ## Run all test suites

test-web:
	@cd "$(WEB_DIR)" && $(PNPM) test

test-go:
	@cd "$(PROXY_ENGINE_DIR)" && $(GO) test ./...
	@cd "$(SCRAPER_DIR)" && $(GO) test ./...
	@cd "$(CHECKER_DIR)" && $(GO) test ./...

typecheck: ## Typecheck the web application
	@cd "$(WEB_DIR)" && $(PNPM) typecheck

clean: ## Remove generated build output
	@$(GO) clean -cache
	@$(PNPM) --dir "$(WEB_DIR)" exec node -e "require('fs').rmSync('build',{recursive:true,force:true})"
	@$(PNPM) --dir "$(WEB_DIR)" exec node -e "for(const p of ['$(PROXY_ENGINE_DIR)/tmp','$(SCRAPER_DIR)/tmp','$(CHECKER_DIR)/tmp'])require('fs').rmSync('../../'+p,{recursive:true,force:true})"

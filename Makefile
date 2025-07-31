.PHONY: help setup build dev down clean test lint format migrate seed logs

# Default target
help: ## Show this help message
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# Setup and initialization
setup: ## Initial project setup (copy env, install dependencies)
	@echo "Setting up baseline project..."
	cp .env.example .env
	@echo "Environment file created. Please update .env with your settings."
	@echo "Run 'make build' to build containers and 'make dev' to start development."

build: ## Build all Docker containers
	docker-compose build

build-prod: ## Build production containers
	NODE_ENV=production docker-compose build

# Development commands
dev: ## Start development environment
	docker-compose up -d postgres redis
	@echo "Waiting for databases to be ready..."
	@sleep 5
	docker-compose up api ui

dev-detached: ## Start development environment in background
	docker-compose up -d

dev-logs: ## Show logs from development containers
	docker-compose logs -f

# Database commands
migrate: ## Run database migrations
	docker-compose exec api bun run db:migrate

migrate-reset: ## Reset database and run migrations
	docker-compose exec api bun run db:reset

seed: ## Seed database with test data
	docker-compose exec api bun run db:seed

db-studio: ## Open Prisma Studio
	docker-compose exec api bun run db:studio

# Testing
test: ## Run all tests
	docker-compose exec api bun run test
	docker-compose exec ui npm run test

test-api: ## Run API tests only
	docker-compose exec api bun run test

test-ui: ## Run UI tests only
	docker-compose exec ui npm run test

test-coverage: ## Run tests with coverage
	docker-compose exec api bun run test:coverage
	docker-compose exec ui npm run test:coverage

# Code quality
lint: ## Run linters
	docker-compose exec api bun run lint
	docker-compose exec ui npm run lint

format: ## Format code
	docker-compose exec api bun run format
	docker-compose exec ui npm run format

type-check: ## Run type checking
	docker-compose exec api bun run type-check
	docker-compose exec ui npm run type-check

# Container management
down: ## Stop all containers
	docker-compose down

down-volumes: ## Stop containers and remove volumes
	docker-compose down -v

restart: ## Restart all containers
	docker-compose restart

restart-api: ## Restart API container only
	docker-compose restart api

restart-ui: ## Restart UI container only
	docker-compose restart ui

# Cleanup
clean: ## Clean up containers, images, and volumes
	docker-compose down -v --rmi all --remove-orphans
	docker system prune -f

clean-all: ## Nuclear cleanup - remove everything
	docker-compose down -v --rmi all --remove-orphans
	docker system prune -af
	docker volume prune -f

# Logs
logs: ## Show logs from all containers
	docker-compose logs -f

logs-api: ## Show API logs
	docker-compose logs -f api

logs-ui: ## Show UI logs
	docker-compose logs -f ui

logs-db: ## Show database logs
	docker-compose logs -f postgres redis

# Production deployment helpers
deploy-build: ## Build for production deployment
	NODE_ENV=production docker-compose -f docker-compose.prod.yml build

deploy-up: ## Start production deployment
	NODE_ENV=production docker-compose -f docker-compose.prod.yml up -d

deploy-down: ## Stop production deployment
	docker-compose -f docker-compose.prod.yml down

deploy-logs: ## Show production deployment logs
	docker-compose -f docker-compose.prod.yml logs -f

deploy-restart: ## Restart production deployment
	docker-compose -f docker-compose.prod.yml restart

# Stack validation for Portainer
validate-stack: ## Validate docker-compose.prod.yml for Portainer
	docker-compose -f docker-compose.prod.yml config

check-images: ## Check if production images exist
	@echo "Checking for production images..."
	@docker images | grep baseline || echo "No baseline images found - run CI/CD pipeline first"

# Development utilities
shell-api: ## Open shell in API container
	docker-compose exec api /bin/sh

shell-ui: ## Open shell in UI container
	docker-compose exec ui /bin/sh

shell-db: ## Open PostgreSQL shell
	docker-compose exec postgres psql -U postgres -d baseline

install-api: ## Install API dependencies
	docker-compose exec api bun install

install-ui: ## Install UI dependencies
	docker-compose exec ui npm install

# Health checks
health: ## Check health of all services
	@echo "Checking service health..."
	@docker-compose ps
	@echo "\nAPI Health:"
	@curl -f http://localhost:3001/health || echo "API not responding"
	@echo "\nUI Health:"
	@curl -f http://localhost:5173 || echo "UI not responding"

# QuantFlow Docker Makefile

.PHONY: help build up down restart logs clean dev prod test health

# Default target
help:
	@echo "QuantFlow Docker Commands:"
	@echo "  make build     - Build all Docker images"
	@echo "  make up        - Start all services in production mode"
	@echo "  make down      - Stop all services"
	@echo "  make restart   - Restart all services"
	@echo "  make logs      - View logs from all services"
	@echo "  make clean     - Remove all containers, images, and volumes"
	@echo "  make dev       - Start in development mode with hot reload"
	@echo "  make prod      - Start in production mode"
	@echo "  make test      - Run health checks"
	@echo "  make health    - Check service health"
	@echo ""
	@echo "Backend specific:"
	@echo "  make backend-build - Build backend image only"
	@echo "  make backend-logs  - View backend logs"
	@echo "  make backend-shell - Access backend container shell"
	@echo ""
	@echo "Frontend specific:"
	@echo "  make frontend-build - Build frontend image only"
	@echo "  make frontend-logs  - View frontend logs"
	@echo "  make frontend-shell - Access frontend container shell"

# Environment setup
setup:
	@echo "Setting up environment..."
	@if [ ! -f .env ]; then \
		cp env.template .env; \
		echo "Created .env file from template. Please edit it with your values."; \
	else \
		echo ".env file already exists."; \
	fi

# Build commands
build: setup
	@echo "Building all Docker images..."
	docker-compose build

backend-build:
	@echo "Building backend image..."
	docker-compose build backend

frontend-build:
	@echo "Building frontend image..."
	docker-compose build frontend

# Production commands
up: build
	@echo "Starting services in production mode..."
	docker-compose up -d

prod: up

down:
	@echo "Stopping all services..."
	docker-compose down

restart: down up

# Development commands
dev: setup
	@echo "Starting services in development mode..."
	docker-compose -f docker-compose.dev.yml up

# Logging
logs:
	@echo "Viewing logs from all services..."
	docker-compose logs -f

backend-logs:
	@echo "Viewing backend logs..."
	docker-compose logs -f backend

frontend-logs:
	@echo "Viewing frontend logs..."
	docker-compose logs -f frontend

# Shell access
backend-shell:
	@echo "Accessing backend container shell..."
	docker-compose exec backend bash

frontend-shell:
	@echo "Accessing frontend container shell..."
	docker-compose exec frontend sh

# Health checks
health:
	@echo "Checking service health..."
	@echo "Backend health:"
	@curl -s http://localhost:5000/health | jq . || echo "Backend not responding"
	@echo ""
	@echo "Frontend health:"
	@curl -s http://localhost:3000/health || echo "Frontend not responding"

test: health

# Cleanup
clean:
	@echo "Cleaning up Docker resources..."
	docker-compose down -v --rmi all
	docker system prune -f

clean-all:
	@echo "Cleaning up all Docker resources..."
	docker-compose down -v --rmi all
	docker system prune -af
	docker volume prune -f

# Status
status:
	@echo "Docker Compose Status:"
	docker-compose ps

# Quick start for new users
quick-start: setup build up health
	@echo ""
	@echo "✅ QuantFlow is now running!"
	@echo "Frontend: http://localhost:3000"
	@echo "Backend:  http://localhost:5000"
	@echo "Health:   make health"

# Development workflow
dev-restart:
	@echo "Restarting development services..."
	docker-compose -f docker-compose.dev.yml restart

dev-logs:
	@echo "Viewing development logs..."
	docker-compose -f docker-compose.dev.yml logs -f

# Production deployment helpers
deploy: build up
	@echo "Production deployment complete!"
	@make health

# Monitoring
stats:
	@echo "Container resource usage:"
	docker stats --no-stream

# Backup
backup:
	@echo "Creating backup..."
	@mkdir -p backups
	@docker run --rm -v quantflow_backend_cache:/data -v $(PWD)/backups:/backup alpine tar czf /backup/quantflow-backup-$(shell date +%Y%m%d-%H%M%S).tar.gz -C /data .
	@echo "Backup created in backups/ directory"

# Update
update:
	@echo "Updating images..."
	docker-compose pull
	docker-compose build --no-cache
	@echo "Update complete!"

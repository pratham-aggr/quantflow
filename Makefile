# QuantFlow Docker Management

.PHONY: help build up down logs clean restart dev prod

# Default target
help:
	@echo "QuantFlow Docker Management"
	@echo "========================"
	@echo ""
	@echo "Available commands:"
	@echo "  dev          - Start development environment"
	@echo "  prod         - Start production environment"
	@echo "  build        - Build all Docker images"
	@echo "  up           - Start all services"
	@echo "  down         - Stop all services"
	@echo "  logs         - View logs from all services"
	@echo "  clean        - Remove all containers and images"
	@echo "  restart      - Restart all services"
	@echo "  frontend     - Build and run frontend only"
	@echo "  backend      - Build and run backend only"

# Development environment
dev:
	docker-compose up -d
	@echo "Development environment started"
	@echo "Frontend: http://localhost:3000"
	@echo "Backend: http://localhost:5000"

# Production environment
prod:
	docker-compose -f docker-compose.prod.yml up -d
	@echo "Production environment started"

# Build all images
build:
	docker-compose build
	@echo "All images built successfully"

# Start all services
up:
	docker-compose up -d
	@echo "All services started"

# Stop all services
down:
	docker-compose down
	@echo "All services stopped"

# View logs
logs:
	docker-compose logs -f

# Clean up
clean:
	docker-compose down -v
	docker system prune -f
	@echo "Cleanup completed"

# Restart services
restart:
	docker-compose restart
	@echo "Services restarted"

# Frontend only
frontend:
	docker-compose up -d frontend
	@echo "Frontend started"

# Backend only
backend:
	docker-compose up -d backend
	@echo "Backend started"

# Health check
health:
	@echo "Checking service health..."
	@curl -f http://localhost:3000 > /dev/null && echo "Frontend: OK" || echo "Frontend: FAIL"
	@curl -f http://localhost:5000/health > /dev/null && echo "Backend: OK" || echo "Backend: FAIL"

# Docker Setup for QuantFlow

This guide explains how to run QuantFlow using Docker containers.

## Prerequisites

- Docker (20.10+)
- Docker Compose (2.0+)

## Quick Start

### 1. Clone and Setup Environment

```bash
# Clone the repository
git clone <your-repo-url>
cd quantflow

# Copy environment template
cp env.template .env

# Edit .env file with your actual values
nano .env
```

### 2. Production Deployment

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### 3. Development Mode

```bash
# Start in development mode with hot reload
docker-compose -f docker-compose.dev.yml up

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop development services
docker-compose -f docker-compose.dev.yml down
```

## Services

### Backend API (Port 5000)
- **Image**: Built from `backend-api/Dockerfile`
- **Health Check**: `http://localhost:5000/health`
- **Features**: 
  - Python 3.9 with Gunicorn
  - Automatic health checks
  - Non-root user for security
  - Optimized for production

### Frontend (Port 3000)
- **Image**: Built from `Dockerfile`
- **Health Check**: `http://localhost:3000/health`
- **Features**:
  - React app served by Nginx
  - Static asset optimization
  - Security headers
  - Gzip compression

## Environment Variables

Create a `.env` file based on `env.template`:

```bash
# Frontend
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-supabase-anon-key
REACT_APP_BACKEND_API_URL=http://localhost:5000

# Backend
FLASK_ENV=production
PORT=5000
REACT_APP_FINNHUB_API_KEY=your-finnhub-api-key
```

## Docker Commands

### Building Images

```bash
# Build all images
docker-compose build

# Build specific service
docker-compose build backend
docker-compose build frontend

# Build without cache
docker-compose build --no-cache
```

### Running Services

```bash
# Start all services in background
docker-compose up -d

# Start specific service
docker-compose up -d backend

# View running containers
docker-compose ps

# View logs
docker-compose logs
docker-compose logs backend
docker-compose logs frontend
```

### Debugging

```bash
# Access container shell
docker-compose exec backend bash
docker-compose exec frontend sh

# View container logs
docker-compose logs -f backend

# Restart service
docker-compose restart backend

# Recreate and restart
docker-compose up -d --force-recreate backend
```

### Cleanup

```bash
# Stop and remove containers
docker-compose down

# Remove containers, networks, and volumes
docker-compose down -v

# Remove all images
docker-compose down --rmi all

# Remove everything including volumes
docker-compose down -v --rmi all
```

## Development Workflow

### Hot Reload Development

```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up

# The frontend will auto-reload on file changes
# Backend will restart on Python file changes
```

### Building for Production

```bash
# Build production images
docker-compose build

# Test production build locally
docker-compose up -d

# Check health endpoints
curl http://localhost:5000/health
curl http://localhost:3000/health
```

## Health Checks

Both services include health checks:

- **Backend**: `GET /health` - Returns service status and cache info
- **Frontend**: `GET /health` - Returns "healthy" status

## Networking

Services communicate through a Docker network:
- Frontend can reach backend via `http://backend:5000`
- External access via `http://localhost:3000` (frontend) and `http://localhost:5000` (backend)

## Security Features

### Backend
- Non-root user execution
- Minimal base image (Python slim)
- No unnecessary packages
- Health check monitoring

### Frontend
- Nginx with security headers
- Non-root user execution
- Gzip compression
- Static asset caching

## Troubleshooting

### Common Issues

1. **Port conflicts**: Ensure ports 3000 and 5000 are available
2. **Environment variables**: Check `.env` file exists and has correct values
3. **Build failures**: Try `docker-compose build --no-cache`
4. **Permission issues**: Ensure Docker has proper permissions

### Debug Commands

```bash
# Check container status
docker-compose ps

# View detailed logs
docker-compose logs --tail=100 backend

# Check environment variables
docker-compose exec backend env

# Test connectivity
docker-compose exec frontend curl http://backend:5000/health
```

### Performance Optimization

```bash
# Use multi-stage builds (already configured)
# Optimize image layers
# Use .dockerignore files (already configured)
# Enable build cache
docker-compose build --parallel
```

## Production Deployment

For production deployment:

1. Update environment variables for production
2. Use a reverse proxy (nginx/traefik) in front of containers
3. Set up SSL certificates
4. Configure proper logging
5. Set up monitoring and alerting
6. Use container orchestration (Docker Swarm/Kubernetes)

## Monitoring

```bash
# Monitor resource usage
docker stats

# View container health
docker-compose ps

# Check service logs
docker-compose logs --tail=50 -f
```

## Backup and Recovery

```bash
# Backup volumes
docker run --rm -v quantflow_backend_cache:/data -v $(pwd):/backup alpine tar czf /backup/backup.tar.gz -C /data .

# Restore volumes
docker run --rm -v quantflow_backend_cache:/data -v $(pwd):/backup alpine tar xzf /backup/backup.tar.gz -C /data
```

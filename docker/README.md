# 🐳 Docker Configuration

This directory contains all Docker-related files for the QuantFlow application.

## 📁 **File Structure**

```
docker/
├── README.md                    # This file
├── Dockerfile.frontend          # Frontend React application
├── docker-compose.yml           # Development environment
└── docker-compose.prod.yml      # Production environment
```

## 🚀 **Quick Start**

### **Development Environment**
```bash
# Start all services for development
docker-compose -f docker/docker-compose.yml up -d

# View logs
docker-compose -f docker/docker-compose.yml logs -f

# Stop services
docker-compose -f docker/docker-compose.yml down
```

### **Production Environment**
```bash
# Start production services
docker-compose -f docker/docker-compose.prod.yml up -d

# Scale services
docker-compose -f docker/docker-compose.prod.yml up -d --scale backend=3
```

## 🏗️ **Services Overview**

### **Frontend Service**
- **Image**: `quantflow-frontend`
- **Port**: 3000 (dev) / 80 (prod)
- **Build**: Multi-stage build with Nginx for production
- **Features**: Optimized React build with static file serving

### **Backend Service**
- **Image**: `quantflow-backend`
- **Port**: 5000
- **Build**: Python Flask application with all dependencies
- **Features**: Production-ready with Gunicorn WSGI server

### **Database Service**
- **Image**: `postgres:15`
- **Port**: 5432
- **Features**: Persistent data storage with volume mounting

## 🔧 **Configuration**

### **Environment Variables**

Create a `.env` file in the project root:

```env
# Database
POSTGRES_DB=quantflow
POSTGRES_USER=quantflow_user
POSTGRES_PASSWORD=your_secure_password

# Backend
FLASK_ENV=production
SECRET_KEY=your_secret_key
DATABASE_URL=postgresql://quantflow_user:your_secure_password@db:5432/quantflow

# Frontend
REACT_APP_API_URL=http://localhost:5000
```

### **Volume Mounts**

- **Database Data**: `./data/postgres:/var/lib/postgresql/data`
- **Backend Logs**: `./logs/backend:/app/logs`
- **Frontend Build**: `./build:/usr/share/nginx/html`

## 🛠️ **Build Commands**

### **Individual Services**
```bash
# Build frontend
docker build -f docker/Dockerfile.frontend -t quantflow-frontend .

# Build backend
docker build -f backend-api/Dockerfile -t quantflow-backend ./backend-api
```

### **Multi-stage Build**
```bash
# Build all services
docker-compose -f docker/docker-compose.yml build

# Build with no cache
docker-compose -f docker/docker-compose.yml build --no-cache
```

## 📊 **Health Checks**

All services include health checks:

- **Frontend**: HTTP check on port 80/3000
- **Backend**: HTTP check on `/health` endpoint
- **Database**: PostgreSQL connection check

## 🔒 **Security Features**

- **Non-root users**: All containers run as non-root
- **Minimal base images**: Alpine Linux for smaller attack surface
- **Secret management**: Environment variables for sensitive data
- **Network isolation**: Internal network for service communication

## 📈 **Performance Optimization**

- **Multi-stage builds**: Reduced image sizes
- **Layer caching**: Optimized build times
- **Static file serving**: Nginx for frontend assets
- **Connection pooling**: Database connection optimization

## 🐛 **Troubleshooting**

### **Common Issues**

1. **Port conflicts**: Ensure ports 3000, 5000, 5432 are available
2. **Permission issues**: Check file permissions for mounted volumes
3. **Build failures**: Clear Docker cache with `docker system prune`

### **Debug Commands**

```bash
# Check container logs
docker logs <container_name>

# Access container shell
docker exec -it <container_name> /bin/sh

# Check service status
docker-compose -f docker/docker-compose.yml ps
```

## 🔄 **CI/CD Integration**

These Docker configurations are integrated with GitHub Actions:

- **Automated builds** on push to main branch
- **Security scanning** with Trivy
- **Multi-architecture support** (amd64, arm64)
- **Registry publishing** to GitHub Container Registry

## 📚 **Additional Resources**

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/)
- [Multi-stage Builds](https://docs.docker.com/build/building/multi-stage/)

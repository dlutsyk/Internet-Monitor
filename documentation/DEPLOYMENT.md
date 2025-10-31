# Internet Monitor - Deployment Guide

This guide covers deploying the Internet Monitor application using Docker and Docker Compose.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Deployment Commands](#deployment-commands)
- [Data Persistence](#data-persistence)
- [Monitoring & Logs](#monitoring--logs)
- [Troubleshooting](#troubleshooting)

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- Minimum 512MB RAM
- Minimum 1GB disk space

## Quick Start

### 1. Clone the repository

```bash
git clone <repository-url>
cd InternetMonitor
```

### 2. Configure environment (optional)

Create a `.env` file in the `backend/` directory:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` with your settings (or use defaults).

### 3. Start the application

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

### 4. Access the application

- Frontend: http://localhost
- Backend API: http://localhost:3001/api
- WebSocket: ws://localhost:3001/ws

## Configuration

### Backend Environment Variables

Edit `backend/.env` or set in `docker-compose.yml`:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Backend server port |
| `HOST` | `0.0.0.0` | Backend server host |
| `MONITOR_INTERVAL_MS` | `60000` | Interval between speed tests (ms) |
| `WS_PATH` | `/ws` | WebSocket endpoint path |
| `DATA_DIR` | `/app/data` | Data directory for database |
| `HTTP_LOGGING` | `true` | Enable HTTP request logging |
| `SPEED_DROP_THRESHOLD_MBPS` | `15` | Speed drop threshold |
| `SPEED_DROP_PERCENT` | `30` | Speed drop percentage |
| `RETENTION_HOURS` | `168` | Data retention (hours) |

### Ports

- **Frontend**: Port 80 (configurable in docker-compose.yml)
- **Backend**: Port 3001 (configurable via PORT env var)

## Deployment Commands

### Development

```bash
# Start services in development mode
docker-compose up

# Rebuild and start (after code changes)
docker-compose up --build
```

### Production

```bash
# Build and start in detached mode
docker-compose up -d --build

# Start without rebuilding
docker-compose up -d

# Restart specific service
docker-compose restart backend
docker-compose restart frontend
```

### Updating the Application

```bash
# Pull latest changes
git pull

# Rebuild and restart (preserves data)
docker-compose up -d --build

# Alternative: rebuild specific service
docker-compose up -d --build backend
```

**Important**: Data in the `backend-data` volume is preserved across rebuilds!

## Data Persistence

### Volume Management

The application uses a named Docker volume to persist data:

- **Volume name**: `internetmonitor_backend-data`
- **Mount point**: `/app/data` in the backend container
- **Contains**: SQLite database (`monitor.db`), measurements, history

### Viewing Volume Data

```bash
# List volumes
docker volume ls | grep backend-data

# Inspect volume
docker volume inspect internetmonitor_backend-data

# View files in volume (from running container)
docker exec internet-monitor-backend ls -lh /app/data
```

### Backup Data

```bash
# Backup database to local directory
docker cp internet-monitor-backend:/app/data/monitor.db ./backup/monitor.db

# Or backup entire data directory
docker run --rm \
  -v internetmonitor_backend-data:/data \
  -v $(pwd)/backup:/backup \
  alpine tar czf /backup/data-backup-$(date +%Y%m%d-%H%M%S).tar.gz -C /data .
```

### Restore Data

```bash
# Restore database
docker cp ./backup/monitor.db internet-monitor-backend:/app/data/monitor.db

# Restart backend to use restored data
docker-compose restart backend
```

### Data Safety

✅ **Safe operations** (preserve data):
```bash
docker-compose up -d --build      # Rebuild containers
docker-compose restart            # Restart services
docker-compose stop              # Stop services
```

⚠️ **DANGEROUS operations** (delete data):
```bash
docker-compose down -v           # Removes volumes!
docker volume rm internetmonitor_backend-data  # Deletes all data!
```

## Monitoring & Logs

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend

# Last 100 lines
docker-compose logs --tail=100 backend
```

### Health Checks

```bash
# Check service health
docker-compose ps

# Manual health check
curl http://localhost:3001/api/health
curl http://localhost/health
```

### Resource Usage

```bash
# Container stats
docker stats internet-monitor-backend internet-monitor-frontend

# Disk usage
docker system df
```

## Troubleshooting

### Container won't start

```bash
# Check logs for errors
docker-compose logs backend

# Remove and recreate containers
docker-compose down
docker-compose up -d
```

### Port already in use

```bash
# Find process using port 80 or 3001
lsof -i :80
lsof -i :3001

# Change ports in docker-compose.yml
ports:
  - "8080:80"    # frontend on port 8080
  - "3002:3001"  # backend on port 3002
```

### Data not persisting

```bash
# Verify volume exists
docker volume inspect internetmonitor_backend-data

# Check volume mount in container
docker inspect internet-monitor-backend | grep -A 10 Mounts
```

### WebSocket connection issues

1. Check backend health: `curl http://localhost:3001/api/health`
2. Verify WebSocket endpoint in nginx config
3. Check browser console for WebSocket errors
4. Ensure backend is accessible from frontend container

### Reset Everything

```bash
# Stop and remove all containers and volumes
docker-compose down -v

# Remove all images
docker-compose down --rmi all

# Start fresh
docker-compose up -d --build
```

## Advanced Configuration

### Custom Docker Network

The application creates a custom bridge network (`internet-monitor-network`) for service communication.

### Resource Limits

Add resource limits to `docker-compose.yml`:

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

### HTTPS with Reverse Proxy

Use nginx or Traefik as a reverse proxy:

```yaml
services:
  nginx-proxy:
    image: nginx:alpine
    ports:
      - "443:443"
    volumes:
      - ./nginx-proxy.conf:/etc/nginx/nginx.conf
      - ./certs:/etc/nginx/certs
```

## Production Checklist

- [ ] Configure environment variables
- [ ] Set up automated backups
- [ ] Configure log rotation
- [ ] Set up monitoring/alerting
- [ ] Use HTTPS in production
- [ ] Implement firewall rules
- [ ] Regular security updates
- [ ] Test backup restoration

## Support

For issues and questions:
- Check logs: `docker-compose logs -f`
- Review this guide
- Check Docker and container health
- Ensure data volume is properly mounted

# Environment Configuration Guide

This project uses environment variables for configuration in both frontend and backend. All hardcoded values have been moved to `.env` files for better configurability and deployment flexibility.

## Quick Start

### Development

1. **Backend**:
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your settings
   npm run dev
   ```

2. **Frontend**:
   ```bash
   cd frontend
   cp .env.example .env
   # Edit .env with your settings
   npm run dev
   ```

### Production (Docker)

All environment variables are configured in `docker-compose.yml`. You can customize them there or override using a `.env` file in the project root.

```bash
docker-compose up --build
```

## Backend Environment Variables

### Server Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | HTTP server port |
| `HOST` | `0.0.0.0` | Server bind address |
| `NODE_ENV` | `development` | Environment (development/production) |

### Database

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `file:./data/monitor.db` | Prisma database connection URL |
| `DATA_DIR` | `./data` | Directory for data storage |

### Monitoring Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `MONITOR_INTERVAL_MS` | `60000` | Interval between measurements (ms) |
| `SPEED_DROP_THRESHOLD_MBPS` | `15` | Threshold for speed drop detection (Mbps) |
| `SPEED_DROP_PERCENT` | `30` | Percentage drop to trigger event (%) |
| `RETENTION_HOURS` | `168` | How long to keep measurements (hours, default: 7 days) |
| `SPEED_TEST_MAX_TIME` | `20000` | Maximum time for speed test (ms) |
| `SIMULATION_MODE` | `false` | Use simulated data instead of real measurements |

### Network Speed Test Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `NETWORK_TEST_FILE_SIZE_BYTES` | `5000000` | Size of test file for speed measurement (5MB) |
| `NETWORK_TEST_MAX_RETRIES` | `3` | Maximum retries for failed tests |
| `NETWORK_TEST_TIMEOUT_MS` | `5000` | Timeout for network requests (ms) |
| `NETWORK_TEST_CONNECTIVITY_URL` | `https://www.google.com` | URL to test connectivity |
| `NETWORK_TEST_MAX_REALISTIC_SPEED` | `1000` | Maximum realistic download speed (Mbps, 1 Gbps) |
| `NETWORK_TEST_MAX_REALISTIC_UPLOAD_SPEED` | `500` | Maximum realistic upload speed (Mbps) |

### WebSocket Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `WS_PATH` | `/ws` | WebSocket endpoint path |

### Archive Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `ARCHIVE_ENABLED` | `true` | Enable daily archival of old data |
| `ARCHIVE_HOUR` | `0` | Hour of day to run archive (0-23) |
| `ARCHIVE_RETENTION_DAYS` | `30` | How long to keep archived data (days) |

### Logging & CORS

| Variable | Default | Description |
|----------|---------|-------------|
| `HTTP_LOGGING` | `true` | Enable HTTP request logging |
| `CORS_ORIGINS` | _(none)_ | Comma-separated allowed CORS origins |

## Frontend Environment Variables

All frontend variables must be prefixed with `VITE_` to be exposed to the client-side code.

### API Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_BASE_URL` | `/api` | Base URL for API requests |

### WebSocket Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_WS_PATH` | `/ws` | WebSocket endpoint path |
| `VITE_WS_INITIAL_RECONNECT_DELAY` | `3000` | Initial delay before reconnection attempt (ms) |
| `VITE_WS_MAX_RECONNECT_DELAY` | `30000` | Maximum delay between reconnection attempts (ms) |

### UI Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_MAX_RECENT_MEASUREMENTS` | `200` | Maximum number of recent measurements to keep in memory |
| `VITE_APP_NAME` | `Internet Monitor` | Application display name |

## Docker Configuration

### docker-compose.yml

The `docker-compose.yml` file contains all environment variables with their production defaults. You can:

1. **Edit directly** in `docker-compose.yml`
2. **Create `.env` file** in project root to override:
   ```env
   # Example .env file for docker-compose
   MONITOR_INTERVAL_MS=30000
   SIMULATION_MODE=true
   ```

### Frontend Build Arguments

Frontend environment variables are passed as build arguments in `docker-compose.yml`:

```yaml
frontend:
  build:
    args:
      - VITE_API_BASE_URL=/api
      - VITE_WS_PATH=/ws
      # ... more variables
```

These are baked into the frontend build and cannot be changed at runtime.

### Backend Runtime Environment

Backend environment variables are passed at runtime and can be changed by restarting the container:

```yaml
backend:
  environment:
    - PORT=3001
    - MONITOR_INTERVAL_MS=60000
    # ... more variables
```

## Environment Files

### .env Files

- **`.env`** - Your local configuration (gitignored)
- **`.env.example`** - Template with all variables and defaults (committed to git)

### File Locations

```
project/
├── .env.example              # Root example (for docker-compose)
├── backend/
│   ├── .env                  # Backend local config (gitignored)
│   └── .env.example          # Backend template
└── frontend/
    ├── .env                  # Frontend local config (gitignored)
    └── .env.example          # Frontend template
```

## Common Configurations

### Development with Faster Monitoring

```env
# backend/.env
MONITOR_INTERVAL_MS=10000  # Check every 10 seconds
SIMULATION_MODE=true       # Use fake data for testing
```

### Production with Custom Archive Schedule

```env
# In docker-compose.yml or .env
ARCHIVE_HOUR=3             # Run archives at 3 AM
ARCHIVE_RETENTION_DAYS=90  # Keep archives for 90 days
```

### Testing with Different Speed Thresholds

```env
# backend/.env
SPEED_DROP_THRESHOLD_MBPS=20  # Alert on drops below 20 Mbps
SPEED_DROP_PERCENT=40         # Alert on 40% speed reduction
```

### Frontend with Custom Reconnection

```env
# frontend/.env
VITE_WS_INITIAL_RECONNECT_DELAY=1000  # Reconnect faster (1s)
VITE_WS_MAX_RECONNECT_DELAY=15000     # Cap at 15s
```

## Troubleshooting

### Environment Variables Not Loading

**Frontend**: 
- Ensure variables start with `VITE_`
- Restart dev server after changing `.env`
- In Docker, rebuild the image: `docker-compose build frontend`

**Backend**:
- Variables are loaded at runtime
- Check `.env` file is in `backend/` directory
- In Docker, restart container: `docker-compose restart backend`

### Docker Not Using .env File

**Issue**: Changes to `.env` not reflected

**Solution**:
- Frontend: Must rebuild - `docker-compose up --build frontend`
- Backend: Just restart - `docker-compose restart backend`

### Validation Errors

Some variables have validation:
- Numbers must be valid integers
- Booleans: `true`, `false`, `1`, `0`, `yes`, `no`, `on`, `off`
- URLs must be valid format

## Migration from Hardcoded Values

Previously hardcoded values that are now configurable:

### Frontend
- ✅ `MAX_RECONNECT_DELAY` → `VITE_WS_MAX_RECONNECT_DELAY`
- ✅ `INITIAL_RECONNECT_DELAY` → `VITE_WS_INITIAL_RECONNECT_DELAY`
- ✅ `MAX_RECENT` → `VITE_MAX_RECENT_MEASUREMENTS`

### Backend
- ✅ `fileSizeInBytes: 5000000` → `NETWORK_TEST_FILE_SIZE_BYTES`
- ✅ `maxRetries: 3` → `NETWORK_TEST_MAX_RETRIES`
- ✅ `timeoutMs: 5000` → `NETWORK_TEST_TIMEOUT_MS`
- ✅ `MAX_REALISTIC_SPEED: 1000` → `NETWORK_TEST_MAX_REALISTIC_SPEED`
- ✅ `MAX_REALISTIC_UPLOAD_SPEED: 500` → `NETWORK_TEST_MAX_REALISTIC_UPLOAD_SPEED`
- ✅ `'https://www.google.com'` → `NETWORK_TEST_CONNECTIVITY_URL`

All code now reads from environment variables with sensible defaults.

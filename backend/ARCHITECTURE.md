# Backend Architecture

## Overview

This backend follows a **clean, simple architecture** with clear separation of concerns. It's designed to be maintainable and straightforward without over-engineering.

## Architecture Layers

```
┌─────────────────────────────────────────────┐
│              Routes (HTTP Layer)            │
│         Handle requests/responses           │
└────────────────┬────────────────────────────┘
                 │
┌────────────────▼────────────────────────────┐
│              Services Layer                 │
│           Business Logic                    │
└────────────────┬────────────────────────────┘
                 │
┌────────────────▼────────────────────────────┐
│         Database & Utilities                │
│      Prisma ORM, Analytics, Monitor         │
└─────────────────────────────────────────────┘
```

## Directory Structure

```
backend/src/
├── services/                    # Business logic services
│   ├── metrics.service.js      # Metrics retrieval & parsing
│   ├── events.service.js       # Event handling & parsing
│   ├── reports.service.js      # Report generation
│   └── statistics.service.js   # Statistics & DB maintenance
│
├── db.js                        # Database connection & queries
├── monitor.js                   # Network monitoring & event detection
├── analytics.js                 # Analytics computations
├── routes.js                    # API route definitions
├── websocket.js                 # WebSocket server
├── config.js                    # Configuration
└── server.js                    # Application entry point
```

## File Descriptions

### Core Files

#### `src/server.js` (~140 lines)
- Application entry point
- Initializes database, monitor, and WebSocket
- Sets up Express app with middleware
- Handles graceful shutdown

#### `src/routes.js` (~200 lines)
- **Clean route handlers** that delegate to services
- Organized by feature (Health, Metrics, Reports, Events, etc.)
- Only handles HTTP concerns (request validation, response formatting)
- All business logic delegated to services

#### `src/config.js` (~60 lines)
- Environment variable parsing
- Configuration object
- Path resolution

### Services Layer

#### `src/services/metrics.service.js` (~40 lines)
**Responsibilities:**
- Retrieve measurements from database
- Parse JSON fields (error, meta, server, client)
- Handle latest, recent, and date-range queries

**Key functions:**
- `getLatest()` - Get latest measurement
- `getRecent(limit)` - Get recent measurements
- `getByDateRange(from, to)` - Get measurements in date range

#### `src/services/events.service.js` (~40 lines)
**Responsibilities:**
- Retrieve events from database
- Parse JSON metadata
- Count events by type

**Key functions:**
- `getRecent(limit)` - Get recent events
- `getByDateRange(from, to)` - Get events in date range
- `countByType(events)` - Count events by type

#### `src/services/reports.service.js` (~25 lines)
**Responsibilities:**
- Generate reports with measurements + analytics
- Handle today's report generation
- Date range reports

**Key functions:**
- `generateReport(from, to, config)` - Generate full report
- `generateTodayReport(config)` - Generate today's report

#### `src/services/statistics.service.js` (~50 lines)
**Responsibilities:**
- Database statistics
- Data cleanup and maintenance
- Detailed statistics generation

**Key functions:**
- `getDatabaseStats()` - Get DB statistics
- `cleanupDatabase(retentionHours)` - Clean old data
- `getDetailedStatistics(from, to, config)` - Get detailed stats

### Core Modules

#### `src/db.js` (~180 lines)
- Prisma client initialization and connection management
- All database queries as simple functions
- Measurement CRUD operations
- Event CRUD operations
- Database maintenance (vacuum, stats)

#### `src/monitor.js` (~330 lines)
- Network speed testing with retry logic
- Connectivity checks
- Event detection (connection changes, speed drops/improvements)
- Monitoring loop management
- EventEmitter for real-time updates

#### `src/analytics.js` (~180 lines)
- Summary statistics computation
- Uptime/downtime calculations
- Speed drop detection
- Min/max/average calculations
- Date range utilities

#### `src/websocket.js` (~215 lines)
- WebSocket server initialization
- Real-time measurement broadcasts
- Event broadcasts
- Client connection management
- Heartbeat for dead connection detection

## Design Principles

### 1. Simplicity
- No DI containers or complex abstractions
- Simple function exports and imports
- Straightforward data flow

### 2. Separation of Concerns
- **Routes**: HTTP request/response handling
- **Services**: Business logic and data transformation
- **Database**: Data persistence
- **Monitor**: Network monitoring
- **Analytics**: Calculations and statistics

### 3. Single Responsibility
Each module has one clear purpose:
- `routes.js` - HTTP routing
- `metrics.service.js` - Metrics business logic
- `db.js` - Database operations
- `monitor.js` - Network monitoring

### 4. Easy to Test
- Services are pure functions (mostly)
- Can be tested independently
- No complex mocking required

### 5. Easy to Understand
- Clear file names
- Grouped by feature
- Minimal abstractions
- ~1,600 lines total (vs ~3,875 in old architecture)

## Data Flow Examples

### Get Latest Measurement
```
HTTP GET /api/metrics/latest
  ↓
routes.js → metricsService.getLatest()
  ↓
db.getLatestMeasurement()
  ↓
Prisma query → Parse JSON → Return
```

### Generate Today's Report
```
HTTP GET /api/metrics/today
  ↓
routes.js → reportsService.generateTodayReport(config)
  ↓
metricsService.getByDateRange(from, to)
  ↓
analytics.computeSummary(measurements, config)
  ↓
Return { from, to, summary, measurements }
```

### Monitoring Loop
```
monitor.performMeasurement()
  ↓
Network speed test → detectEvents()
  ↓
db.insertMeasurement() + db.insertEvent()
  ↓
events.emit('measurement') → WebSocket broadcast
```

## Benefits of This Architecture

✅ **Clean Routes**: Route handlers are simple and focused on HTTP concerns

✅ **Reusable Services**: Business logic can be reused across routes

✅ **Easy to Test**: Services are simple functions that can be tested independently

✅ **Easy to Understand**: Clear structure with ~1,600 lines vs ~3,875 before

✅ **Maintainable**: Changes are localized to specific files

✅ **No Over-engineering**: No DI containers, factories, or abstract interfaces

✅ **Professional**: Still follows best practices with proper separation

## Key Features

- ✅ Network speed monitoring with automatic event detection
- ✅ Real-time WebSocket updates
- ✅ Analytics and reporting
- ✅ Database persistence with Prisma ORM
- ✅ Graceful shutdown handling
- ✅ Comprehensive error handling
- ✅ Configurable via environment variables

## Environment Variables

See `.env.example` for configuration options:
- `PORT` - HTTP server port
- `MONITOR_INTERVAL_MS` - Monitoring interval
- `RETENTION_HOURS` - Data retention period
- `SPEED_DROP_THRESHOLD_MBPS` - Speed drop threshold
- `SIMULATION_MODE` - Enable simulation mode
- And more...

## Getting Started

```bash
# Install dependencies
npm install

# Run migrations
npx prisma migrate deploy

# Start server
npm start

# Development mode
npm run dev
```

## API Endpoints

- `GET /api/health` - Health check
- `GET /api/config` - Get configuration
- `GET /api/metrics/latest` - Latest measurement
- `GET /api/metrics/recent` - Recent measurements
- `GET /api/metrics/today` - Today's report
- `GET /api/reports?from=...&to=...` - Custom date range report
- `POST /api/monitor/trigger` - Trigger manual measurement
- `GET /api/events/recent` - Recent events
- `GET /api/events?from=...&to=...` - Events in date range
- `GET /api/database/stats` - Database statistics
- `POST /api/database/cleanup` - Clean old data
- `GET /api/statistics/detailed?from=...&to=...` - Detailed statistics

## Conclusion

This architecture provides a perfect balance between simplicity and maintainability. It's professional, clean, and appropriate for the scale of this application.

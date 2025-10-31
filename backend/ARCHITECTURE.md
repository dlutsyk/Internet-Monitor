# Backend Architecture Documentation

## Overview

This backend has been refactored to follow **MVC pattern** along with **GoF**, **GRASP**, and **SOLID** design principles.

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│                         Routes                               │
│                    (HTTP Endpoints)                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                      Controllers                             │
│         (HTTP Request/Response Handling)                     │
│   HealthController, MetricsController, etc.                  │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                       Services                               │
│                  (Business Logic)                            │
│  MonitorService, AnalyticsService, EventTrackerService       │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                    Repositories                              │
│               (Data Access Layer)                            │
│  MeasurementRepository, EventRepository                      │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                 Infrastructure                               │
│          (Database, Monitoring, WebSocket)                   │
└─────────────────────────────────────────────────────────────┘
```

## Design Patterns Applied

### 1. **MVC Pattern**
- **Model**: Domain models (Measurement, Event, Archive)
- **View**: HTTP responses, WebSocket messages
- **Controller**: Controllers handle HTTP requests and delegate to services

### 2. **Repository Pattern** (GoF)
- Abstracts data access logic
- `IMeasurementRepository`, `IEventRepository` interfaces
- Concrete implementations: `MeasurementRepository`, `EventRepository`
- **Benefits**: Easy to swap data sources, testable, follows DIP

### 3. **Strategy Pattern** (GoF)
- Different monitoring strategies
- `IMonitoringStrategy` interface
- Concrete strategies: `NetworkSpeedMonitor`, `SimulationMonitor`
- **Benefits**: Runtime strategy selection, easy to add new monitoring methods

### 4. **Factory Pattern** (GoF)
- `MonitoringStrategyFactory` creates monitoring strategies
- `Database` uses factory pattern for statement creation
- **Benefits**: Encapsulates object creation, follows OCP

### 5. **Singleton Pattern** (GoF)
- `Database` class ensures single connection instance
- **Benefits**: Prevents multiple database connections

### 6. **Observer Pattern** (GoF)
- `MonitorService` and `EventTrackerService` use EventEmitter
- Services emit events that others can subscribe to
- **Benefits**: Loose coupling, reactive programming

### 7. **Facade Pattern** (GoF)
- Services provide simplified interfaces to complex subsystems
- `AnalyticsService` hides complexity of computations
- **Benefits**: Simplified API, reduces coupling

### 8. **Dependency Injection** (IoC Pattern)
- All dependencies injected via constructors
- `DIContainer` manages object lifecycle
- **Benefits**: Testability, loose coupling, follows DIP

## SOLID Principles Applied

### 1. **Single Responsibility Principle (SRP)**
✅ **Before**: `api.js` mixed routing, validation, and business logic
✅ **After**: Separated into Controllers (HTTP), Services (business logic), Repositories (data access)

**Example**:
- `MetricsController` - only handles HTTP requests/responses
- `MonitorService` - only handles monitoring business logic
- `MeasurementRepository` - only handles data persistence

### 2. **Open/Closed Principle (OCP)**
✅ **Before**: Hard to extend without modifying existing code
✅ **After**:
- New monitoring strategies can be added without changing existing code
- New repositories can be added by implementing interfaces
- New services can be added without affecting existing ones

### 3. **Liskov Substitution Principle (LSP)**
✅ **Before**: Storage implementations not truly substitutable
✅ **After**:
- Any `IMonitoringStrategy` can replace another
- Any `IMeasurementRepository` can replace another
- Implementations honor interface contracts

### 4. **Interface Segregation Principle (ISP)**
✅ **Before**: Large classes with many methods
✅ **After**: Focused interfaces
- `IMeasurementRepository` - only measurement operations
- `IEventRepository` - only event operations
- `IMonitoringStrategy` - only measurement method

### 5. **Dependency Inversion Principle (DIP)**
✅ **Before**: High-level modules depended on low-level modules
✅ **After**:
- Services depend on repository interfaces, not concrete implementations
- MonitorService depends on `IMonitoringStrategy`, not concrete monitors
- Controllers depend on service abstractions

## GRASP Principles Applied

### 1. **Information Expert**
- Each class is responsible for operations on data it has
- `Measurement` model validates itself
- `MeasurementRepository` knows how to persist measurements

### 2. **Creator**
- Factories create objects (`MonitoringStrategyFactory`)
- Models have factory methods (`Measurement.fromDatabaseRow`)
- **Benefits**: Centralized object creation

### 3. **Controller**
- Controllers coordinate application flow
- Controllers don't contain business logic
- **Benefits**: Separation of concerns

### 4. **Low Coupling**
- Components depend on abstractions, not concrete classes
- Use of interfaces and dependency injection
- **Benefits**: Flexibility, testability

### 5. **High Cohesion**
- Each class has related responsibilities
- Services focus on single domain area
- **Benefits**: Maintainability, understandability

### 6. **Pure Fabrication**
- `DIContainer` - doesn't represent domain concept but provides services
- Factories - convenience classes for object creation

### 7. **Indirection**
- Repositories provide indirection between services and database
- Strategy pattern provides indirection for monitoring implementations

## Directory Structure

```
backend/src/
├── models/                      # Domain Models (Entities)
│   ├── Measurement.js          # Measurement entity
│   ├── Event.js                # Event entity
│   └── Archive.js              # Archive entity
│
├── repositories/                # Data Access Layer
│   ├── interfaces/
│   │   ├── IMeasurementRepository.js
│   │   └── IEventRepository.js
│   └── implementations/
│       ├── MeasurementRepository.js
│       └── EventRepository.js
│
├── services/                    # Business Logic Layer
│   ├── MonitorService.js       # Monitoring business logic
│   ├── AnalyticsService.js     # Analytics computations
│   ├── EventTrackerService.js  # Event tracking logic
│   ├── ArchiveService.js       # Archiving logic
│   └── SchedulerService.js     # Scheduling logic
│
├── controllers/                 # HTTP Request Handlers
│   ├── HealthController.js
│   ├── MetricsController.js
│   ├── ReportsController.js
│   ├── MonitorController.js
│   ├── ArchiveController.js
│   ├── EventController.js
│   └── StatisticsController.js
│
├── infrastructure/              # External Concerns
│   ├── database/
│   │   └── Database.js         # SQLite wrapper (Singleton)
│   ├── monitoring/
│   │   ├── IMonitoringStrategy.js       # Strategy interface
│   │   ├── NetworkSpeedMonitor.js       # Real monitoring
│   │   ├── SimulationMonitor.js         # Simulation
│   │   └── MonitoringStrategyFactory.js # Factory
│   └── websocket/
│       └── WebSocketServer.js  # WebSocket handling
│
├── middleware/                  # Express Middleware
│   ├── errorHandler.js
│   └── requestValidator.js
│
├── routes/                      # Route Definitions
│   └── index.js
│
├── utils/                       # Utilities
│   ├── logger.js
│   └── validators.js
│
├── container/                   # Dependency Injection
│   └── DIContainer.js
│
├── config/                      # Configuration
│   └── index.js
│
└── server.js                    # Application Entry Point
```

## Key Improvements

### Before vs After

| Aspect | Before | After |
|--------|--------|-------|
| **Architecture** | Procedural, mixed concerns | Layered MVC with clear separation |
| **Business Logic** | Scattered across files | Centralized in Services |
| **Data Access** | Direct database calls | Repository pattern |
| **Testability** | Hard to test, tightly coupled | Easy to test, loosely coupled |
| **Extensibility** | Requires modifying existing code | Can extend without modification |
| **Monitoring** | Hard-coded implementation | Strategy pattern, easily swappable |
| **Dependencies** | Hard-coded | Dependency injection |
| **Maintainability** | Low cohesion, high coupling | High cohesion, low coupling |

## Benefits of This Architecture

1. **Testability**: Easy to write unit tests with mocked dependencies
2. **Maintainability**: Clear structure, easy to find and fix bugs
3. **Scalability**: Easy to add new features without breaking existing code
4. **Flexibility**: Swap implementations easily (e.g., different data stores)
5. **Readability**: Code is self-documenting with clear responsibilities
6. **Reusability**: Services and repositories can be reused across application
7. **Team Collaboration**: Clear boundaries make parallel development easier

## Usage Example

```javascript
// Old way (tightly coupled)
const storage = new StorageSQLite(db, config.retentionHours);
const monitor = new Monitor({ storage, intervalMs, ... });

// New way (loosely coupled, dependency injection)
const container = new DIContainer(config);
await container.initialize();

const monitorService = container.get('monitorService');
const measurement = await monitorService.triggerMeasurement();
```

## Migration Path

The refactored code is designed to coexist with the old code. The migration strategy:

1. ✅ **Phase 1**: Create new architecture (Models, Repositories, Services)
2. 🔄 **Phase 2**: Create Controllers and refactor routes (In Progress)
3. ⏳ **Phase 3**: Create DI Container and wire everything together
4. ⏳ **Phase 4**: Update server.js to use new architecture
5. ⏳ **Phase 5**: Deprecate old files (optional, can keep for reference)

## Testing Strategy

Each layer can be tested independently:

```javascript
// Test Model
const measurement = new Measurement({ timestamp: '2024-01-01', status: 'online' });
assert(measurement.isOnline());

// Test Repository (with mock database)
const mockDb = createMockDatabase();
const repo = new MeasurementRepository(mockDb);
await repo.insert(measurement);

// Test Service (with mock repository)
const mockRepo = createMockRepository();
const service = new MonitorService(mockRepo, strategy);
await service.startMonitoring();

// Test Controller (with mock service)
const mockService = createMockService();
const controller = new MetricsController(mockService);
const response = await controller.getLatest(req, res);
```

## Next Steps

To complete the refactoring:

1. Finish implementing all Services
2. Create Controllers for all routes
3. Implement DI Container
4. Refactor routes to use Controllers
5. Refactor WebSocket to use Services
6. Update server.js to bootstrap the application
7. Write tests for all layers
8. Update documentation
9. Gradually migrate old code (if desired)

## Conclusion

This architecture provides a solid foundation for a maintainable, testable, and scalable application. It follows industry best practices and makes the codebase easier to understand and extend.

# Prisma Migration Summary

## Overview
The backend has been successfully migrated from using `better-sqlite3` directly to using Prisma ORM.

## Changes Made

### 1. Dependencies Added
- `@prisma/client` - Prisma Client for database operations
- `prisma` (dev dependency) - Prisma CLI for migrations and schema management

### 2. Database Configuration
- **Prisma Schema**: Created `prisma/schema.prisma` with:
  - SQLite datasource configuration
  - Measurement model (matching existing table structure)
  - Event model (matching existing table structure)
  - Proper indexes for performance

- **Environment Variable**: 
  - Created `.env` file with `DATABASE_URL="file:./data/monitor.db"`
  - Added to `.gitignore` (already present)

### 3. Code Updates

#### Database.js (`src/infrastructure/database/Database.js`)
- **Before**: Used `better-sqlite3` with manual SQL
- **After**: Uses Prisma Client with type-safe queries
- Key changes:
  - Replaced `DatabaseLib` with `PrismaClient`
  - Removed manual schema creation (handled by migrations)
  - Added `getClient()` method to access Prisma instance
  - Updated `getStats()` to use Prisma queries
  - Updated `vacuum()` to use `$executeRawUnsafe`

#### MeasurementRepository (`src/repositories/implementations/MeasurementRepository.js`)
- **Before**: Used `better-sqlite3` prepared statements
- **After**: Uses Prisma Client queries
- Converted all methods:
  - `insert()` - Uses `prisma.measurement.create()`
  - `findById()` - Uses `prisma.measurement.findUnique()`
  - `findRecent()` - Uses `prisma.measurement.findMany()`
  - `findByDateRange()` - Uses Prisma where clauses
  - `findLatest()` - Uses `prisma.measurement.findFirst()`
  - `deleteOlderThan()` - Uses `prisma.measurement.deleteMany()`
  - `count()` - Uses `prisma.measurement.count()`
  - `getDateRange()` - Uses Prisma queries with select
  - `getLastState()` - Uses Prisma with select

#### EventRepository (`src/repositories/implementations/EventRepository.js`)
- **Before**: Used `better-sqlite3` prepared statements
- **After**: Uses Prisma Client queries
- Converted all methods:
  - `insert()` - Uses `prisma.event.create()`
  - `findById()` - Uses `prisma.event.findUnique()`
  - `findRecent()` - Uses `prisma.event.findMany()`
  - `findByDateRange()` - Uses Prisma where clauses
  - `findByType()` - Uses Prisma where with type filter
  - `deleteOlderThan()` - Uses `prisma.event.deleteMany()`
  - `count()` - Uses `prisma.event.count()`
  - `getDateRange()` - Uses Prisma queries with select

### 4. Docker Configuration

#### package.json
Added scripts:
```json
"prisma:generate": "prisma generate",
"prisma:migrate": "prisma migrate deploy",
"prisma:migrate:dev": "prisma migrate dev",
"prisma:studio": "prisma studio",
"postinstall": "prisma generate"
```

#### Dockerfile
- Modified build stage to copy Prisma schema
- Run `npm ci` to install all dependencies (including Prisma dev dependencies)
- Generate Prisma Client during build
- Copy Prisma schema and migrations to production stage

#### docker-entrypoint.sh
- Added Prisma migration deployment before starting the application
- Runs `npx prisma migrate deploy` as the node user
- **Automatic baseline handling**: If the database already exists with schema (P3005 error):
  1. Marks the initial migration as applied using `prisma migrate resolve --applied`
  2. Then deploys any new migrations
- This allows seamless migration from existing database to Prisma-managed migrations

#### docker-compose.yml
- Added `DATABASE_URL` environment variable
- Set to `file:/app/data/monitor.db` to match volume mount

#### .dockerignore
- Updated to NOT exclude Prisma schema and migrations (needed in Docker)
- Added `.env` to excluded files
- Added comment explaining Prisma needs

### 5. Migrations
- Created initial migration `20251101075837_init`
- Migration marked as applied (database already existed with correct schema)
- Migration files located in `prisma/migrations/`

## Benefits of Prisma

1. **Type Safety**: Prisma Client provides full TypeScript/JSDoc types
2. **Better DX**: Autocomplete and IntelliSense in IDEs
3. **Migration Management**: Declarative schema with migration tracking
4. **Query Builder**: More readable and maintainable than raw SQL
5. **Consistent API**: Same patterns across all repositories
6. **Database Agnostic**: Easier to switch databases if needed in future

## Backward Compatibility

- The `better-sqlite3` dependency is still present in case of rollback
- All repository interfaces remain unchanged
- No changes required in services or controllers
- Database schema and data remain intact

## Testing

To verify the migration works:

1. **Development**:
   ```bash
   cd backend
   npm run dev
   ```

2. **Docker**:
   ```bash
   docker-compose up --build
   ```

3. **Prisma Studio** (Database GUI):
   ```bash
   cd backend
   npm run prisma:studio
   ```

## Future Migrations

To create new migrations:

1. **Development**:
   ```bash
   cd backend
   npm run prisma:migrate:dev
   ```

2. **Production** (Docker):
   - Migrations are automatically deployed via `docker-entrypoint.sh`
   - Or manually: `npm run prisma:migrate`

## Troubleshooting

### P3005 Error: "The database schema is not empty"

If you encounter this error when running migrations:

```
Error: P3005
The database schema is not empty.
```

This happens when Prisma tries to apply migrations to an existing database. The `docker-entrypoint.sh` script automatically handles this by:

1. Detecting the migration failure
2. Running `prisma migrate resolve --applied "20251101075837_init"` to baseline
3. Deploying any remaining migrations

**Manual Fix** (if needed):
```bash
# In the container or locally
npx prisma migrate resolve --applied "20251101075837_init"
npx prisma migrate deploy
```

### Missing Prisma Client

If you see errors about `@prisma/client` not being found:

```bash
# Regenerate Prisma Client
npm run prisma:generate
```

### Database Connection Issues

Check the `DATABASE_URL` environment variable:
- Local: Should be set in `.env` file
- Docker: Should be set in `docker-compose.yml`

## Rollback Plan

If issues occur:
1. Restore original `Database.js` from git history
2. Restore original repository implementations
3. Remove Prisma dependencies from `package.json`
4. Revert Docker configuration changes

## Next Steps (Optional)

1. **Remove better-sqlite3**: Once fully tested, can remove the old dependency
2. **Add Prisma Accelerate**: For query caching in production
3. **Add Prisma Pulse**: For real-time database events
4. **TypeScript Migration**: Leverage Prisma's full type safety with TypeScript

#!/bin/sh
set -e

# Ensure data directory exists and has correct permissions
if [ -d "/app/data" ]; then
    echo "[entrypoint] Ensuring /app/data has correct permissions..."

    # Fix ownership if running as root
    if [ "$(id -u)" = '0' ]; then
        chown -R node:node /app/data
        echo "[entrypoint] Changed ownership of /app/data to node:node"

        # Run Prisma migrations as node user
        echo "[entrypoint] Running Prisma migrations as node user..."

        # Temporarily disable exit on error for migration handling
        set +e
        su-exec node npx prisma migrate deploy 2>&1
        MIGRATE_EXIT_CODE=$?
        set -e

        # If migration failed, try to baseline the database
        if [ $MIGRATE_EXIT_CODE -ne 0 ]; then
            echo "[entrypoint] Migration deploy failed. Attempting to baseline existing database..."

            # Mark the initial migration as applied (baseline for existing database)
            su-exec node npx prisma migrate resolve --applied "20251101075837_init" || true

            # Try to deploy remaining migrations
            echo "[entrypoint] Deploying remaining migrations..."
            su-exec node npx prisma migrate deploy || echo "[entrypoint] No new migrations to apply"
        else
            echo "[entrypoint] Migrations deployed successfully"
        fi

        # Execute the main command as the node user
        exec su-exec node "$@"
    fi
fi

# If not root, run Prisma migrations and execute the command
echo "[entrypoint] Running Prisma migrations..."

# Temporarily disable exit on error for migration handling
set +e
npx prisma migrate deploy 2>&1
MIGRATE_EXIT_CODE=$?
set -e

# If migration failed, try to baseline the database
if [ $MIGRATE_EXIT_CODE -ne 0 ]; then
    echo "[entrypoint] Migration deploy failed. Attempting to baseline existing database..."

    # Mark the initial migration as applied (baseline for existing database)
    npx prisma migrate resolve --applied "20251101075837_init" || true

    # Try to deploy remaining migrations
    echo "[entrypoint] Deploying remaining migrations..."
    npx prisma migrate deploy || echo "[entrypoint] No new migrations to apply"
else
    echo "[entrypoint] Migrations deployed successfully"
fi

exec "$@"

#!/bin/bash
# Internet Monitor - Database Cleanup Script
# Usage: ./cleanup-db.sh [backup|reset|clean-old|truncate]

set -e

BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Create backup directory
mkdir -p "$BACKUP_DIR"

function backup_database() {
    echo "📦 Creating backup..."
    docker exec internet-monitor-backend cat /app/data/monitor.db > "$BACKUP_DIR/monitor-backup-$TIMESTAMP.db"
    echo "✅ Backup saved: $BACKUP_DIR/monitor-backup-$TIMESTAMP.db"
}

function reset_database() {
    echo "⚠️  RESETTING DATABASE - ALL DATA WILL BE LOST!"
    read -p "Type 'yes' to confirm: " confirm
    if [ "$confirm" != "yes" ]; then
        echo "❌ Aborted"
        exit 1
    fi
    
    backup_database
    
    echo "🔄 Stopping containers..."
    docker-compose down
    
    echo "🗑️  Removing volume..."
    docker volume rm internetmonitor_backend-data || true
    
    echo "🚀 Starting fresh..."
    docker-compose up -d
    
    echo "✅ Database reset complete!"
}

function clean_old_data() {
    local days=${1:-7}
    echo "🧹 Cleaning data older than $days days..."
    
    backup_database
    
    docker exec -it internet-monitor-backend sqlite3 /app/data/monitor.db << SQL
DELETE FROM measurements WHERE timestamp < datetime('now', '-$days days');
DELETE FROM events WHERE timestamp < datetime('now', '-$days days');
VACUUM;
.quit
SQL
    
    echo "✅ Old data cleaned!"
}

function truncate_tables() {
    echo "⚠️  TRUNCATING ALL TABLES - ALL DATA WILL BE LOST!"
    read -p "Type 'yes' to confirm: " confirm
    if [ "$confirm" != "yes" ]; then
        echo "❌ Aborted"
        exit 1
    fi
    
    backup_database
    
    echo "🗑️  Truncating tables..."
    docker exec -it internet-monitor-backend sqlite3 /app/data/monitor.db << SQL
DELETE FROM measurements;
DELETE FROM events;
VACUUM;
.quit
SQL
    
    docker-compose restart backend
    echo "✅ Tables truncated!"
}

function show_usage() {
    cat << USAGE
Internet Monitor - Database Cleanup

Usage:
  ./cleanup-db.sh backup              Create backup only
  ./cleanup-db.sh reset               Complete reset (deletes volume)
  ./cleanup-db.sh clean-old [days]    Delete data older than N days (default: 7)
  ./cleanup-db.sh truncate            Empty all tables (keep schema)

Examples:
  ./cleanup-db.sh backup              
  ./cleanup-db.sh clean-old 30        # Delete data older than 30 days
  ./cleanup-db.sh reset               

Backups are stored in: $BACKUP_DIR/
USAGE
}

# Main script
case "${1:-}" in
    backup)
        backup_database
        ;;
    reset)
        reset_database
        ;;
    clean-old)
        clean_old_data "${2:-7}"
        ;;
    truncate)
        truncate_tables
        ;;
    *)
        show_usage
        exit 1
        ;;
esac

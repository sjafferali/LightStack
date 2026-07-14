#!/bin/sh
set -e

echo "Starting Python Web App Template..."

# Check if required environment variables are set
if [ -z "$SECRET_KEY" ]; then
    echo "WARNING: SECRET_KEY not set, using default (not secure for production!)"
fi

# Create necessary directories
mkdir -p /app/logs /app/data

# Database initialization based on type
if [ "$DATABASE_TYPE" = "postgresql" ]; then
    echo "Using PostgreSQL database"

    # Wait for PostgreSQL to be ready
    if [ -n "$POSTGRES_HOST" ] && [ -n "$POSTGRES_PORT" ]; then
        echo "Waiting for PostgreSQL to be ready..."
        # Try different methods to check PostgreSQL connectivity
        if command -v nc >/dev/null 2>&1; then
            while ! nc -z "$POSTGRES_HOST" "$POSTGRES_PORT"; do
                echo "PostgreSQL is unavailable - sleeping"
                sleep 1
            done
        elif command -v python3 >/dev/null 2>&1; then
            while ! python3 -c "import socket; socket.create_connection(('$POSTGRES_HOST', $POSTGRES_PORT), 1).close()" 2>/dev/null; do
                echo "PostgreSQL is unavailable - sleeping"
                sleep 1
            done
        else
            # Just wait a fixed time if no connectivity check is available
            echo "No connectivity check available, waiting 10 seconds..."
            sleep 10
        fi
        echo "PostgreSQL is up!"
    fi
else
    echo "Using SQLite database"
    # Ensure SQLite database file exists
    if [ -n "$SQLITE_DATABASE_PATH" ]; then
        touch "$SQLITE_DATABASE_PATH"
    fi
fi

# Run database migrations
# Alembic owns the schema, so this runs before the app serves any traffic. A
# database left behind by an older release has the tables but no migration
# history; the migration runner adopts it at the initial revision so that later
# revisions apply to it. A failure here leaves the schema behind the code, so it
# stops the container rather than serving requests against the wrong columns.
echo "Applying database migrations..."
cd /app/backend
python -m scripts.migrate

# Set WORKERS - default to 1 for WebSocket state consistency
# Multiple workers would each have their own ConnectionManager instance,
# causing WebSocket broadcasts to fail (REST handlers can't see WS connections
# in other workers). To scale beyond 1 worker, implement Redis pub/sub.
if [ -z "$WORKERS" ]; then
    WORKERS=1
    echo "WORKERS not set, defaulting to 1 (required for WebSocket state sharing)"
fi
export WORKERS

# Start supervisord
echo "Starting application services..."
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf

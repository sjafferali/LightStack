# Installation

This guide covers how to install and deploy LightStack.

## Prerequisites

- Docker and Docker Compose (recommended)
- Or: Python 3.11+, Node.js 20+, PostgreSQL 15+

## Docker Compose (Recommended)

The easiest way to run LightStack is with Docker Compose.

### 1. Clone the Repository

```bash
git clone https://github.com/sjafferali/LightStack.git
cd LightStack
```

### 2. Configure Environment (Optional)

Copy the example environment file and customize if needed:

```bash
cp .env.example .env
```

Edit `.env` to set your passwords:

```bash
POSTGRES_PASSWORD=your-secure-password
SECRET_KEY=your-secret-key
```

> **Tip**: Generate a secure secret key with:
> ```bash
> python -c "import secrets; print(secrets.token_urlsafe(32))"
> ```

### 3. Start LightStack

```bash
docker-compose up -d
```

This starts:
- **LightStack** application on port 8080
- **PostgreSQL** database

### 4. Verify Installation

Open http://localhost:8080 in your browser. You should see the LightStack dashboard.

Check API health:
```bash
curl http://localhost:8080/api/health
```

## Docker (Manual)

If you prefer to run containers manually:

### 1. Create a Network

```bash
docker network create lightstack-network
```

### 2. Start PostgreSQL

```bash
docker run -d \
  --name lightstack-postgres \
  --network lightstack-network \
  -e POSTGRES_USER=lightstack \
  -e POSTGRES_PASSWORD=changeme \
  -e POSTGRES_DB=lightstack \
  -v lightstack-postgres-data:/var/lib/postgresql/data \
  postgres:15-alpine
```

### 3. Start LightStack

```bash
docker run -d \
  --name lightstack \
  --network lightstack-network \
  -p 8080:8080 \
  -e DATABASE_TYPE=postgresql \
  -e POSTGRES_HOST=lightstack-postgres \
  -e POSTGRES_USER=lightstack \
  -e POSTGRES_PASSWORD=changeme \
  -e POSTGRES_DB=lightstack \
  sjafferali/lightstack:latest
```

## Manual Installation

For development or when Docker isn't available.

### 1. Install PostgreSQL

Install PostgreSQL 15+ and create a database:

```sql
CREATE USER lightstack WITH PASSWORD 'your-password';
CREATE DATABASE lightstack OWNER lightstack;
```

### 2. Install Backend

```bash
cd backend

# Install Poetry if not already installed
curl -sSL https://install.python-poetry.org | python3 -

# Install dependencies
poetry install

# Run database migrations
poetry run alembic upgrade head

# Start the backend
poetry run uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### 3. Install Frontend

```bash
cd frontend

# Install dependencies
npm install

# Build for production
npm run build
```

The built files will be in `frontend/dist/`. Serve them with nginx or another web server.

## Updating

### Docker Compose

```bash
# Pull latest image
docker-compose pull

# Restart with new image
docker-compose up -d
```

### Manual

```bash
# Pull latest code
git pull

# Update backend dependencies
cd backend && poetry install

# Run any new migrations
poetry run alembic upgrade head

# Update frontend
cd ../frontend && npm install && npm run build
```

## Uninstalling

### Docker Compose

```bash
# Stop and remove containers
docker-compose down

# Remove volumes (deletes all data)
docker-compose down -v
```

## Next Steps

- [Configuration](configuration.md) - Configure LightStack for your environment
- [Quick Start](quickstart.md) - Learn the basics
- [Home Assistant Integration](../integrations/home-assistant.md) - Connect to Home Assistant

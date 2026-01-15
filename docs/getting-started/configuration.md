# Configuration

LightStack is configured through environment variables. This guide covers all available options.

## Environment Variables

### Database Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_TYPE` | `sqlite` | Database type: `sqlite` or `postgresql` |
| `POSTGRES_HOST` | `localhost` | PostgreSQL host |
| `POSTGRES_PORT` | `5432` | PostgreSQL port |
| `POSTGRES_USER` | `postgres` | PostgreSQL username |
| `POSTGRES_PASSWORD` | `postgres` | PostgreSQL password |
| `POSTGRES_DB` | `webapp` | PostgreSQL database name |
| `SQLITE_DATABASE_PATH` | `./webapp.db` | SQLite database file path |

### Application Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `ENVIRONMENT` | `development` | Environment name |
| `DEBUG` | `true` | Enable debug mode |
| `SECRET_KEY` | (required) | Secret key for sessions |
| `HOST` | `0.0.0.0` | Server bind host |
| `PORT` | `8000` | Server bind port |
| `WORKERS` | `1` | Number of worker processes |

### Security Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `CORS_ORIGINS` | `["http://localhost:3000","http://localhost:5173"]` | Allowed CORS origins (JSON array) |
| `RATE_LIMIT_ENABLED` | `true` | Enable rate limiting |
| `RATE_LIMIT_REQUESTS` | `100` | Requests per period |
| `RATE_LIMIT_PERIOD` | `60` | Rate limit period in seconds |

## Docker Compose Configuration

When using Docker Compose, set variables in a `.env` file:

```bash
# .env
POSTGRES_PASSWORD=your-secure-password
SECRET_KEY=your-secret-key-here
```

Or override in `docker-compose.yml`:

```yaml
services:
  lightstack:
    environment:
      - POSTGRES_PASSWORD=your-password
      - SECRET_KEY=your-secret-key
```

## Production Configuration

For production deployments, ensure you:

### 1. Set Secure Passwords

```bash
# Generate a secure secret key
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 2. Use PostgreSQL

SQLite is not recommended for production. Always use PostgreSQL:

```bash
DATABASE_TYPE=postgresql
POSTGRES_HOST=your-postgres-host
POSTGRES_PASSWORD=secure-password
```

### 3. Configure CORS

Restrict CORS to your actual domain:

```bash
CORS_ORIGINS=["https://your-domain.com"]
```

### 4. Enable Rate Limiting

```bash
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_PERIOD=60
```

### 5. Set Production Environment

```bash
ENVIRONMENT=production
DEBUG=false
```

## Example Configurations

### Minimal Production

```bash
DATABASE_TYPE=postgresql
POSTGRES_HOST=postgres
POSTGRES_PASSWORD=secure-password-here
POSTGRES_DB=lightstack
SECRET_KEY=generated-secret-key
ENVIRONMENT=production
DEBUG=false
```

### Development

```bash
DATABASE_TYPE=postgresql
POSTGRES_HOST=localhost
POSTGRES_USER=lightstack
POSTGRES_PASSWORD=devpassword
POSTGRES_DB=lightstack_dev
ENVIRONMENT=development
DEBUG=true
```

### Home Assistant Add-on

When running as a Home Assistant add-on:

```bash
DATABASE_TYPE=sqlite
SQLITE_DATABASE_PATH=/data/lightstack.db
SECRET_KEY=auto-generated
```

## Priority Configuration

Alert priorities are configured in the application, not through environment variables. Use the web UI or API to configure default priorities for each alert key.

| Priority | Label | Description |
|----------|-------|-------------|
| 1 | Critical | Highest priority - security alerts, emergencies |
| 2 | High | Important alerts - doors left open |
| 3 | Medium | Default priority level |
| 4 | Low | Minor alerts - appliance notifications |
| 5 | Info | Informational - lowest priority |

## Next Steps

- [Quick Start](quickstart.md) - Learn the basics
- [API Overview](../api/README.md) - Explore the API
- [Home Assistant Integration](../integrations/home-assistant.md) - Connect to Home Assistant

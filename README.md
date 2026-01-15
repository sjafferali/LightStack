# LightStack

A priority-based alert management system for Home Assistant, designed specifically for Inovelli light switches with notification LEDs.

## The Problem

Inovelli switches feature an LED notification bar that can display different colors and effects—perfect for home automation alerts. However, when using these LEDs with Home Assistant to indicate multiple alerts, managing concurrent notifications becomes problematic:

1. **Lost Alerts**: With multiple active alerts, only one LED state can be displayed at a time, causing others to be "lost" visually
2. **Incorrect State on Clear**: When one alert clears, the LED resets to "all clear" even if other alerts are still active

**Example Timeline:**
```
alert 1 fires → switch displays alert 1
alert 2 fires → switch displays alert 2
alert 2 clears → switch shows "all clear" ❌ (alert 1 is still active!)
```

## The Solution

LightStack acts as a centralized alert state manager that:

- **Tracks all active alerts** - Maintains state for all alerts, not just the currently displayed one
- **Priority-based display** - Configurable priority levels ensure the most important alert is always shown
- **Proper state management** - When an alert clears, the next highest-priority active alert is displayed instead of "all clear"

**With LightStack:**
```
alert 1 fires → switch displays alert 1
alert 2 fires → switch displays alert 2 (if higher priority)
alert 2 clears → switch displays alert 1 ✓ (correctly shows remaining alert)
```

## Tech Stack

### Backend (Python/FastAPI)
- **FastAPI** framework with async support
- **SQLAlchemy** ORM with PostgreSQL and SQLite support
- **Alembic** database migrations (auto-run on startup)
- **Poetry** for dependency management
- **JWT authentication** ready to implement
- **Pydantic** for data validation
- **Structured logging** with structlog
- **Health check endpoints**
- **CORS configuration**
- **Rate limiting** support
- **Environment-based configuration**

### Frontend (React/Vite)
- **React 18** with TypeScript
- **Vite** for fast development and building
- **React Query** for server state management
- **React Router** for navigation
- **Tailwind CSS** for styling
- **Axios** for API calls
- **React Hook Form** for forms
- **Hot Module Replacement** for development
- **ESLint** and **Prettier** configured

### DevOps & CI/CD
- **Single Docker image** containing both frontend and backend
- **GitHub Actions** CI/CD pipeline
- **Automated tests** on every commit
- **Docker Hub** integration
- **Local CI script** that mirrors GitHub Actions
- **Auto-fixing** for common linting issues
- **Multi-stage Docker builds** for optimized images
- **nginx** reverse proxy included
- **Supervisor** for process management

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Python 3.11+ (for local development)
- Node.js 20+ (for local development)
- Poetry (for Python dependency management)

### Using Docker Compose (Recommended)

1. Clone the repository:
```bash
git clone https://github.com/sjafferali/LightStack.git
cd LightStack
```

2. Copy the environment file:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Build and run with Docker Compose:
```bash
docker-compose up --build
```

The application will be available at:
- Full application: http://localhost:8080
- API documentation: http://localhost:8080/api/docs
- API health check: http://localhost:8080/api/health

### Local Development

#### Backend Setup

1. Install Poetry:
```bash
curl -sSL https://install.python-poetry.org | python3 -
```

2. Install backend dependencies:
```bash
poetry install
```

3. Run database migrations:
```bash
cd backend
alembic upgrade head
```

4. Start the backend:
```bash
poetry run uvicorn backend.app.main:app --reload --port 8000
```

#### Frontend Setup

1. Install frontend dependencies:
```bash
cd frontend
npm install
```

2. Start the frontend development server:
```bash
npm run dev
```

The frontend will be available at http://localhost:5173

### Development with Docker Compose

For development with hot-reloading:

```bash
docker-compose -f docker-compose.dev.yml up
```

This will:
- Run the backend with auto-reload at http://localhost:8000
- Run the frontend with HMR at http://localhost:5173
- Start PostgreSQL database
- Start Adminer at http://localhost:8081 for database management

## Running Tests

### Local CI Checks

Run all CI checks locally (tests, linting, type checking):

```bash
./scripts/run_ci_checks.sh
```

Options:
- `--skip-tests`: Skip running tests
- `--skip-lint`: Skip linting checks
- `--include-docker`: Include Docker build test
- `--no-auto-fix`: Disable automatic fixes
- `--frontend-only`: Run only frontend checks
- `--backend-only`: Run only backend checks
- `--postgres`: Use PostgreSQL for tests (requires Docker)

### Backend Tests

```bash
poetry run pytest
# With coverage
poetry run pytest --cov=backend/app --cov-report=html
```

### Frontend Tests

```bash
cd frontend
npm run type-check
npm run lint
npm run build
```

## Project Structure

```
.
├── backend/
│   ├── app/
│   │   ├── api/          # API endpoints
│   │   ├── core/         # Core functionality (database, security)
│   │   ├── models/       # SQLAlchemy models
│   │   ├── services/     # Business logic
│   │   ├── utils/        # Utility functions
│   │   ├── config.py     # Configuration management
│   │   └── main.py       # FastAPI application
│   ├── tests/            # Backend tests
│   └── alembic/          # Database migrations
├── frontend/
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   ├── services/     # API services
│   │   ├── hooks/        # Custom hooks
│   │   ├── utils/        # Utility functions
│   │   ├── App.tsx       # Main application component
│   │   └── main.tsx      # Application entry point
│   └── public/           # Static assets
├── deployment/
│   ├── nginx/            # nginx configuration
│   ├── supervisor/       # Supervisor configuration
│   └── scripts/          # Deployment scripts
├── scripts/
│   └── run_ci_checks.sh  # Local CI script
├── .github/
│   └── workflows/        # GitHub Actions workflows
├── docker-compose.yml     # Production Docker Compose
├── docker-compose.dev.yml # Development Docker Compose
├── Dockerfile             # Multi-stage Dockerfile
├── pyproject.toml         # Python dependencies and configuration
└── README.md              # This file
```

## GitHub Actions Setup

To enable CI/CD with GitHub Actions:

1. **Set up repository variables** in GitHub Settings → Secrets and variables → Actions:
   - `DOCKER_IMAGE_NAME`: Your Docker Hub image name (e.g., `sjafferali/lightstack`)

2. **Set up secrets**:
   - `DOCKERHUB_USERNAME`: Your Docker Hub username
   - `DOCKERHUB_TOKEN`: Your Docker Hub access token
   - `CODECOV_TOKEN` (optional): For coverage reports
   - `WEBHOOK_URL` (optional): For deployment notifications
   - `WEBHOOK_SECRET` (optional): Webhook secret

The CI/CD pipeline will:
- Run all tests on every push
- Check code quality with linters
- Build Docker images on main branch
- Push to Docker Hub with proper tags
- Support semantic versioning with git tags

## Configuration

### Environment Variables

Key environment variables (see `.env.example` for all options):

- `DATABASE_TYPE`: `sqlite` or `postgresql`
- `SECRET_KEY`: Secret key for JWT tokens (generate a secure one for production)
- `POSTGRES_*`: PostgreSQL connection settings
- `CORS_ORIGINS`: Allowed CORS origins
- `RATE_LIMIT_*`: Rate limiting configuration

### Database

The template supports both PostgreSQL and SQLite:
- PostgreSQL for production
- SQLite for development/testing

Migrations run automatically on container startup.

### Adding New Features

#### Backend Endpoint
1. Create a new router in `backend/app/api/v1/endpoints/`
2. Add the router to `backend/app/api/v1/router.py`
3. Create models in `backend/app/models/`
4. Create services in `backend/app/services/`
5. Add tests in `backend/tests/`

#### Frontend Page
1. Create components in `frontend/src/components/`
2. Create pages in `frontend/src/pages/`
3. Add routes to your router configuration
4. Create API services in `frontend/src/services/`

## Production Deployment

### Using Docker

Build the production image:

```bash
docker build -t lightstack:latest .
```

Run in production:

```bash
docker run -d \
  -p 8080:8080 \
  --env-file .env \
  --name lightstack \
  lightstack:latest
```

### Using Docker Compose

1. Update the image name in `docker-compose.yml`
2. Set production environment variables
3. Run:

```bash
docker-compose up -d
```

### Health Checks

The application provides health check endpoints:
- `/api/health`: Basic health check
- `/api/health/ready`: Readiness check (includes database connectivity)

## Security Considerations

- Always use strong `SECRET_KEY` in production
- Enable HTTPS in production (configure nginx)
- Keep dependencies updated
- Use environment variables for sensitive data
- Enable rate limiting
- Configure CORS properly
- Use PostgreSQL in production (not SQLite)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting: `./scripts/run_ci_checks.sh`
5. Commit your changes
6. Push to your fork
7. Create a pull request

## License

MIT License

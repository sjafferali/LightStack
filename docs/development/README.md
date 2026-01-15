# Development Guide

This section covers development setup and contribution guidelines for LightStack.

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- Docker and Docker Compose (optional, for database)
- Git

### Clone the Repository

```bash
git clone https://github.com/sjafferali/LightStack.git
cd LightStack
```

### Development Options

1. **Full Docker Development** - Easiest, uses Docker Compose for everything
2. **Hybrid Development** - Docker for database, local for app
3. **Full Local Development** - Everything runs locally

## Full Docker Development

Use the development Docker Compose file:

```bash
docker-compose -f docker-compose.dev.yml up --build
```

This starts:
- Backend on port 8080
- Frontend on port 5173 (with hot reload)
- PostgreSQL on port 5432

## Hybrid Development

### Start the Database

```bash
docker-compose up postgres
```

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Configure environment
export DATABASE_TYPE=postgresql
export POSTGRES_HOST=localhost
export POSTGRES_DB=lightstack
export POSTGRES_USER=lightstack
export POSTGRES_PASSWORD=lightstack

# Run migrations
alembic upgrade head

# Start the server
uvicorn app.main:app --reload --port 8080
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

## Full Local Development

### Using SQLite (No Docker)

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Configure for SQLite
export DATABASE_TYPE=sqlite
export SQLITE_PATH=./lightstack.db

# Run migrations
alembic upgrade head

# Start the server
uvicorn app.main:app --reload --port 8080
```

## Documentation Structure

```
docs/
├── README.md                 # This file
├── getting-started/          # Installation and setup
│   ├── installation.md
│   ├── configuration.md
│   └── quickstart.md
├── api/                      # API reference
│   ├── README.md
│   ├── alerts.md
│   ├── alert-configs.md
│   ├── history.md
│   └── stats.md
├── frontend/                 # Frontend documentation
│   ├── README.md
│   ├── components.md
│   └── pages.md
├── integrations/             # Integration guides
│   └── home-assistant.md
├── development/              # Development guides
│   ├── README.md
│   ├── backend.md
│   └── frontend.md
└── database/                 # Database documentation
    └── schema.md
```

## Development Guides

- [Backend Development](backend.md) - Python/FastAPI development
- [Frontend Development](frontend.md) - React/TypeScript development

## Code Style

### Python

- Follow PEP 8
- Use type hints
- Format with `black`
- Lint with `ruff`

### TypeScript

- Use strict mode
- Prefer functional components
- Use React Query for data fetching
- Follow ESLint rules

## Testing

### Backend Tests

```bash
cd backend
pytest
```

### Frontend Tests

```bash
cd frontend
npm run test
```

### Type Checking

```bash
# Backend
cd backend
mypy app

# Frontend
cd frontend
npm run type-check
```

## Building for Production

### Docker Build

```bash
docker build -t lightstack:latest .
```

### Manual Build

```bash
# Build frontend
cd frontend
npm run build

# The built files are served by the backend
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run tests and type checking
5. Submit a pull request

## See Also

- [Backend Development](backend.md)
- [Frontend Development](frontend.md)
- [Database Schema](../database/schema.md)

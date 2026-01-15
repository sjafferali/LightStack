# Backend Development

This guide covers the backend architecture, development patterns, and best practices.

## Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Framework | FastAPI | Web framework |
| ORM | SQLAlchemy 2.0 | Database access |
| Migrations | Alembic | Schema migrations |
| Validation | Pydantic | Request/response validation |
| Server | Uvicorn | ASGI server |
| Database | PostgreSQL/SQLite | Data storage |

## Project Structure

```
backend/
├── alembic/                  # Database migrations
│   ├── versions/             # Migration files
│   ├── env.py               # Migration environment
│   └── script.py.mako       # Migration template
├── app/
│   ├── api/
│   │   └── v1/
│   │       ├── endpoints/   # Route handlers
│   │       │   ├── alerts.py
│   │       │   ├── alert_configs.py
│   │       │   ├── history.py
│   │       │   └── stats.py
│   │       └── router.py    # API router
│   ├── core/
│   │   ├── config.py        # App configuration
│   │   └── database.py      # Database setup
│   ├── models/
│   │   ├── __init__.py
│   │   ├── base.py          # SQLAlchemy base
│   │   └── alert.py         # Alert models
│   ├── schemas/
│   │   └── alert.py         # Pydantic schemas
│   ├── services/
│   │   └── alert_service.py # Business logic
│   └── main.py              # Application entry
├── requirements.txt
└── Dockerfile
```

## Core Components

### Configuration (`app/core/config.py`)

Environment-based configuration using Pydantic settings:

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Database settings
    database_type: str = "sqlite"
    sqlite_path: str = "./lightstack.db"
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_db: str = "lightstack"
    postgres_user: str = "lightstack"
    postgres_password: str = "lightstack"

    # App settings
    api_v1_prefix: str = "/api/v1"

    class Config:
        env_file = ".env"
```

### Database (`app/core/database.py`)

Async SQLAlchemy setup with support for both PostgreSQL and SQLite:

```python
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

# PostgreSQL for production
engine = create_async_engine(
    "postgresql+asyncpg://user:pass@host/db",
    pool_size=5,
    max_overflow=10
)

# SQLite for development
engine = create_async_engine(
    "sqlite+aiosqlite:///./lightstack.db"
)

async_session = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)
```

### Models (`app/models/alert.py`)

SQLAlchemy ORM models:

```python
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import Base

class AlertConfig(Base):
    __tablename__ = "alert_configs"

    id = Column(Integer, primary_key=True)
    alert_key = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=True)
    description = Column(String, nullable=True)
    default_priority = Column(Integer, default=3)
    led_color = Column(Integer, default=0)
    led_effect = Column(Integer, default=1)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    alerts = relationship("Alert", back_populates="config")

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True)
    alert_key = Column(String, ForeignKey("alert_configs.alert_key"), nullable=False)
    is_active = Column(Boolean, default=False)
    priority = Column(Integer, nullable=True)  # Override priority
    last_triggered_at = Column(DateTime, nullable=True)

    config = relationship("AlertConfig", back_populates="alerts")

    @property
    def effective_priority(self):
        """Return override priority or fall back to config default."""
        return self.priority if self.priority is not None else self.config.default_priority
```

### Schemas (`app/schemas/alert.py`)

Pydantic models for request/response validation:

```python
from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class AlertConfigCreate(BaseModel):
    alert_key: str
    name: Optional[str] = None
    description: Optional[str] = None
    default_priority: int = 3
    led_color: int = 0
    led_effect: int = 1

class AlertConfigResponse(BaseModel):
    id: int
    alert_key: str
    name: Optional[str]
    description: Optional[str]
    default_priority: int
    led_color: int
    led_effect: int
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True

class AlertTriggerRequest(BaseModel):
    priority: Optional[int] = None
    note: Optional[str] = None
```

### Services (`app/services/alert_service.py`)

Business logic layer:

```python
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.alert import Alert, AlertConfig, AlertHistory

class AlertService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def trigger_alert(
        self,
        alert_key: str,
        priority: int | None = None,
        note: str | None = None
    ) -> Alert:
        # Get or create config
        config = await self._get_or_create_config(alert_key)

        # Get or create alert
        alert = await self._get_or_create_alert(alert_key)

        # Update alert state
        alert.is_active = True
        alert.priority = priority
        alert.last_triggered_at = datetime.utcnow()

        # Log to history
        history = AlertHistory(
            alert_key=alert_key,
            action="triggered",
            note=note
        )
        self.db.add(history)

        await self.db.commit()
        return alert

    async def get_current_display(self) -> Alert | None:
        """Get the highest priority active alert."""
        result = await self.db.execute(
            select(Alert)
            .join(AlertConfig)
            .where(Alert.is_active == True)
            .order_by(
                Alert.priority.nullsfirst(),
                AlertConfig.default_priority
            )
            .limit(1)
        )
        return result.scalar_one_or_none()
```

### Endpoints (`app/api/v1/endpoints/alerts.py`)

Route handlers:

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.alert_service import AlertService
from app.schemas.alert import AlertTriggerRequest, AlertResponse

router = APIRouter(prefix="/alerts", tags=["alerts"])

@router.post("/{alert_key}/trigger", response_model=AlertResponse)
async def trigger_alert(
    alert_key: str,
    request: AlertTriggerRequest = None,
    db: AsyncSession = Depends(get_db)
):
    service = AlertService(db)
    alert = await service.trigger_alert(
        alert_key,
        priority=request.priority if request else None,
        note=request.note if request else None
    )
    return alert

@router.get("/current")
async def get_current_display(db: AsyncSession = Depends(get_db)):
    service = AlertService(db)
    alert = await service.get_current_display()
    if not alert:
        return {"is_active": False}
    return {
        "alert_key": alert.alert_key,
        "priority": alert.effective_priority,
        "led_color": alert.config.led_color,
        "led_effect": alert.config.led_effect,
        "is_active": True
    }
```

## Database Migrations

### Creating a Migration

```bash
cd backend
alembic revision --autogenerate -m "Add new field"
```

### Running Migrations

```bash
# Upgrade to latest
alembic upgrade head

# Downgrade one version
alembic downgrade -1

# Show current version
alembic current
```

### Migration Best Practices

1. Always review auto-generated migrations
2. Test migrations on a copy of production data
3. Make migrations reversible when possible
4. Keep migrations small and focused

## API Patterns

### Dependency Injection

```python
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

async def get_db():
    async with async_session() as session:
        yield session

@router.get("/items")
async def get_items(db: AsyncSession = Depends(get_db)):
    # db is automatically injected
    pass
```

### Error Handling

```python
from fastapi import HTTPException

@router.get("/{alert_key}")
async def get_alert(alert_key: str, db: AsyncSession = Depends(get_db)):
    alert = await service.get_by_key(alert_key)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert
```

### Pagination

```python
from pydantic import BaseModel

class PaginatedResponse(BaseModel):
    items: list
    total: int
    page: int
    page_size: int
    total_pages: int

@router.get("/", response_model=PaginatedResponse)
async def list_items(
    page: int = 1,
    page_size: int = 50,
    db: AsyncSession = Depends(get_db)
):
    # Calculate offset
    offset = (page - 1) * page_size

    # Query with pagination
    items = await service.get_paginated(offset, page_size)
    total = await service.get_total_count()

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size
    )
```

## Testing

### Unit Tests

```python
import pytest
from app.services.alert_service import AlertService

@pytest.fixture
async def service(db_session):
    return AlertService(db_session)

async def test_trigger_alert(service):
    alert = await service.trigger_alert("test_alert")
    assert alert.is_active is True
    assert alert.alert_key == "test_alert"
```

### Integration Tests

```python
from httpx import AsyncClient
from app.main import app

async def test_trigger_endpoint():
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post("/api/v1/alerts/test/trigger")
        assert response.status_code == 200
        assert response.json()["is_active"] is True
```

## Debugging

### Enable SQL Logging

```python
# In database.py
engine = create_async_engine(
    DATABASE_URL,
    echo=True  # Logs all SQL queries
)
```

### Interactive Shell

```bash
cd backend
python -c "
import asyncio
from app.core.database import async_session
from app.models.alert import Alert

async def main():
    async with async_session() as db:
        # Interactive queries here
        pass

asyncio.run(main())
"
```

## Performance Considerations

1. **Connection Pooling**: Configure appropriate pool sizes
2. **Eager Loading**: Use `joinedload` for related data
3. **Indexing**: Ensure frequently queried columns are indexed
4. **Async I/O**: Use async database operations throughout

```python
from sqlalchemy.orm import joinedload

# Eager load related config
result = await db.execute(
    select(Alert)
    .options(joinedload(Alert.config))
    .where(Alert.is_active == True)
)
```

## See Also

- [Database Schema](../database/schema.md)
- [API Reference](../api/README.md)
- [Frontend Development](frontend.md)

"""
Pytest configuration and fixtures.
"""

from collections.abc import AsyncGenerator

import pytest_asyncio

# IMPORTANT: Override settings BEFORE importing any app modules
# This ensures the database engine is created with test settings
from app.config import settings

settings.TESTING = True
settings.DATABASE_TYPE = "sqlite"
settings.SQLITE_DATABASE_PATH = ":memory:"

# Now import app modules (after settings are configured)
from app.core.database import Base, get_db  # noqa: E402
from app.main import app  # noqa: E402
from httpx import ASGITransport, AsyncClient  # noqa: E402
from sqlalchemy.ext.asyncio import (  # noqa: E402
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

# Create test engine
test_engine = create_async_engine(
    "sqlite+aiosqlite:///:memory:",
    echo=False,
    future=True,
)

# Create test session factory
TestSessionLocal = async_sessionmaker(
    test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


# NOTE: The deprecated session-scoped event_loop fixture has been removed.
# pytest-asyncio >= 0.23 manages event loops automatically via asyncio_mode = "auto"
# and asyncio_default_fixture_loop_scope = "function" in pyproject.toml.
# The old fixture caused conflicts with TestClient's internal event loop.


@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Create a test database session."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestSessionLocal() as session:
        yield session

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Create a test client with overridden database dependency."""

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()

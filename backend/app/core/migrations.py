"""
Schema migration on startup.

Alembic owns the database schema. Running migrations at startup keeps a
deployment's schema in step with the code that is about to serve it, which
matters because adding a column to a model is otherwise invisible to an
existing database.
"""

import logging
from pathlib import Path

from alembic import command
from alembic.config import Config
from alembic.runtime.migration import MigrationContext
from sqlalchemy import create_engine, inspect

from app.config import settings

logger = logging.getLogger(__name__)

BACKEND_DIR = Path(__file__).resolve().parents[2]

# The revision that first created the alert tables.
INITIAL_REVISION = "4f5e39139753"


def _alembic_config() -> Config:
    config = Config(str(BACKEND_DIR / "alembic.ini"))
    config.set_main_option("script_location", str(BACKEND_DIR / "alembic"))
    config.set_main_option("sqlalchemy.url", settings.database_url_sync)
    return config


def run_migrations() -> None:
    """Bring the database up to the latest revision."""
    config = _alembic_config()
    engine = create_engine(settings.database_url_sync)

    try:
        with engine.connect() as conn:
            tables = set(inspect(conn).get_table_names())
            current = MigrationContext.configure(conn).get_current_revision()

        # A database built by an earlier version of this app has the alert tables
        # but no migration history, so Alembic would try to create them again.
        # Adopting it at the initial revision lets later migrations apply.
        if current is None and "alert_configs" in tables:
            logger.info("Adopting existing database at revision %s", INITIAL_REVISION)
            command.stamp(config, INITIAL_REVISION)

        command.upgrade(config, "head")
        logger.info("Database schema is up to date")
    finally:
        engine.dispose()

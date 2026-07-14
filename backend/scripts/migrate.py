"""
Run database migrations.
"""

import logging
import sys


def main() -> None:
    """Bring the database schema up to the latest revision."""
    logging.basicConfig(level=logging.INFO, format="%(message)s")

    from app.core.migrations import run_migrations

    try:
        run_migrations()
    except Exception as exc:  # noqa: BLE001
        print(f"Migration failed: {exc}", file=sys.stderr)
        raise SystemExit(1) from exc


if __name__ == "__main__":
    main()

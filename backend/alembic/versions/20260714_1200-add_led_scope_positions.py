"""Add LED scope and per-LED targeting

Revision ID: add_led_scope_positions
Revises: add_led_brightness_duration
Create Date: 2026-07-14 12:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "add_led_scope_positions"
down_revision: str | None = "add_led_brightness_duration"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "alert_configs",
        sa.Column(
            "led_scope",
            sa.String(length=20),
            nullable=False,
            server_default="bar",
            comment="Notification surface: 'bar' (whole strip) or 'individual' (specific LEDs)",
        ),
    )
    op.add_column(
        "alert_configs",
        sa.Column(
            "led_positions",
            sa.JSON(),
            nullable=True,
            comment="LEDs (1-7, bottom to top) claimed when led_scope is 'individual'",
        ),
    )


def downgrade() -> None:
    op.drop_column("alert_configs", "led_positions")
    op.drop_column("alert_configs", "led_scope")

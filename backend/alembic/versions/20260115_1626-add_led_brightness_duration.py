"""Add LED brightness and duration fields

Revision ID: add_led_brightness_duration
Revises: 4f5e39139753
Create Date: 2026-01-15 16:26:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "add_led_brightness_duration"
down_revision: str | None = "4f5e39139753"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Add led_brightness column (0-100 percentage)
    op.add_column(
        "alert_configs",
        sa.Column(
            "led_brightness",
            sa.Integer(),
            nullable=True,
            comment="LED brightness level (0-100)",
        ),
    )
    # Add led_duration column (0-255, see Inovelli docs for encoding)
    op.add_column(
        "alert_configs",
        sa.Column(
            "led_duration",
            sa.Integer(),
            nullable=True,
            comment="LED effect duration (1-60=seconds, 61-120=minutes-60, 121-254=hours-120, 255=indefinite)",
        ),
    )


def downgrade() -> None:
    op.drop_column("alert_configs", "led_duration")
    op.drop_column("alert_configs", "led_brightness")

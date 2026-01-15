"""
Alert models for LightStack.

Tables:
- alert_configs: Configuration and default settings for each alert type
- alerts: Current state of each alert
- alert_history: Audit log of all alert events
"""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin


class AlertConfig(Base, TimestampMixin):
    """
    Configuration for alert types.

    Defines the default settings for each type of alert including
    priority and LED display settings for Inovelli switches.
    """

    __tablename__ = "alert_configs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    alert_key: Mapped[str] = mapped_column(
        String(100), unique=True, nullable=False, index=True
    )
    name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    default_priority: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, doc="Higher values = higher priority"
    )

    # Inovelli LED settings
    led_color: Mapped[int | None] = mapped_column(
        Integer, nullable=True, doc="Inovelli color value (0-255)"
    )
    led_effect: Mapped[str | None] = mapped_column(
        String(50), nullable=True, doc="LED effect: solid, blink, pulse, chase, etc."
    )

    # Relationships
    alerts: Mapped[list["Alert"]] = relationship(
        "Alert", back_populates="config", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<AlertConfig(alert_key={self.alert_key!r}, priority={self.default_priority})>"


class Alert(Base, TimestampMixin):
    """
    Current state of alerts.

    Tracks whether each alert is currently active and its effective priority.
    """

    __tablename__ = "alerts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    alert_key: Mapped[str] = mapped_column(
        String(100),
        ForeignKey("alert_configs.alert_key", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    priority: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
        doc="Override priority. If null, uses default_priority from config.",
    )
    last_triggered_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    config: Mapped["AlertConfig"] = relationship("AlertConfig", back_populates="alerts")

    def __repr__(self) -> str:
        return f"<Alert(alert_key={self.alert_key!r}, is_active={self.is_active})>"

    @property
    def effective_priority(self) -> int:
        """Return the effective priority (override or default from config)."""
        if self.priority is not None:
            return self.priority
        return self.config.default_priority if self.config else 0


class AlertHistory(Base):
    """
    Audit log of alert events.

    Records all alert state changes for historical tracking and debugging.
    """

    __tablename__ = "alert_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    alert_key: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    action: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        doc="Action type: triggered, cleared, priority_changed, etc.",
    )
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )

    def __repr__(self) -> str:
        return f"<AlertHistory(alert_key={self.alert_key!r}, action={self.action!r})>"

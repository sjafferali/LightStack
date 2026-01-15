"""
Alert service - Business logic for alert management.
"""

from datetime import UTC, datetime

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import Alert, AlertConfig, AlertHistory


class AlertService:
    """Service class for alert-related operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # =========================================================================
    # Alert Config Operations
    # =========================================================================

    async def get_all_configs(self) -> list[AlertConfig]:
        """Get all alert configurations."""
        result = await self.db.execute(
            select(AlertConfig).order_by(AlertConfig.alert_key)
        )
        return list(result.scalars().all())

    async def get_config_by_key(self, alert_key: str) -> AlertConfig | None:
        """Get a specific alert configuration by key."""
        result = await self.db.execute(
            select(AlertConfig).where(AlertConfig.alert_key == alert_key)
        )
        return result.scalar_one_or_none()

    async def create_config(
        self,
        alert_key: str,
        name: str | None = None,
        description: str | None = None,
        default_priority: int = 3,
        led_color: int | None = None,
        led_effect: str | None = None,
    ) -> AlertConfig:
        """Create a new alert configuration."""
        config = AlertConfig(
            alert_key=alert_key,
            name=name,
            description=description,
            default_priority=default_priority,
            led_color=led_color,
            led_effect=led_effect,
        )
        self.db.add(config)
        await self.db.commit()
        await self.db.refresh(config)
        return config

    async def update_config(
        self, alert_key: str, **kwargs: object
    ) -> AlertConfig | None:
        """Update an existing alert configuration."""
        config = await self.get_config_by_key(alert_key)
        if not config:
            return None

        for key, value in kwargs.items():
            if value is not None and hasattr(config, key):
                setattr(config, key, value)

        await self.db.commit()
        await self.db.refresh(config)
        return config

    async def delete_config(self, alert_key: str) -> bool:
        """Delete an alert configuration and its associated alert state."""
        config = await self.get_config_by_key(alert_key)
        if not config:
            return False

        await self.db.delete(config)
        await self.db.commit()
        return True

    async def get_or_create_config(
        self, alert_key: str, default_priority: int = 3
    ) -> AlertConfig:
        """Get existing config or create a new one with defaults."""
        config = await self.get_config_by_key(alert_key)
        if config:
            return config
        return await self.create_config(
            alert_key=alert_key, default_priority=default_priority
        )

    # =========================================================================
    # Alert State Operations
    # =========================================================================

    async def get_all_alerts(self, include_config: bool = True) -> list[Alert]:
        """Get all alerts with their current state."""
        query = select(Alert).order_by(Alert.alert_key)
        if include_config:
            query = query.options(selectinload(Alert.config))
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_active_alerts(self, include_config: bool = True) -> list[Alert]:
        """Get only active alerts, ordered by priority (lowest number = highest priority)."""
        query = (
            select(Alert)
            .where(Alert.is_active == True)  # noqa: E712
            .options(selectinload(Alert.config))
        )
        result = await self.db.execute(query)
        alerts = list(result.scalars().all())
        # Sort by effective priority (lower number = higher priority)
        return sorted(alerts, key=lambda a: a.effective_priority)

    async def get_alert_by_key(
        self, alert_key: str, include_config: bool = True
    ) -> Alert | None:
        """Get a specific alert by key."""
        query = select(Alert).where(Alert.alert_key == alert_key)
        if include_config:
            query = query.options(selectinload(Alert.config))
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_current_display(self) -> Alert | None:
        """Get the currently displayed alert (highest priority active alert)."""
        active = await self.get_active_alerts()
        return active[0] if active else None

    async def trigger_alert(
        self,
        alert_key: str,
        priority: int | None = None,
        note: str | None = None,
    ) -> Alert:
        """
        Trigger an alert. Creates config and alert if they don't exist.
        Returns the alert with its current state.
        """
        # Ensure config exists
        await self.get_or_create_config(alert_key)

        # Get or create alert state
        alert = await self.get_alert_by_key(alert_key)
        now = datetime.now(UTC)

        if alert:
            # Update existing alert
            alert.is_active = True
            alert.priority = priority
            alert.last_triggered_at = now
        else:
            # Create new alert state
            alert = Alert(
                alert_key=alert_key,
                is_active=True,
                priority=priority,
                last_triggered_at=now,
            )
            self.db.add(alert)

        # Log to history
        history_entry = AlertHistory(
            alert_key=alert_key,
            action="triggered",
            note=note,
        )
        self.db.add(history_entry)

        await self.db.commit()
        # Re-fetch with config eagerly loaded to avoid lazy loading issues
        return await self.get_alert_by_key(alert_key, include_config=True)  # type: ignore[return-value]

    async def clear_alert(
        self, alert_key: str, note: str | None = None
    ) -> Alert | None:
        """Clear an alert. Returns None if alert doesn't exist."""
        alert = await self.get_alert_by_key(alert_key)
        if not alert:
            return None

        if alert.is_active:
            alert.is_active = False
            alert.priority = None  # Reset override priority

            # Log to history
            history_entry = AlertHistory(
                alert_key=alert_key,
                action="cleared",
                note=note,
            )
            self.db.add(history_entry)

            await self.db.commit()

        # Re-fetch with config eagerly loaded to avoid lazy loading issues
        return await self.get_alert_by_key(alert_key, include_config=True)

    async def clear_all_alerts(self, note: str | None = None) -> list[str]:
        """Clear all active alerts. Returns list of cleared alert keys."""
        active_alerts = await self.get_active_alerts()
        cleared_keys = []

        for alert in active_alerts:
            alert.is_active = False
            alert.priority = None

            # Log to history
            history_entry = AlertHistory(
                alert_key=alert.alert_key,
                action="cleared",
                note=note or "Bulk clear",
            )
            self.db.add(history_entry)
            cleared_keys.append(alert.alert_key)

        await self.db.commit()
        return cleared_keys

    # =========================================================================
    # Alert History Operations
    # =========================================================================

    async def get_history(
        self,
        alert_key: str | None = None,
        action: str | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> tuple[list[AlertHistory], int]:
        """
        Get alert history with optional filtering.
        Returns (history_entries, total_count).
        """
        # Build base query
        conditions = []
        if alert_key:
            conditions.append(AlertHistory.alert_key == alert_key)
        if action:
            conditions.append(AlertHistory.action == action)

        # Count query
        count_query = select(func.count(AlertHistory.id))
        if conditions:
            count_query = count_query.where(and_(*conditions))
        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0

        # Data query
        data_query = (
            select(AlertHistory)
            .order_by(AlertHistory.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        if conditions:
            data_query = data_query.where(and_(*conditions))

        result = await self.db.execute(data_query)
        entries = list(result.scalars().all())

        return entries, total

    async def add_history_entry(
        self, alert_key: str, action: str, note: str | None = None
    ) -> AlertHistory:
        """Add a manual history entry."""
        entry = AlertHistory(alert_key=alert_key, action=action, note=note)
        self.db.add(entry)
        await self.db.commit()
        await self.db.refresh(entry)
        return entry

    # =========================================================================
    # Statistics Operations
    # =========================================================================

    async def get_trigger_count(self, alert_key: str) -> int:
        """Get the total number of times an alert has been triggered."""
        result = await self.db.execute(
            select(func.count(AlertHistory.id)).where(
                and_(
                    AlertHistory.alert_key == alert_key,
                    AlertHistory.action == "triggered",
                )
            )
        )
        return result.scalar() or 0

    async def get_dashboard_stats(self) -> dict[str, int]:
        """Get dashboard statistics."""
        now = datetime.now(UTC)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

        # Total alerts triggered today
        total_today_result = await self.db.execute(
            select(func.count(AlertHistory.id)).where(
                and_(
                    AlertHistory.action == "triggered",
                    AlertHistory.created_at >= today_start,
                )
            )
        )
        total_today = total_today_result.scalar() or 0

        # Critical alerts today (P1) - need to join with alerts to get priority
        # For simplicity, count triggers where the config has priority 1
        critical_today_result = await self.db.execute(
            select(func.count(AlertHistory.id))
            .select_from(AlertHistory)
            .join(AlertConfig, AlertHistory.alert_key == AlertConfig.alert_key)
            .where(
                and_(
                    AlertHistory.action == "triggered",
                    AlertHistory.created_at >= today_start,
                    AlertConfig.default_priority == 1,
                )
            )
        )
        critical_today = critical_today_result.scalar() or 0

        # Auto-cleared today (cleared with 'auto' in note)
        auto_cleared_result = await self.db.execute(
            select(func.count(AlertHistory.id)).where(
                and_(
                    AlertHistory.action == "cleared",
                    AlertHistory.created_at >= today_start,
                    AlertHistory.note.ilike("%auto%"),
                )
            )
        )
        auto_cleared = auto_cleared_result.scalar() or 0

        # Active count
        active_result = await self.db.execute(
            select(func.count(Alert.id)).where(Alert.is_active == True)  # noqa: E712
        )
        active_count = active_result.scalar() or 0

        # Total alert keys
        total_keys_result = await self.db.execute(
            select(func.count(AlertConfig.id))
        )
        total_keys = total_keys_result.scalar() or 0

        return {
            "total_alerts_today": total_today,
            "critical_today": critical_today,
            "auto_cleared": auto_cleared,
            "active_count": active_count,
            "total_alert_keys": total_keys,
        }

    async def get_all_alert_keys_summary(
        self,
    ) -> list[tuple[AlertConfig, Alert | None, int]]:
        """
        Get summary of all alert keys for the alerts list page.
        Returns list of (config, alert, trigger_count) tuples.
        """
        # Get all configs
        configs = await self.get_all_configs()
        result: list[tuple[AlertConfig, Alert | None, int]] = []

        for config in configs:
            # Get alert state if exists
            alert = await self.get_alert_by_key(config.alert_key, include_config=False)
            trigger_count = await self.get_trigger_count(config.alert_key)
            result.append((config, alert, trigger_count))

        return result

"""
Alert service with WebSocket broadcast support.

This module extends the base AlertService to broadcast events
to connected WebSocket clients when alert state changes occur.
"""

import logging
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.websocket import get_connection_manager
from app.models import Alert
from app.schemas.websocket import AlertData, ServerEventType
from app.services.alert_service import AlertService

logger = logging.getLogger(__name__)


def _alert_to_data(alert: Alert) -> AlertData:
    """Convert Alert model to AlertData schema."""
    return AlertData(
        alert_key=alert.alert_key,
        is_active=alert.is_active,
        effective_priority=alert.effective_priority,
        priority=alert.priority,
        last_triggered_at=alert.last_triggered_at,
        name=alert.config.name if alert.config else None,
        description=alert.config.description if alert.config else None,
        default_priority=alert.config.default_priority if alert.config else 3,
        led_color=alert.config.led_color if alert.config else None,
        led_effect=alert.config.led_effect if alert.config else None,
    )


def _alert_to_dict(alert: Alert | None) -> dict[str, Any] | None:
    """Convert Alert to dictionary for JSON serialization."""
    if alert is None:
        return None
    return _alert_to_data(alert).model_dump(mode="json")


class AlertServiceWithBroadcast(AlertService):
    """
    Alert service that broadcasts state changes to WebSocket clients.

    This class extends the base AlertService and adds WebSocket
    broadcasting for trigger, clear, and bulk clear operations.
    """

    def __init__(self, db: AsyncSession):
        super().__init__(db)
        self._manager = get_connection_manager()

    async def _get_current_alert(self) -> Alert | None:
        """Get the current highest priority active alert."""
        return await self.get_current_display()

    async def _broadcast_current_change(
        self,
        previous_current: Alert | None,
        new_current: Alert | None,
    ) -> None:
        """Broadcast current_alert_changed event if the current alert changed."""
        # Check if current actually changed
        previous_key = previous_current.alert_key if previous_current else None
        new_key = new_current.alert_key if new_current else None

        if previous_key == new_key:
            # No change in current alert
            return

        active_alerts = await self.get_active_alerts()

        await self._manager.broadcast(
            ServerEventType.CURRENT_ALERT_CHANGED.value,
            {
                "previous": _alert_to_dict(previous_current),
                "current": _alert_to_dict(new_current),
                "is_all_clear": new_current is None,
                "active_count": len(active_alerts),
            },
        )

    async def trigger_alert(
        self,
        alert_key: str,
        priority: int | None = None,
        note: str | None = None,
    ) -> Alert:
        """
        Trigger an alert and broadcast the event.

        Broadcasts:
        - alert_triggered: Always
        - current_alert_changed: If the current display alert changed
        """
        # Get current state before trigger
        previous_current = await self._get_current_alert()

        # Perform the trigger
        alert = await super().trigger_alert(
            alert_key=alert_key,
            priority=priority,
            note=note,
        )

        # Get new current state
        new_current = await self._get_current_alert()

        # Check if current changed
        previous_key = previous_current.alert_key if previous_current else None
        new_key = new_current.alert_key if new_current else None
        current_changed = previous_key != new_key

        # Broadcast alert_triggered
        await self._manager.broadcast(
            ServerEventType.ALERT_TRIGGERED.value,
            {
                "alert": _alert_to_dict(alert),
                "previous_current": _alert_to_dict(previous_current),
                "new_current": _alert_to_dict(new_current),
                "current_changed": current_changed,
            },
        )

        # Broadcast current_alert_changed if needed
        if current_changed:
            active_alerts = await self.get_active_alerts()
            await self._manager.broadcast(
                ServerEventType.CURRENT_ALERT_CHANGED.value,
                {
                    "previous": _alert_to_dict(previous_current),
                    "current": _alert_to_dict(new_current),
                    "is_all_clear": False,  # We just triggered, so not all clear
                    "active_count": len(active_alerts),
                },
            )

        return alert

    async def clear_alert(self, alert_key: str, note: str | None = None) -> Alert | None:
        """
        Clear an alert and broadcast the event.

        Broadcasts:
        - alert_cleared: Always (if alert exists)
        - current_alert_changed: If the current display alert changed
        """
        # Get current state before clear
        previous_current = await self._get_current_alert()

        # Perform the clear
        alert = await super().clear_alert(alert_key=alert_key, note=note)

        if not alert:
            return None

        # Get new current state
        new_current = await self._get_current_alert()

        # Check if current changed
        previous_key = previous_current.alert_key if previous_current else None
        new_key = new_current.alert_key if new_current else None
        current_changed = previous_key != new_key

        # Broadcast alert_cleared
        await self._manager.broadcast(
            ServerEventType.ALERT_CLEARED.value,
            {
                "alert": _alert_to_dict(alert),
                "previous_current": _alert_to_dict(previous_current),
                "new_current": _alert_to_dict(new_current),
                "current_changed": current_changed,
            },
        )

        # Broadcast current_alert_changed if needed
        if current_changed:
            active_alerts = await self.get_active_alerts()
            await self._manager.broadcast(
                ServerEventType.CURRENT_ALERT_CHANGED.value,
                {
                    "previous": _alert_to_dict(previous_current),
                    "current": _alert_to_dict(new_current),
                    "is_all_clear": new_current is None,
                    "active_count": len(active_alerts),
                },
            )

        return alert

    async def clear_all_alerts(self, note: str | None = None) -> list[str]:
        """
        Clear all alerts and broadcast the event.

        Broadcasts:
        - all_alerts_cleared: Always (with list of cleared keys)
        - current_alert_changed: If there was a current alert
        """
        # Get current state before clear
        previous_current = await self._get_current_alert()

        # Perform the bulk clear
        cleared_keys = await super().clear_all_alerts(note=note)

        if not cleared_keys:
            return []

        # Broadcast all_alerts_cleared
        await self._manager.broadcast(
            ServerEventType.ALL_ALERTS_CLEARED.value,
            {
                "cleared_count": len(cleared_keys),
                "cleared_keys": cleared_keys,
            },
        )

        # Broadcast current_alert_changed if there was a current alert
        if previous_current:
            await self._manager.broadcast(
                ServerEventType.CURRENT_ALERT_CHANGED.value,
                {
                    "previous": _alert_to_dict(previous_current),
                    "current": None,
                    "is_all_clear": True,
                    "active_count": 0,
                },
            )

        return cleared_keys

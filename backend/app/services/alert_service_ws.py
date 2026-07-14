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
from app.schemas.websocket import AlertData, LedPlanData, LedSlotData, ServerEventType
from app.services.alert_service import AlertService
from app.services.led_plan import RenderPlan

logger = logging.getLogger(__name__)


def alert_to_data(alert: Alert) -> AlertData:
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
        led_scope=alert.config.led_scope if alert.config else "bar",
        led_positions=alert.config.led_positions if alert.config else None,
        led_color=alert.config.led_color if alert.config else None,
        led_effect=alert.config.led_effect if alert.config else None,
        led_brightness=alert.config.led_brightness if alert.config else None,
        led_duration=alert.config.led_duration if alert.config else None,
    )


def _alert_to_dict(alert: Alert | None) -> dict[str, Any] | None:
    """Convert Alert to dictionary for JSON serialization."""
    if alert is None:
        return None
    return alert_to_data(alert).model_dump(mode="json")


def plan_to_data(plan: RenderPlan) -> LedPlanData:
    """Convert a RenderPlan to its wire representation."""
    return LedPlanData(
        mode=plan.mode,
        is_all_clear=plan.is_all_clear,
        bar_alert_key=plan.bar_alert_key,
        leds=[
            LedSlotData(
                led=slot.led,
                alert_key=slot.alert_key,
                effect=slot.effect,
                color=slot.color,
                level=slot.level,
                duration=slot.duration,
            )
            for slot in plan.leds
        ],
        suppressed=plan.suppressed,
        commands=plan.commands,
    )


def _plan_to_dict(plan: RenderPlan) -> dict[str, Any]:
    return plan_to_data(plan).model_dump(mode="json")


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

    async def _plan_snapshot(self) -> dict[str, Any]:
        """Capture the LED render plan for comparison across a state change."""
        return _plan_to_dict(await self.get_render_plan())

    async def _broadcast_plan_if_changed(self, previous: dict[str, Any]) -> None:
        """
        Broadcast led_plan_changed when the switch's display state differs.

        The plan can change while the highest priority alert does not: two
        per-LED alerts on different LEDs both render, so a second one appearing
        changes the display without changing the winner.
        """
        current = await self._plan_snapshot()
        if current == previous:
            return

        logger.debug(
            "LED plan changed: mode=%s bar=%s suppressed=%s",
            current["mode"],
            current["bar_alert_key"],
            current["suppressed"],
        )
        await self._manager.broadcast(ServerEventType.LED_PLAN_CHANGED.value, current)

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
        - led_plan_changed: If the switch's display state changed
        """
        # Get current state before trigger
        previous_plan = await self._plan_snapshot()
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

        await self._broadcast_plan_if_changed(previous_plan)

        return alert

    async def clear_alert(self, alert_key: str, note: str | None = None) -> Alert | None:
        """
        Clear an alert and broadcast the event.

        Broadcasts:
        - alert_cleared: Always (if alert exists)
        - current_alert_changed: If the current display alert changed
        - led_plan_changed: If the switch's display state changed
        """
        # Get current state before clear
        previous_plan = await self._plan_snapshot()
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

        await self._broadcast_plan_if_changed(previous_plan)

        return alert

    async def clear_all_alerts(self, note: str | None = None) -> list[str]:
        """
        Clear all alerts and broadcast the event.

        Broadcasts:
        - all_alerts_cleared: Always (with list of cleared keys)
        - current_alert_changed: If there was a current alert
        - led_plan_changed: If the switch's display state changed
        """
        # Get current state before clear
        previous_plan = await self._plan_snapshot()
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

        await self._broadcast_plan_if_changed(previous_plan)

        return cleared_keys

"""
WebSocket endpoint for real-time alert updates.

This endpoint provides a bidirectional WebSocket connection for:
- Real-time push notifications when alerts change
- Command-based alert triggering and clearing
- Current state queries

Home Assistant integrations can use this for instant updates
instead of polling the REST API.
"""

import logging
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.database import AsyncSessionLocal
from app.core.websocket import get_connection_manager
from app.models.alert import Alert
from app.schemas.websocket import (
    AlertData,
    ClientCommandType,
    ClientMessage,
    CurrentAlertState,
    ServerEventType,
)
from app.services.alert_service import AlertService

logger = logging.getLogger(__name__)
router = APIRouter()


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


async def _get_current_state(db: AsyncSession) -> CurrentAlertState:
    """Get the current alert state."""
    service = AlertService(db)
    active_alerts = await service.get_active_alerts()
    current = active_alerts[0] if active_alerts else None

    return CurrentAlertState(
        is_all_clear=current is None,
        current_alert=_alert_to_data(current) if current else None,
        active_count=len(active_alerts),
        active_alerts=[_alert_to_data(a) for a in active_alerts],
    )


async def _handle_get_state(
    websocket: WebSocket,
    db: AsyncSession,
    command_id: str | None,
) -> None:
    """Handle GET_STATE command."""
    manager = get_connection_manager()
    state = await _get_current_state(db)

    await manager.send_to_one(
        websocket,
        ServerEventType.COMMAND_RESULT.value,
        {
            "command_id": command_id,
            "command_type": ClientCommandType.GET_STATE.value,
            "success": True,
            "result": state.model_dump(mode="json"),
        },
    )


async def _handle_get_active_alerts(
    websocket: WebSocket,
    db: AsyncSession,
    command_id: str | None,
) -> None:
    """Handle GET_ACTIVE_ALERTS command."""
    manager = get_connection_manager()
    service = AlertService(db)
    active_alerts = await service.get_active_alerts()

    await manager.send_to_one(
        websocket,
        ServerEventType.COMMAND_RESULT.value,
        {
            "command_id": command_id,
            "command_type": ClientCommandType.GET_ACTIVE_ALERTS.value,
            "success": True,
            "result": {
                "alerts": [_alert_to_data(a).model_dump(mode="json") for a in active_alerts],
                "count": len(active_alerts),
            },
        },
    )


async def _handle_get_all_alerts(
    websocket: WebSocket,
    db: AsyncSession,
    command_id: str | None,
) -> None:
    """Handle GET_ALL_ALERTS command."""
    manager = get_connection_manager()
    service = AlertService(db)
    all_alerts = await service.get_all_alerts()

    await manager.send_to_one(
        websocket,
        ServerEventType.COMMAND_RESULT.value,
        {
            "command_id": command_id,
            "command_type": ClientCommandType.GET_ALL_ALERTS.value,
            "success": True,
            "result": {
                "alerts": [_alert_to_data(a).model_dump(mode="json") for a in all_alerts],
                "count": len(all_alerts),
            },
        },
    )


async def _handle_trigger_alert(
    websocket: WebSocket,
    db: AsyncSession,
    command_id: str | None,
    data: dict[str, Any],
) -> None:
    """Handle TRIGGER_ALERT command."""
    from app.services.alert_service_ws import AlertServiceWithBroadcast

    manager = get_connection_manager()

    alert_key = data.get("alert_key")
    if not alert_key:
        await manager.send_to_one(
            websocket,
            ServerEventType.ERROR.value,
            {
                "code": "MISSING_ALERT_KEY",
                "message": "alert_key is required",
                "command_id": command_id,
            },
        )
        return

    priority = data.get("priority")
    note = data.get("note")

    service = AlertServiceWithBroadcast(db)
    alert = await service.trigger_alert(
        alert_key=alert_key,
        priority=priority,
        note=note,
    )

    await manager.send_to_one(
        websocket,
        ServerEventType.COMMAND_RESULT.value,
        {
            "command_id": command_id,
            "command_type": ClientCommandType.TRIGGER_ALERT.value,
            "success": True,
            "result": {
                "alert": _alert_to_data(alert).model_dump(mode="json"),
            },
        },
    )


async def _handle_clear_alert(
    websocket: WebSocket,
    db: AsyncSession,
    command_id: str | None,
    data: dict[str, Any],
) -> None:
    """Handle CLEAR_ALERT command."""
    from app.services.alert_service_ws import AlertServiceWithBroadcast

    manager = get_connection_manager()

    alert_key = data.get("alert_key")
    if not alert_key:
        await manager.send_to_one(
            websocket,
            ServerEventType.ERROR.value,
            {
                "code": "MISSING_ALERT_KEY",
                "message": "alert_key is required",
                "command_id": command_id,
            },
        )
        return

    note = data.get("note")

    service = AlertServiceWithBroadcast(db)
    alert = await service.clear_alert(alert_key=alert_key, note=note)

    if not alert:
        await manager.send_to_one(
            websocket,
            ServerEventType.ERROR.value,
            {
                "code": "ALERT_NOT_FOUND",
                "message": f"Alert '{alert_key}' not found",
                "command_id": command_id,
            },
        )
        return

    await manager.send_to_one(
        websocket,
        ServerEventType.COMMAND_RESULT.value,
        {
            "command_id": command_id,
            "command_type": ClientCommandType.CLEAR_ALERT.value,
            "success": True,
            "result": {
                "alert": _alert_to_data(alert).model_dump(mode="json"),
            },
        },
    )


async def _handle_clear_all_alerts(
    websocket: WebSocket,
    db: AsyncSession,
    command_id: str | None,
    data: dict[str, Any],
) -> None:
    """Handle CLEAR_ALL_ALERTS command."""
    from app.services.alert_service_ws import AlertServiceWithBroadcast

    manager = get_connection_manager()
    note = data.get("note", "Cleared via WebSocket")

    service = AlertServiceWithBroadcast(db)
    cleared_keys = await service.clear_all_alerts(note=note)

    await manager.send_to_one(
        websocket,
        ServerEventType.COMMAND_RESULT.value,
        {
            "command_id": command_id,
            "command_type": ClientCommandType.CLEAR_ALL_ALERTS.value,
            "success": True,
            "result": {
                "cleared_count": len(cleared_keys),
                "cleared_keys": cleared_keys,
            },
        },
    )


async def _handle_ping(
    websocket: WebSocket,
    command_id: str | None,
) -> None:
    """Handle PING command."""
    manager = get_connection_manager()
    await manager.send_to_one(
        websocket,
        ServerEventType.COMMAND_RESULT.value,
        {
            "command_id": command_id,
            "command_type": ClientCommandType.PING.value,
            "success": True,
            "result": {"pong": True},
        },
    )


async def _process_message(
    websocket: WebSocket,
    db: AsyncSession,
    raw_message: dict[str, Any],
) -> None:
    """Process an incoming WebSocket message."""
    manager = get_connection_manager()

    try:
        message = ClientMessage.model_validate(raw_message)
    except ValidationError as e:
        await manager.send_to_one(
            websocket,
            ServerEventType.ERROR.value,
            {
                "code": "INVALID_MESSAGE",
                "message": f"Invalid message format: {e}",
                "command_id": raw_message.get("id"),
            },
        )
        return

    # Normalize command type to lowercase for comparison
    command_type = message.type.lower()
    command_id = message.id
    data = message.data

    # Route to appropriate handler (enum values are lowercase)
    if command_type == ClientCommandType.GET_STATE.value:
        await _handle_get_state(websocket, db, command_id)
    elif command_type == ClientCommandType.GET_ACTIVE_ALERTS.value:
        await _handle_get_active_alerts(websocket, db, command_id)
    elif command_type == ClientCommandType.GET_ALL_ALERTS.value:
        await _handle_get_all_alerts(websocket, db, command_id)
    elif command_type == ClientCommandType.TRIGGER_ALERT.value:
        await _handle_trigger_alert(websocket, db, command_id, data)
    elif command_type == ClientCommandType.CLEAR_ALERT.value:
        await _handle_clear_alert(websocket, db, command_id, data)
    elif command_type == ClientCommandType.CLEAR_ALL_ALERTS.value:
        await _handle_clear_all_alerts(websocket, db, command_id, data)
    elif command_type == ClientCommandType.PING.value:
        await _handle_ping(websocket, command_id)
    else:
        await manager.send_to_one(
            websocket,
            ServerEventType.ERROR.value,
            {
                "code": "UNKNOWN_COMMAND",
                "message": f"Unknown command type: {message.type}",
                "command_id": command_id,
            },
        )


@router.websocket("")
async def websocket_endpoint(websocket: WebSocket) -> None:
    """
    WebSocket endpoint for real-time alert updates.

    ## Connection Flow:
    1. Connect to `/api/v1/ws`
    2. Receive `connection_established` with current state
    3. Send commands and receive events

    ## Server Events (push notifications):
    - `connection_established`: Initial state on connect
    - `alert_triggered`: An alert was triggered
    - `alert_cleared`: An alert was cleared
    - `all_alerts_cleared`: All alerts were bulk cleared
    - `current_alert_changed`: The highest priority active alert changed
    - `command_result`: Response to a client command
    - `error`: Error response

    ## Client Commands:
    - `GET_STATE`: Get current alert state
    - `GET_ACTIVE_ALERTS`: Get all active alerts
    - `GET_ALL_ALERTS`: Get all alerts
    - `TRIGGER_ALERT`: Trigger an alert (data: {alert_key, priority?, note?})
    - `CLEAR_ALERT`: Clear an alert (data: {alert_key, note?})
    - `CLEAR_ALL_ALERTS`: Clear all alerts (data: {note?})
    - `PING`: Health check

    ## Message Format:
    Client → Server:
    ```json
    {
        "type": "TRIGGER_ALERT",
        "id": "optional-correlation-id",
        "data": {"alert_key": "my-alert", "priority": 1}
    }
    ```

    Server → Client:
    ```json
    {
        "type": "alert_triggered",
        "data": {...},
        "timestamp": "2024-01-15T10:30:00Z"
    }
    ```
    """
    manager = get_connection_manager()
    await manager.connect(websocket)

    try:
        # Send initial state
        async with AsyncSessionLocal() as db:
            state = await _get_current_state(db)
            await manager.send_to_one(
                websocket,
                ServerEventType.CONNECTION_ESTABLISHED.value,
                {
                    "state": state.model_dump(mode="json"),
                    "server_version": settings.APP_VERSION,
                },
            )

        # Process messages
        while True:
            try:
                raw_message = await websocket.receive_json()
                async with AsyncSessionLocal() as db:
                    await _process_message(websocket, db, raw_message)
            except ValueError as e:
                # Invalid JSON
                await manager.send_to_one(
                    websocket,
                    ServerEventType.ERROR.value,
                    {
                        "code": "INVALID_JSON",
                        "message": f"Invalid JSON: {e}",
                    },
                )

    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected normally")
    except Exception as e:
        logger.exception(f"WebSocket error: {e}")
    finally:
        await manager.disconnect(websocket)

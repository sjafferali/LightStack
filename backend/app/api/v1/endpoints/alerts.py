"""
Alert state and trigger/clear endpoints.

These endpoints manage the current state of alerts and provide
the trigger/clear functionality for Home Assistant integration.

All state-changing operations (trigger, clear) broadcast events
to connected WebSocket clients for real-time updates.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.alert import Alert
from app.schemas.alert import (
    AlertClearRequest,
    AlertConfigResponse,
    AlertResponse,
    AlertTriggerRequest,
    BulkClearResponse,
    CurrentDisplayResponse,
)
from app.services.alert_service import AlertService
from app.services.alert_service_ws import AlertServiceWithBroadcast

router = APIRouter()


def _build_alert_response(alert: Alert, trigger_count: int = 0) -> AlertResponse:
    """Helper to build AlertResponse from Alert model."""
    config_response = None
    if alert.config:
        config_response = AlertConfigResponse(
            id=alert.config.id,
            alert_key=alert.config.alert_key,
            name=alert.config.name,
            description=alert.config.description,
            default_priority=alert.config.default_priority,
            led_color=alert.config.led_color,
            led_effect=alert.config.led_effect,
            created_at=alert.config.created_at,
            updated_at=alert.config.updated_at,
            trigger_count=trigger_count,
        )

    return AlertResponse(
        id=alert.id,
        alert_key=alert.alert_key,
        is_active=alert.is_active,
        priority=alert.priority,
        effective_priority=alert.effective_priority,
        last_triggered_at=alert.last_triggered_at,
        created_at=alert.created_at,
        updated_at=alert.updated_at,
        config=config_response,
    )


@router.get("", response_model=list[AlertResponse])
async def list_alerts(
    active_only: bool = False,
    db: AsyncSession = Depends(get_db),
) -> list[AlertResponse]:
    """
    Get all alerts with their current state.

    Args:
        active_only: If true, only return currently active alerts
    """
    service = AlertService(db)

    if active_only:
        alerts = await service.get_active_alerts()
    else:
        alerts = await service.get_all_alerts()

    result = []
    for alert in alerts:
        trigger_count = await service.get_trigger_count(alert.alert_key)
        result.append(_build_alert_response(alert, trigger_count))

    return result


@router.get("/active", response_model=list[AlertResponse])
async def list_active_alerts(
    db: AsyncSession = Depends(get_db),
) -> list[AlertResponse]:
    """
    Get only active alerts, ordered by priority (highest priority first).

    This is the primary endpoint for determining which alerts need attention.
    """
    service = AlertService(db)
    alerts = await service.get_active_alerts()

    result = []
    for alert in alerts:
        trigger_count = await service.get_trigger_count(alert.alert_key)
        result.append(_build_alert_response(alert, trigger_count))

    return result


@router.get("/current", response_model=CurrentDisplayResponse)
async def get_current_display(
    db: AsyncSession = Depends(get_db),
) -> CurrentDisplayResponse:
    """
    Get the currently displayed alert on switches.

    This returns the highest priority active alert, which is what
    should be displayed on the Inovelli switch LEDs.

    If no alerts are active, is_all_clear will be true.
    """
    service = AlertService(db)
    current = await service.get_current_display()
    active_alerts = await service.get_active_alerts()

    if current:
        trigger_count = await service.get_trigger_count(current.alert_key)
        alert_response = _build_alert_response(current, trigger_count)
        return CurrentDisplayResponse(
            is_all_clear=False,
            alert=alert_response,
            active_count=len(active_alerts),
        )

    return CurrentDisplayResponse(
        is_all_clear=True,
        alert=None,
        active_count=0,
    )


@router.get("/{alert_key}", response_model=AlertResponse)
async def get_alert(
    alert_key: str,
    db: AsyncSession = Depends(get_db),
) -> AlertResponse:
    """
    Get a specific alert's current state.
    """
    service = AlertService(db)
    alert = await service.get_alert_by_key(alert_key)

    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alert '{alert_key}' not found",
        )

    trigger_count = await service.get_trigger_count(alert_key)
    return _build_alert_response(alert, trigger_count)


@router.post("/{alert_key}/trigger", response_model=AlertResponse)
async def trigger_alert(
    alert_key: str,
    trigger_data: AlertTriggerRequest | None = None,
    db: AsyncSession = Depends(get_db),
) -> AlertResponse:
    """
    Trigger an alert.

    This is the primary endpoint for Home Assistant to call when
    an alert condition is detected.

    If the alert_key doesn't exist, it will be automatically created
    with default settings (priority 3).

    This operation broadcasts to connected WebSocket clients:
    - `alert_triggered`: Always sent with alert details
    - `current_alert_changed`: Sent if the highest priority alert changed

    Args:
        alert_key: The unique identifier for this alert
        trigger_data: Optional priority override and note
    """
    # Use AlertServiceWithBroadcast to broadcast WebSocket events
    service = AlertServiceWithBroadcast(db)

    priority = None
    note = None
    if trigger_data:
        priority = trigger_data.priority
        note = trigger_data.note

    alert = await service.trigger_alert(
        alert_key=alert_key,
        priority=priority,
        note=note,
    )

    trigger_count = await service.get_trigger_count(alert_key)
    return _build_alert_response(alert, trigger_count)


@router.post("/{alert_key}/clear", response_model=AlertResponse)
async def clear_alert(
    alert_key: str,
    clear_data: AlertClearRequest | None = None,
    db: AsyncSession = Depends(get_db),
) -> AlertResponse:
    """
    Clear an alert.

    This is the primary endpoint for Home Assistant to call when
    an alert condition is resolved.

    After clearing, the system will automatically display the next
    highest priority active alert (if any).

    This operation broadcasts to connected WebSocket clients:
    - `alert_cleared`: Always sent with alert details
    - `current_alert_changed`: Sent if the highest priority alert changed
    """
    # Use AlertServiceWithBroadcast to broadcast WebSocket events
    service = AlertServiceWithBroadcast(db)

    note = clear_data.note if clear_data else None
    alert = await service.clear_alert(alert_key=alert_key, note=note)

    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alert '{alert_key}' not found",
        )

    trigger_count = await service.get_trigger_count(alert_key)
    return _build_alert_response(alert, trigger_count)


@router.post("/clear-all", response_model=BulkClearResponse)
async def clear_all_alerts(
    clear_data: AlertClearRequest | None = None,
    db: AsyncSession = Depends(get_db),
) -> BulkClearResponse:
    """
    Clear all active alerts.

    This is useful for resetting the system or when acknowledging
    multiple alerts at once.

    This operation broadcasts to connected WebSocket clients:
    - `all_alerts_cleared`: Always sent with list of cleared alert keys
    - `current_alert_changed`: Sent if there was an active current alert
    """
    # Use AlertServiceWithBroadcast to broadcast WebSocket events
    service = AlertServiceWithBroadcast(db)
    note = clear_data.note if clear_data else "Bulk clear"
    cleared_keys = await service.clear_all_alerts(note=note)

    return BulkClearResponse(
        cleared_count=len(cleared_keys),
        alert_keys=cleared_keys,
    )

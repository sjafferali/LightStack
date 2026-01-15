"""
Alert configuration endpoints.

These endpoints manage the default settings for each alert type,
including priority levels and LED display settings for Inovelli switches.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.alert import (
    AlertConfigCreate,
    AlertConfigResponse,
    AlertConfigUpdate,
    AlertKeyListResponse,
)
from app.services.alert_service import AlertService

router = APIRouter()


@router.get("", response_model=list[AlertConfigResponse])
async def list_alert_configs(
    db: AsyncSession = Depends(get_db),
) -> list[AlertConfigResponse]:
    """
    Get all alert configurations.

    Returns a list of all registered alert configurations with their
    default settings and trigger counts.
    """
    service = AlertService(db)
    configs = await service.get_all_configs()

    # Enrich with trigger counts
    result = []
    for config in configs:
        trigger_count = await service.get_trigger_count(config.alert_key)
        result.append(
            AlertConfigResponse(
                id=config.id,
                alert_key=config.alert_key,
                name=config.name,
                description=config.description,
                default_priority=config.default_priority,
                led_color=config.led_color,
                led_effect=config.led_effect,
                created_at=config.created_at,
                updated_at=config.updated_at,
                trigger_count=trigger_count,
            )
        )

    return result


@router.get("/summary", response_model=list[AlertKeyListResponse])
async def list_alert_keys_summary(
    db: AsyncSession = Depends(get_db),
) -> list[AlertKeyListResponse]:
    """
    Get summary of all alert keys with their current status.

    This is optimized for the alerts list page, showing each alert key
    with its default priority, active status, and trigger count.
    """
    service = AlertService(db)
    summaries = await service.get_all_alert_keys_summary()
    return [
        AlertKeyListResponse(
            alert_key=config.alert_key,
            name=config.name,
            default_priority=config.default_priority,
            is_active=alert.is_active if alert else False,
            last_triggered_at=alert.last_triggered_at if alert else None,
            trigger_count=trigger_count,
        )
        for config, alert, trigger_count in summaries
    ]


@router.get("/{alert_key}", response_model=AlertConfigResponse)
async def get_alert_config(
    alert_key: str,
    db: AsyncSession = Depends(get_db),
) -> AlertConfigResponse:
    """
    Get a specific alert configuration by key.
    """
    service = AlertService(db)
    config = await service.get_config_by_key(alert_key)

    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alert config '{alert_key}' not found",
        )

    trigger_count = await service.get_trigger_count(alert_key)
    return AlertConfigResponse(
        id=config.id,
        alert_key=config.alert_key,
        name=config.name,
        description=config.description,
        default_priority=config.default_priority,
        led_color=config.led_color,
        led_effect=config.led_effect,
        created_at=config.created_at,
        updated_at=config.updated_at,
        trigger_count=trigger_count,
    )


@router.post("", response_model=AlertConfigResponse, status_code=status.HTTP_201_CREATED)
async def create_alert_config(
    config_data: AlertConfigCreate,
    db: AsyncSession = Depends(get_db),
) -> AlertConfigResponse:
    """
    Create a new alert configuration.

    If an alert with this key already exists, returns a 409 Conflict error.
    """
    service = AlertService(db)

    # Check if already exists
    existing = await service.get_config_by_key(config_data.alert_key)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Alert config '{config_data.alert_key}' already exists",
        )

    config = await service.create_config(
        alert_key=config_data.alert_key,
        name=config_data.name,
        description=config_data.description,
        default_priority=config_data.default_priority,
        led_color=config_data.led_color,
        led_effect=config_data.led_effect,
    )

    return AlertConfigResponse(
        id=config.id,
        alert_key=config.alert_key,
        name=config.name,
        description=config.description,
        default_priority=config.default_priority,
        led_color=config.led_color,
        led_effect=config.led_effect,
        created_at=config.created_at,
        updated_at=config.updated_at,
        trigger_count=0,
    )


@router.put("/{alert_key}", response_model=AlertConfigResponse)
async def update_alert_config(
    alert_key: str,
    config_data: AlertConfigUpdate,
    db: AsyncSession = Depends(get_db),
) -> AlertConfigResponse:
    """
    Update an existing alert configuration.

    Only provided fields will be updated. Null fields are ignored.
    """
    service = AlertService(db)

    # Filter out None values
    update_data = {k: v for k, v in config_data.model_dump().items() if v is not None}

    config = await service.update_config(alert_key, **update_data)

    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alert config '{alert_key}' not found",
        )

    trigger_count = await service.get_trigger_count(alert_key)
    return AlertConfigResponse(
        id=config.id,
        alert_key=config.alert_key,
        name=config.name,
        description=config.description,
        default_priority=config.default_priority,
        led_color=config.led_color,
        led_effect=config.led_effect,
        created_at=config.created_at,
        updated_at=config.updated_at,
        trigger_count=trigger_count,
    )


@router.delete("/{alert_key}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_alert_config(
    alert_key: str,
    db: AsyncSession = Depends(get_db),
) -> None:
    """
    Delete an alert configuration.

    This will also delete any associated alert state and history
    references (history entries are kept but the config is removed).
    """
    service = AlertService(db)
    deleted = await service.delete_config(alert_key)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alert config '{alert_key}' not found",
        )

"""
Alert history endpoints.

These endpoints provide access to the audit log of all alert events.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.alert import (
    AlertHistoryResponse,
    PaginatedAlertHistoryResponse,
)
from app.services.alert_service import AlertService

router = APIRouter()


@router.get("", response_model=PaginatedAlertHistoryResponse)
async def list_alert_history(
    alert_key: str | None = Query(None, description="Filter by alert key"),
    action: str | None = Query(None, description="Filter by action type (triggered, cleared)"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Items per page"),
    db: AsyncSession = Depends(get_db),
) -> PaginatedAlertHistoryResponse:
    """
    Get paginated alert history.

    Supports filtering by alert_key and action type.
    Results are ordered by timestamp descending (newest first).
    """
    service = AlertService(db)
    offset = (page - 1) * page_size

    entries, total = await service.get_history(
        alert_key=alert_key,
        action=action,
        limit=page_size,
        offset=offset,
    )

    total_pages = (total + page_size - 1) // page_size if total > 0 else 1

    return PaginatedAlertHistoryResponse(
        items=[AlertHistoryResponse.model_validate(e) for e in entries],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/{alert_key}", response_model=list[AlertHistoryResponse])
async def get_alert_history(
    alert_key: str,
    limit: int = Query(50, ge=1, le=500, description="Maximum entries to return"),
    db: AsyncSession = Depends(get_db),
) -> list[AlertHistoryResponse]:
    """
    Get history for a specific alert.

    Returns the most recent entries for the specified alert key.
    """
    service = AlertService(db)
    entries, _ = await service.get_history(
        alert_key=alert_key,
        limit=limit,
        offset=0,
    )

    return [AlertHistoryResponse.model_validate(e) for e in entries]

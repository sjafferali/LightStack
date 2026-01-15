"""
Dashboard statistics endpoints.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.alert import DashboardStatsResponse
from app.services.alert_service import AlertService

router = APIRouter()


@router.get("", response_model=DashboardStatsResponse)
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
) -> DashboardStatsResponse:
    """
    Get dashboard statistics.

    Returns aggregated stats for the dashboard including:
    - Total alerts triggered today
    - Critical (P1) alerts today
    - Auto-cleared alerts today
    - Currently active alert count
    - Total registered alert keys
    """
    service = AlertService(db)
    stats = await service.get_dashboard_stats()
    return DashboardStatsResponse(**stats)

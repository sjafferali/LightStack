"""
API v1 main router.
"""

from fastapi import APIRouter

from app.api.v1.endpoints import alert_configs, alerts, history, stats, websocket

# Create main API router
api_router = APIRouter()

# Include alert-related routers
api_router.include_router(
    alerts.router,
    prefix="/alerts",
    tags=["alerts"],
)
api_router.include_router(
    alert_configs.router,
    prefix="/alert-configs",
    tags=["alert-configs"],
)
api_router.include_router(
    history.router,
    prefix="/history",
    tags=["history"],
)
api_router.include_router(
    stats.router,
    prefix="/stats",
    tags=["stats"],
)
api_router.include_router(
    websocket.router,
    prefix="/ws",
    tags=["websocket"],
)


@api_router.get("/")
async def root() -> dict[str, str]:
    """API v1 root endpoint."""
    return {"message": "Welcome to LightStack API v1"}

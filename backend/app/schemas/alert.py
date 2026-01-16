"""
Pydantic schemas for alert-related API endpoints.
"""

from datetime import datetime

from pydantic import BaseModel, Field

# =============================================================================
# Alert Config Schemas
# =============================================================================


class AlertConfigBase(BaseModel):
    """Base schema for alert configuration."""

    name: str | None = Field(None, max_length=200, description="Human-readable display name")
    description: str | None = Field(None, description="Alert description")
    default_priority: int = Field(
        default=3, ge=1, le=5, description="Default priority (1=Critical, 5=Info)"
    )
    led_color: int | None = Field(
        None, ge=0, le=255, description="Inovelli LED color value (0-255)"
    )
    led_effect: str | None = Field(
        None, max_length=50, description="LED effect: solid, blink, pulse, chase, etc."
    )
    led_brightness: int | None = Field(
        None, ge=0, le=100, description="LED brightness level (0-100)"
    )
    led_duration: int | None = Field(
        None,
        ge=0,
        le=255,
        description="LED effect duration (1-60=seconds, 61-120=minutes, 121-254=hours, 255=indefinite)",
    )


class AlertConfigCreate(AlertConfigBase):
    """Schema for creating a new alert configuration."""

    alert_key: str = Field(..., min_length=1, max_length=100, description="Unique alert identifier")


class AlertConfigUpdate(BaseModel):
    """Schema for updating an alert configuration."""

    name: str | None = Field(None, max_length=200)
    description: str | None = None
    default_priority: int | None = Field(None, ge=1, le=5)
    led_color: int | None = Field(None, ge=0, le=255)
    led_effect: str | None = Field(None, max_length=50)
    led_brightness: int | None = Field(None, ge=0, le=100)
    led_duration: int | None = Field(None, ge=0, le=255)


class AlertConfigResponse(AlertConfigBase):
    """Schema for alert configuration response."""

    id: int
    alert_key: str
    created_at: datetime
    updated_at: datetime
    trigger_count: int = Field(
        default=0, description="Total number of times this alert has been triggered"
    )

    model_config = {"from_attributes": True}


# =============================================================================
# Alert State Schemas
# =============================================================================


class AlertResponse(BaseModel):
    """Schema for alert current state response."""

    id: int
    alert_key: str
    is_active: bool
    priority: int | None = Field(None, description="Override priority (null = use default)")
    effective_priority: int = Field(description="The actual priority being used")
    last_triggered_at: datetime | None
    created_at: datetime
    updated_at: datetime

    # Include config info
    config: AlertConfigResponse | None = None

    model_config = {"from_attributes": True}


class AlertTriggerRequest(BaseModel):
    """Schema for triggering an alert."""

    priority: int | None = Field(
        None, ge=1, le=5, description="Override priority for this trigger (optional)"
    )
    note: str | None = Field(None, max_length=1000, description="Optional note for this trigger")


class AlertClearRequest(BaseModel):
    """Schema for clearing an alert."""

    note: str | None = Field(
        None, max_length=1000, description="Optional note for this clear action"
    )


class CurrentDisplayResponse(BaseModel):
    """Schema for the currently displayed alert on switches."""

    is_all_clear: bool = Field(description="True if no alerts are active")
    alert: AlertResponse | None = Field(None, description="The highest priority active alert")
    active_count: int = Field(description="Number of currently active alerts")


# =============================================================================
# Alert History Schemas
# =============================================================================


class AlertHistoryResponse(BaseModel):
    """Schema for a single alert history entry."""

    id: int
    alert_key: str
    action: str
    note: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class PaginatedAlertHistoryResponse(BaseModel):
    """Schema for paginated alert history."""

    items: list[AlertHistoryResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# =============================================================================
# Dashboard Stats Schemas
# =============================================================================


class DashboardStatsResponse(BaseModel):
    """Schema for dashboard statistics."""

    total_alerts_today: int = Field(description="Number of alerts triggered today")
    critical_today: int = Field(description="Number of critical (P1) alerts today")
    auto_cleared: int = Field(description="Number of auto-cleared alerts today")
    active_count: int = Field(description="Currently active alerts")
    total_alert_keys: int = Field(description="Total registered alert keys")


# =============================================================================
# Bulk Operation Schemas
# =============================================================================


class BulkClearResponse(BaseModel):
    """Schema for bulk clear operation response."""

    cleared_count: int
    alert_keys: list[str]


class AlertKeyListResponse(BaseModel):
    """Schema for listing all alert keys with summary info."""

    alert_key: str
    name: str | None
    default_priority: int
    is_active: bool
    last_triggered_at: datetime | None
    trigger_count: int
    # LED effect settings
    led_color: int | None = None
    led_effect: str | None = None
    led_brightness: int | None = None
    led_duration: int | None = None

    model_config = {"from_attributes": True}

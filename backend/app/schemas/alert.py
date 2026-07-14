"""
Pydantic schemas for alert-related API endpoints.
"""

from datetime import datetime
from typing import Any, Self

from pydantic import BaseModel, Field, model_validator

from app.constants.inovelli import (
    LED_MAX,
    LED_MIN,
    LedScope,
    effects_for_scope,
    is_valid_effect,
    validate_positions,
)

# =============================================================================
# Alert Config Schemas
# =============================================================================


def _check_led_settings(
    scope: LedScope | str | None,
    positions: list[int] | None,
    effect: str | None,
) -> list[int] | None:
    """
    Validate LED targeting against the capabilities of the chosen scope.

    Individual LEDs accept only a subset of the whole-bar effects, and an effect
    outside that subset is discarded by Zigbee2MQTT without error, so it is
    rejected here where the user can still see why.
    """
    if scope is None:
        return positions

    scope = LedScope(scope)

    if scope is LedScope.INDIVIDUAL:
        if not positions:
            raise ValueError("led_positions is required when led_scope is 'individual'")
        positions = validate_positions(positions)
    else:
        positions = None

    if effect is not None and not is_valid_effect(effect, scope):
        allowed = ", ".join(sorted(effects_for_scope(scope)))
        raise ValueError(
            f"LED effect {effect!r} is not supported for led_scope {scope.value!r}. "
            f"Supported effects: {allowed}"
        )

    return positions


class AlertConfigFields(BaseModel):
    """Alert configuration fields, without write-time validation."""

    name: str | None = Field(None, max_length=200, description="Human-readable display name")
    description: str | None = Field(None, description="Alert description")
    default_priority: int = Field(
        default=3, ge=1, le=5, description="Default priority (1=Critical, 5=Info)"
    )
    led_scope: LedScope = Field(
        default=LedScope.BAR,
        description="'bar' renders across the whole strip; 'individual' targets specific LEDs",
    )
    led_positions: list[int] | None = Field(
        None,
        description=f"LEDs ({LED_MIN}-{LED_MAX}, bottom to top) to light when led_scope="
        "'individual'",
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


class AlertConfigBase(AlertConfigFields):
    """Alert configuration as accepted on write, with LED targeting validated."""

    @model_validator(mode="after")
    def check_led_settings(self) -> Self:
        self.led_positions = _check_led_settings(
            self.led_scope, self.led_positions, self.led_effect
        )
        return self


class AlertConfigCreate(AlertConfigBase):
    """Schema for creating a new alert configuration."""

    alert_key: str = Field(..., min_length=1, max_length=100, description="Unique alert identifier")


class AlertConfigUpdate(BaseModel):
    """Schema for updating an alert configuration."""

    name: str | None = Field(None, max_length=200)
    description: str | None = None
    default_priority: int | None = Field(None, ge=1, le=5)
    led_scope: LedScope | None = None
    led_positions: list[int] | None = None
    led_color: int | None = Field(None, ge=0, le=255)
    led_effect: str | None = Field(None, max_length=50)
    led_brightness: int | None = Field(None, ge=0, le=100)
    led_duration: int | None = Field(None, ge=0, le=255)

    @model_validator(mode="after")
    def check_led_settings(self) -> Self:
        # A partial update that names neither scope nor effect cannot invalidate
        # the pairing, so validation only runs once a scope is in play.
        if self.led_scope is not None:
            self.led_positions = _check_led_settings(
                self.led_scope, self.led_positions, self.led_effect
            )
        return self


class AlertConfigResponse(AlertConfigFields):
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
# LED Render Plan Schemas
# =============================================================================


class LedSlotResponse(BaseModel):
    """What a single LED on the bar displays."""

    led: int = Field(ge=LED_MIN, le=LED_MAX, description="LED position (1=bottom, 7=top)")
    alert_key: str | None = Field(None, description="Alert owning this LED, null if unlit")
    effect: str
    color: int
    level: int
    duration: int

    model_config = {"from_attributes": True}


class RenderPlanResponse(BaseModel):
    """
    The complete LED display state of a switch.

    `leds` describes what each LED looks like and drives the UI preview.
    `commands` is the Zigbee2MQTT payload sequence that produces it: it always
    specifies the bar and all seven LEDs, so applying it needs no knowledge of
    the previous state.
    """

    mode: str = Field(description="'bar', 'individual', or 'idle'")
    is_all_clear: bool
    bar_alert_key: str | None = Field(None, description="Alert owning the bar in 'bar' mode")
    leds: list[LedSlotResponse]
    suppressed: list[str] = Field(
        default_factory=list,
        description="Alerts that are active but not currently rendered",
    )
    commands: list[dict[str, Any]] = Field(
        default_factory=list, description="Zigbee2MQTT payloads to publish, in order"
    )


class SimulatePlanRequest(BaseModel):
    """Request to preview the plan an arbitrary set of alerts would produce."""

    alert_keys: list[str] = Field(default_factory=list, description="Alert keys to treat as active")


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
    led_scope: LedScope = LedScope.BAR
    led_positions: list[int] | None = None
    led_color: int | None = None
    led_effect: str | None = None
    led_brightness: int | None = None
    led_duration: int | None = None

    model_config = {"from_attributes": True}

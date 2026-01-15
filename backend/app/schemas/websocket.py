"""
Pydantic schemas for WebSocket message protocol.

This module defines the message format for bidirectional WebSocket
communication between LightStack and Home Assistant integrations.
"""

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field

# =============================================================================
# Enums for Message Types
# =============================================================================


class ServerEventType(str, Enum):
    """Event types sent from server to client."""

    # Connection lifecycle
    CONNECTION_ESTABLISHED = "connection_established"

    # Alert state changes
    ALERT_TRIGGERED = "alert_triggered"
    ALERT_CLEARED = "alert_cleared"
    ALL_ALERTS_CLEARED = "all_alerts_cleared"

    # Current display changes (key event for HA sensor)
    CURRENT_ALERT_CHANGED = "current_alert_changed"

    # Response to client commands
    COMMAND_RESULT = "command_result"
    ERROR = "error"


class ClientCommandType(str, Enum):
    """Command types sent from client to server."""

    # State queries
    GET_STATE = "get_state"
    GET_ACTIVE_ALERTS = "get_active_alerts"
    GET_ALL_ALERTS = "get_all_alerts"

    # Alert actions
    TRIGGER_ALERT = "trigger_alert"
    CLEAR_ALERT = "clear_alert"
    CLEAR_ALL_ALERTS = "clear_all_alerts"

    # Connection management
    PING = "ping"


# =============================================================================
# Server → Client Schemas (Events)
# =============================================================================


class AlertData(BaseModel):
    """Alert data included in WebSocket events."""

    alert_key: str
    is_active: bool
    effective_priority: int
    priority: int | None = Field(None, description="Override priority if set")
    last_triggered_at: datetime | None = None

    # Config info
    name: str | None = None
    description: str | None = None
    default_priority: int = 3
    led_color: int | None = None
    led_effect: str | None = None


class CurrentAlertState(BaseModel):
    """Current alert display state."""

    is_all_clear: bool = Field(description="True if no alerts are active")
    current_alert: AlertData | None = Field(None, description="The highest priority active alert")
    active_count: int = Field(description="Number of currently active alerts")
    active_alerts: list[AlertData] = Field(
        default_factory=list, description="All active alerts ordered by priority"
    )


class ConnectionEstablishedData(BaseModel):
    """Data sent on initial connection."""

    state: CurrentAlertState
    server_version: str


class AlertTriggeredData(BaseModel):
    """Data sent when an alert is triggered."""

    alert: AlertData
    previous_current: AlertData | None = Field(
        None, description="The alert that was current before this trigger"
    )
    new_current: AlertData | None = Field(
        None, description="The new current alert after this trigger"
    )
    current_changed: bool = Field(description="Whether the current display alert changed")


class AlertClearedData(BaseModel):
    """Data sent when an alert is cleared."""

    alert: AlertData
    previous_current: AlertData | None = Field(
        None, description="The alert that was current before this clear"
    )
    new_current: AlertData | None = Field(
        None, description="The new current alert after this clear"
    )
    current_changed: bool = Field(description="Whether the current display alert changed")


class AllAlertsClearedData(BaseModel):
    """Data sent when all alerts are cleared."""

    cleared_count: int
    cleared_keys: list[str]


class CurrentAlertChangedData(BaseModel):
    """Data sent when the current (highest priority) alert changes."""

    previous: AlertData | None = Field(
        None, description="The previous current alert (None if was all clear)"
    )
    current: AlertData | None = Field(
        None, description="The new current alert (None if now all clear)"
    )
    is_all_clear: bool
    active_count: int


class CommandResultData(BaseModel):
    """Response to a client command."""

    command_id: str | None = Field(None, description="Correlation ID from the original command")
    command_type: str
    success: bool
    result: dict[str, Any] | None = None
    error: str | None = None


class ErrorData(BaseModel):
    """Error response."""

    code: str
    message: str
    command_id: str | None = None


# =============================================================================
# Client → Server Schemas (Commands)
# =============================================================================


class ClientCommand(BaseModel):
    """Base schema for client commands."""

    type: ClientCommandType
    id: str | None = Field(None, description="Optional correlation ID for responses")
    data: dict[str, Any] = Field(default_factory=dict)


class TriggerAlertCommand(BaseModel):
    """Command to trigger an alert."""

    alert_key: str
    priority: int | None = Field(None, ge=1, le=5, description="Override priority")
    note: str | None = None


class ClearAlertCommand(BaseModel):
    """Command to clear an alert."""

    alert_key: str
    note: str | None = None


class ClearAllAlertsCommand(BaseModel):
    """Command to clear all alerts."""

    note: str | None = None


# =============================================================================
# Generic Message Wrapper
# =============================================================================


class ServerMessage(BaseModel):
    """Generic server message wrapper."""

    type: ServerEventType
    data: dict[str, Any]
    timestamp: datetime


class ClientMessage(BaseModel):
    """Generic client message wrapper (for parsing incoming messages)."""

    type: str
    id: str | None = None
    data: dict[str, Any] = Field(default_factory=dict)

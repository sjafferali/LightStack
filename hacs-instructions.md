# LightStack HACS Integration Development Guide

This document provides comprehensive instructions for creating a Home Assistant Custom Component (HACS integration) for LightStack, a priority-based alert management system for Inovelli LED switches.

## Overview

LightStack provides both REST API and WebSocket interfaces for:
- Triggering and clearing alerts
- Monitoring the current active alert (for LED display)
- Real-time push notifications when alert state changes

The HACS integration should leverage the **WebSocket API** for real-time updates, providing instant sensor state changes without polling.

---

## Architecture Requirements

### Integration Components

The HACS integration should provide:

| Platform | Purpose | Implementation |
|----------|---------|----------------|
| **Sensor** | Current active alert display | Shows the highest priority alert name, with attributes for LED color/effect |
| **Binary Sensor** | Alert active status | `on` when any alert is active, `off` when all clear |
| **Button** | Clear all alerts | Triggers `clear_all_alerts` command |
| **Service** | Trigger alert | `lightstack.trigger_alert` service |
| **Service** | Clear alert | `lightstack.clear_alert` service |

### Recommended Directory Structure

```
custom_components/lightstack/
├── __init__.py           # Integration setup, WebSocket connection
├── manifest.json         # HACS metadata
├── config_flow.py        # UI configuration flow
├── const.py              # Constants and defaults
├── coordinator.py        # WebSocket-based data coordinator
├── sensor.py             # Current alert sensor
├── binary_sensor.py      # Alert active binary sensor
├── button.py             # Clear all button
├── services.yaml         # Service definitions
└── strings.json          # Localization strings
```

---

## WebSocket API Specification

### Connection

**Endpoint:** `ws://<host>:<port>/api/v1/ws`

Default port is `8080` when running via Docker.

### Connection Flow

1. Connect to WebSocket endpoint
2. Receive `connection_established` event with current state
3. Listen for push events (alert changes)
4. Send commands as needed (trigger, clear, ping)

### Message Format

#### Server → Client (Events)

```json
{
    "type": "event_type",
    "data": { ... },
    "timestamp": "2024-01-15T10:30:00Z"
}
```

#### Client → Server (Commands)

```json
{
    "type": "command_type",
    "id": "optional-correlation-id",
    "data": { ... }
}
```

---

## Server Events (Push Notifications)

### `connection_established`

Sent immediately after WebSocket connection is accepted.

```json
{
    "type": "connection_established",
    "data": {
        "state": {
            "is_all_clear": false,
            "current_alert": {
                "alert_key": "garage_door_open",
                "is_active": true,
                "effective_priority": 1,
                "priority": null,
                "last_triggered_at": "2024-01-15T10:00:00Z",
                "name": "Garage Door Open",
                "description": "The garage door has been left open",
                "default_priority": 1,
                "led_color": 0,
                "led_effect": "pulse"
            },
            "active_count": 2,
            "active_alerts": [
                { /* alert data */ },
                { /* alert data */ }
            ]
        },
        "server_version": "0.1.0"
    },
    "timestamp": "2024-01-15T10:30:00Z"
}
```

### `alert_triggered`

Sent when any alert is triggered (via REST API or WebSocket).

```json
{
    "type": "alert_triggered",
    "data": {
        "alert": {
            "alert_key": "front_door_unlocked",
            "is_active": true,
            "effective_priority": 2,
            "priority": null,
            "last_triggered_at": "2024-01-15T10:35:00Z",
            "name": "Front Door Unlocked",
            "description": null,
            "default_priority": 2,
            "led_color": 21,
            "led_effect": "blink"
        },
        "previous_current": { /* previous current alert or null */ },
        "new_current": { /* new current alert */ },
        "current_changed": true
    },
    "timestamp": "2024-01-15T10:35:00Z"
}
```

### `alert_cleared`

Sent when any alert is cleared.

```json
{
    "type": "alert_cleared",
    "data": {
        "alert": {
            "alert_key": "front_door_unlocked",
            "is_active": false,
            "effective_priority": 2,
            ...
        },
        "previous_current": { /* previous current alert */ },
        "new_current": { /* new current alert or null */ },
        "current_changed": true
    },
    "timestamp": "2024-01-15T10:40:00Z"
}
```

### `all_alerts_cleared`

Sent when bulk clear is performed.

```json
{
    "type": "all_alerts_cleared",
    "data": {
        "cleared_count": 3,
        "cleared_keys": ["alert_1", "alert_2", "alert_3"]
    },
    "timestamp": "2024-01-15T10:45:00Z"
}
```

### `current_alert_changed`

**KEY EVENT FOR SENSOR UPDATES** - Sent whenever the highest priority active alert changes.

```json
{
    "type": "current_alert_changed",
    "data": {
        "previous": { /* previous alert or null */ },
        "current": { /* new current alert or null */ },
        "is_all_clear": false,
        "active_count": 1
    },
    "timestamp": "2024-01-15T10:35:00Z"
}
```

### `command_result`

Response to client commands.

```json
{
    "type": "command_result",
    "data": {
        "command_id": "trigger-123",
        "command_type": "trigger_alert",
        "success": true,
        "result": { /* command-specific result */ }
    },
    "timestamp": "2024-01-15T10:35:00Z"
}
```

### `error`

Error response.

```json
{
    "type": "error",
    "data": {
        "code": "ALERT_NOT_FOUND",
        "message": "Alert 'unknown_alert' not found",
        "command_id": "clear-456"
    },
    "timestamp": "2024-01-15T10:35:00Z"
}
```

---

## Client Commands

### `ping`

Health check / keep-alive.

```json
{
    "type": "ping",
    "id": "ping-1"
}
```

Response:
```json
{
    "type": "command_result",
    "data": {
        "command_id": "ping-1",
        "command_type": "ping",
        "success": true,
        "result": { "pong": true }
    }
}
```

### `get_state`

Request current alert state.

```json
{
    "type": "get_state",
    "id": "state-1"
}
```

Response includes full `CurrentAlertState` in result.

### `get_active_alerts`

Request list of all active alerts.

```json
{
    "type": "get_active_alerts",
    "id": "active-1"
}
```

### `get_all_alerts`

Request list of all alerts (active and inactive).

```json
{
    "type": "get_all_alerts",
    "id": "all-1"
}
```

### `trigger_alert`

Trigger an alert.

```json
{
    "type": "trigger_alert",
    "id": "trigger-1",
    "data": {
        "alert_key": "my_alert",
        "priority": 1,
        "note": "Triggered by automation"
    }
}
```

**Parameters:**
- `alert_key` (required): Unique identifier for the alert
- `priority` (optional): Override priority (1-5, 1=Critical)
- `note` (optional): Audit note

**Note:** If the alert_key doesn't exist, it will be auto-created with default settings.

### `clear_alert`

Clear a specific alert.

```json
{
    "type": "clear_alert",
    "id": "clear-1",
    "data": {
        "alert_key": "my_alert",
        "note": "Cleared by automation"
    }
}
```

**Parameters:**
- `alert_key` (required): Alert to clear
- `note` (optional): Audit note

### `clear_all_alerts`

Clear all active alerts.

```json
{
    "type": "clear_all_alerts",
    "id": "clear-all-1",
    "data": {
        "note": "Bulk clear"
    }
}
```

---

## Alert Data Model

### AlertData

| Field | Type | Description |
|-------|------|-------------|
| `alert_key` | string | Unique identifier (e.g., "garage_door_open") |
| `is_active` | boolean | Whether the alert is currently active |
| `effective_priority` | integer | Actual priority being used (1-5) |
| `priority` | integer or null | Override priority (null = use default) |
| `last_triggered_at` | datetime or null | When last triggered |
| `name` | string or null | Human-readable display name |
| `description` | string or null | Alert description |
| `default_priority` | integer | Default priority from config (1-5) |
| `led_color` | integer or null | Inovelli LED color value (0-255) |
| `led_effect` | string or null | LED effect: "solid", "blink", "pulse", "chase" |

### Priority Levels

| Value | Level | Description |
|-------|-------|-------------|
| 1 | Critical | Immediate attention required |
| 2 | High | Important, needs attention soon |
| 3 | Medium | Moderate importance (default) |
| 4 | Low | Informational |
| 5 | Info | Minimal importance |

### Inovelli LED Color Mapping

The `led_color` value maps to Inovelli's color wheel (0-255):

| Value | Color |
|-------|-------|
| 0 | Red |
| 21 | Orange |
| 42 | Yellow |
| 85 | Green |
| 127 | Cyan |
| 170 | Blue |
| 212 | Purple |
| 234 | Pink |
| 255 | White |

---

## Implementation Guide

### 1. WebSocket Connection Manager

Create a class that manages the WebSocket connection lifecycle:

```python
import asyncio
import aiohttp
from homeassistant.core import HomeAssistant

class LightStackWebSocket:
    def __init__(self, hass: HomeAssistant, host: str, port: int):
        self.hass = hass
        self.url = f"ws://{host}:{port}/api/v1/ws"
        self._ws: aiohttp.ClientWebSocketResponse | None = None
        self._session: aiohttp.ClientSession | None = None
        self._listeners: list[Callable] = []
        self._running = False

    async def connect(self):
        """Establish WebSocket connection."""
        self._session = aiohttp.ClientSession()
        self._ws = await self._session.ws_connect(self.url)
        self._running = True

        # Start message listener
        self.hass.async_create_task(self._listen())

        # Wait for connection_established
        # (first message will have initial state)

    async def _listen(self):
        """Listen for incoming messages."""
        async for msg in self._ws:
            if msg.type == aiohttp.WSMsgType.TEXT:
                data = msg.json()
                await self._handle_message(data)
            elif msg.type == aiohttp.WSMsgType.ERROR:
                break

    async def _handle_message(self, data: dict):
        """Handle incoming WebSocket message."""
        event_type = data.get("type")
        event_data = data.get("data", {})

        # Notify all listeners
        for listener in self._listeners:
            listener(event_type, event_data)

    async def send_command(self, command_type: str, data: dict = None, command_id: str = None):
        """Send a command to the server."""
        message = {"type": command_type}
        if command_id:
            message["id"] = command_id
        if data:
            message["data"] = data
        await self._ws.send_json(message)

    def add_listener(self, callback: Callable):
        """Add a listener for WebSocket events."""
        self._listeners.append(callback)

    async def disconnect(self):
        """Close the WebSocket connection."""
        self._running = False
        if self._ws:
            await self._ws.close()
        if self._session:
            await self._session.close()
```

### 2. Data Coordinator

Use the WebSocket events to update entity state:

```python
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator

class LightStackCoordinator(DataUpdateCoordinator):
    def __init__(self, hass: HomeAssistant, websocket: LightStackWebSocket):
        super().__init__(
            hass,
            logger,
            name="LightStack",
            # No update_interval needed - we use push updates!
        )
        self.websocket = websocket
        self.websocket.add_listener(self._handle_event)

    def _handle_event(self, event_type: str, data: dict):
        """Handle WebSocket events and update coordinator data."""
        if event_type == "connection_established":
            self.async_set_updated_data(data["state"])
        elif event_type == "current_alert_changed":
            # Update the data with new current state
            new_data = {
                "is_all_clear": data["is_all_clear"],
                "current_alert": data["current"],
                "active_count": data["active_count"],
            }
            self.async_set_updated_data(new_data)
        elif event_type in ("alert_triggered", "alert_cleared"):
            # Could also handle these for more granular updates
            pass
```

### 3. Sensor Entity

```python
from homeassistant.components.sensor import SensorEntity

class LightStackCurrentAlertSensor(SensorEntity):
    """Sensor showing the current (highest priority) active alert."""

    def __init__(self, coordinator: LightStackCoordinator):
        self.coordinator = coordinator
        self._attr_unique_id = "lightstack_current_alert"
        self._attr_name = "LightStack Current Alert"

    @property
    def native_value(self) -> str:
        """Return current alert name or 'All Clear'."""
        data = self.coordinator.data
        if data.get("is_all_clear"):
            return "All Clear"
        alert = data.get("current_alert")
        if alert:
            return alert.get("name") or alert.get("alert_key")
        return "All Clear"

    @property
    def extra_state_attributes(self) -> dict:
        """Return additional attributes for automations."""
        data = self.coordinator.data
        alert = data.get("current_alert")

        attrs = {
            "is_all_clear": data.get("is_all_clear", True),
            "active_count": data.get("active_count", 0),
        }

        if alert:
            attrs.update({
                "alert_key": alert.get("alert_key"),
                "priority": alert.get("effective_priority"),
                "led_color": alert.get("led_color"),
                "led_effect": alert.get("led_effect"),
                "last_triggered": alert.get("last_triggered_at"),
            })

        return attrs
```

### 4. Services

Define services in `services.yaml`:

```yaml
trigger_alert:
  name: Trigger Alert
  description: Trigger a LightStack alert
  fields:
    alert_key:
      name: Alert Key
      description: Unique identifier for the alert
      required: true
      selector:
        text:
    priority:
      name: Priority
      description: Override priority (1=Critical, 5=Info)
      required: false
      selector:
        number:
          min: 1
          max: 5
          mode: slider
    note:
      name: Note
      description: Optional note for audit trail
      required: false
      selector:
        text:

clear_alert:
  name: Clear Alert
  description: Clear a specific LightStack alert
  fields:
    alert_key:
      name: Alert Key
      description: Alert to clear
      required: true
      selector:
        text:
    note:
      name: Note
      description: Optional note for audit trail
      required: false
      selector:
        text:

clear_all_alerts:
  name: Clear All Alerts
  description: Clear all active LightStack alerts
  fields:
    note:
      name: Note
      description: Optional note for audit trail
      required: false
      selector:
        text:
```

Register services in `__init__.py`:

```python
async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    # ... setup coordinator ...

    async def handle_trigger_alert(call: ServiceCall):
        await coordinator.websocket.send_command(
            "trigger_alert",
            data={
                "alert_key": call.data["alert_key"],
                "priority": call.data.get("priority"),
                "note": call.data.get("note"),
            }
        )

    async def handle_clear_alert(call: ServiceCall):
        await coordinator.websocket.send_command(
            "clear_alert",
            data={
                "alert_key": call.data["alert_key"],
                "note": call.data.get("note"),
            }
        )

    async def handle_clear_all(call: ServiceCall):
        await coordinator.websocket.send_command(
            "clear_all_alerts",
            data={"note": call.data.get("note")}
        )

    hass.services.async_register(DOMAIN, "trigger_alert", handle_trigger_alert)
    hass.services.async_register(DOMAIN, "clear_alert", handle_clear_alert)
    hass.services.async_register(DOMAIN, "clear_all_alerts", handle_clear_all)
```

### 5. Config Flow

```python
from homeassistant import config_entries
import voluptuous as vol

class LightStackConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    VERSION = 1

    async def async_step_user(self, user_input=None):
        errors = {}

        if user_input is not None:
            # Test connection
            try:
                ws = LightStackWebSocket(
                    self.hass,
                    user_input["host"],
                    user_input["port"]
                )
                await ws.connect()
                await ws.disconnect()

                return self.async_create_entry(
                    title=f"LightStack ({user_input['host']})",
                    data=user_input
                )
            except Exception:
                errors["base"] = "cannot_connect"

        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema({
                vol.Required("host", default="localhost"): str,
                vol.Required("port", default=8080): int,
            }),
            errors=errors,
        )
```

---

## REST API Reference (Fallback)

If WebSocket is unavailable, the REST API can be used with polling:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/alerts/current` | GET | Get current display alert |
| `/api/v1/alerts/active` | GET | List active alerts |
| `/api/v1/alerts` | GET | List all alerts |
| `/api/v1/alerts/{key}/trigger` | POST | Trigger an alert |
| `/api/v1/alerts/{key}/clear` | POST | Clear an alert |
| `/api/v1/alerts/clear-all` | POST | Clear all alerts |

### Example REST Trigger Request

```bash
curl -X POST "http://localhost:8080/api/v1/alerts/garage_door/trigger" \
  -H "Content-Type: application/json" \
  -d '{"priority": 1, "note": "Triggered by curl"}'
```

---

## Error Handling

### Error Codes

| Code | Description |
|------|-------------|
| `MISSING_ALERT_KEY` | alert_key not provided in command |
| `ALERT_NOT_FOUND` | Specified alert doesn't exist |
| `INVALID_MESSAGE` | Malformed WebSocket message |
| `INVALID_JSON` | Could not parse JSON |
| `UNKNOWN_COMMAND` | Unrecognized command type |

### Reconnection Strategy

The integration should implement automatic reconnection:

```python
async def _maintain_connection(self):
    """Maintain WebSocket connection with automatic reconnection."""
    while self._running:
        try:
            await self.connect()
            await self._listen()
        except Exception as e:
            logger.warning(f"WebSocket disconnected: {e}")
            if self._running:
                await asyncio.sleep(5)  # Wait before reconnecting
```

---

## Testing

### Manual WebSocket Testing

Use `websocat` or similar tool:

```bash
# Install websocat
brew install websocat

# Connect and interact
websocat ws://localhost:8080/api/v1/ws

# Send commands (paste these after connecting):
{"type": "ping", "id": "test-1"}
{"type": "get_state", "id": "test-2"}
{"type": "trigger_alert", "id": "test-3", "data": {"alert_key": "test_alert"}}
{"type": "clear_alert", "id": "test-4", "data": {"alert_key": "test_alert"}}
```

---

## Manifest Example

```json
{
    "domain": "lightstack",
    "name": "LightStack",
    "codeowners": ["@your-github-username"],
    "config_flow": true,
    "documentation": "https://github.com/your-repo/lightstack",
    "iot_class": "local_push",
    "issue_tracker": "https://github.com/your-repo/lightstack/issues",
    "requirements": ["aiohttp>=3.8.0"],
    "version": "1.0.0"
}
```

**Note:** `iot_class` is `local_push` because we use WebSocket for real-time updates.

---

## Summary

Key points for implementation:

1. **Use WebSocket** (`/api/v1/ws`) for real-time updates - no polling needed
2. **Listen for `current_alert_changed`** - this is the primary event for sensor updates
3. **Commands are lowercase**: `trigger_alert`, `clear_alert`, `clear_all_alerts`, `ping`, `get_state`
4. **Use correlation IDs** for command/response matching
5. **Auto-reconnect** on WebSocket disconnection
6. **Services** allow Home Assistant automations to trigger/clear alerts
7. **Sensor attributes** expose LED color/effect for advanced automations

The WebSocket-based approach provides instant updates when alert state changes, making the integration responsive without any polling overhead.

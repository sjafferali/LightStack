# Alert Configs API

The Alert Configs API manages default settings for each alert type, including priority levels and LED display settings.

## Endpoints

- [List All Configs](#list-all-configs)
- [List Configs Summary](#list-configs-summary)
- [Get Config by Key](#get-config-by-key)
- [Create Config](#create-config)
- [Update Config](#update-config)
- [Delete Config](#delete-config)

---

## List All Configs

Get all alert configurations.

```
GET /api/v1/alert-configs
```

### Response

```json
[
  {
    "id": 1,
    "alert_key": "garage_door_open",
    "name": "Garage Door Open",
    "description": "Triggered when garage door is left open for more than 5 minutes",
    "default_priority": 2,
    "led_color": 255,
    "led_effect": "pulse",
    "created_at": "2025-01-10T09:00:00Z",
    "updated_at": "2025-01-12T14:30:00Z",
    "trigger_count": 47
  },
  {
    "id": 2,
    "alert_key": "washer_done",
    "name": "Washer Done",
    "description": null,
    "default_priority": 4,
    "led_color": 85,
    "led_effect": "solid",
    "created_at": "2025-01-10T09:00:00Z",
    "updated_at": "2025-01-10T09:00:00Z",
    "trigger_count": 23
  }
]
```

### Example

```bash
curl http://localhost:8080/api/v1/alert-configs
```

---

## List Configs Summary

Get a summary view of all alert keys with their current status. Optimized for the alerts list page.

```
GET /api/v1/alert-configs/summary
```

### Response

```json
[
  {
    "alert_key": "garage_door_open",
    "name": "Garage Door Open",
    "default_priority": 2,
    "is_active": true,
    "last_triggered_at": "2025-01-15T14:32:00Z",
    "trigger_count": 47
  },
  {
    "alert_key": "washer_done",
    "name": "Washer Done",
    "default_priority": 4,
    "is_active": false,
    "last_triggered_at": "2025-01-14T18:20:00Z",
    "trigger_count": 23
  }
]
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `alert_key` | string | Unique identifier |
| `name` | string/null | Display name |
| `default_priority` | integer | Default priority (1-5) |
| `is_active` | boolean | Whether alert is currently active |
| `last_triggered_at` | datetime/null | Last trigger timestamp |
| `trigger_count` | integer | Total number of triggers |

### Example

```bash
curl http://localhost:8080/api/v1/alert-configs/summary
```

---

## Get Config by Key

Get a specific alert configuration.

```
GET /api/v1/alert-configs/{alert_key}
```

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `alert_key` | string | The unique alert identifier |

### Response

Returns a single config object.

### Errors

| Code | Description |
|------|-------------|
| `404` | Config not found |

### Example

```bash
curl http://localhost:8080/api/v1/alert-configs/garage_door_open
```

---

## Create Config

Create a new alert configuration.

```
POST /api/v1/alert-configs
```

### Request Body

```json
{
  "alert_key": "front_door_open",
  "name": "Front Door Open",
  "description": "Front door left open alert",
  "default_priority": 2,
  "led_color": 255,
  "led_effect": "pulse"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `alert_key` | string | **Yes** | Unique identifier (1-100 chars) |
| `name` | string | No | Display name (max 200 chars) |
| `description` | string | No | Description |
| `default_priority` | integer | No | Priority 1-5 (default: 3) |
| `led_color` | integer | No | Inovelli color 0-255 |
| `led_effect` | string | No | LED effect name |
| `led_brightness` | integer | No | LED brightness 0-100 |
| `led_duration` | integer | No | LED duration (see encoding below) |

### Response

Returns the created config object with `201 Created` status.

### Errors

| Code | Description |
|------|-------------|
| `409` | Alert key already exists |
| `422` | Validation error |

### Example

```bash
curl -X POST http://localhost:8080/api/v1/alert-configs \
  -H "Content-Type: application/json" \
  -d '{
    "alert_key": "front_door_open",
    "name": "Front Door Open",
    "default_priority": 2,
    "led_color": 255,
    "led_effect": "pulse"
  }'
```

---

## Update Config

Update an existing alert configuration.

```
PUT /api/v1/alert-configs/{alert_key}
```

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `alert_key` | string | The unique alert identifier |

### Request Body

Only include fields you want to update:

```json
{
  "name": "Front Door Left Open",
  "default_priority": 1,
  "led_color": 0,
  "led_effect": "chase"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Display name |
| `description` | string | Description |
| `default_priority` | integer | Priority 1-5 |
| `led_color` | integer | Inovelli color 0-255 |
| `led_effect` | string | LED effect name |
| `led_brightness` | integer | LED brightness 0-100 |
| `led_duration` | integer | LED duration (see encoding below) |

### Response

Returns the updated config object.

### Errors

| Code | Description |
|------|-------------|
| `404` | Config not found |
| `422` | Validation error |

### Example

```bash
curl -X PUT http://localhost:8080/api/v1/alert-configs/front_door_open \
  -H "Content-Type: application/json" \
  -d '{"default_priority": 1}'
```

---

## Delete Config

Delete an alert configuration. This also deletes any associated alert state.

```
DELETE /api/v1/alert-configs/{alert_key}
```

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `alert_key` | string | The unique alert identifier |

### Response

Returns `204 No Content` on success.

### Errors

| Code | Description |
|------|-------------|
| `404` | Config not found |

### Example

```bash
curl -X DELETE http://localhost:8080/api/v1/alert-configs/old_alert
```

---

## Config Object Schema

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Database ID |
| `alert_key` | string | Unique identifier |
| `name` | string/null | Display name |
| `description` | string/null | Description |
| `default_priority` | integer | Default priority (1-5) |
| `led_color` | integer/null | Inovelli LED color (0-255) |
| `led_effect` | string/null | LED effect name |
| `led_brightness` | integer/null | LED brightness (0-100) |
| `led_duration` | integer/null | LED duration (see encoding below) |
| `created_at` | datetime | Creation timestamp |
| `updated_at` | datetime | Last update timestamp |
| `trigger_count` | integer | Total trigger count |

---

## LED Configuration

LightStack stores LED effect parameters for Inovelli Blue series switches (VZM31-SN, VZM35-SN, etc.).

### LED Colors (Inovelli)

Inovelli switches use a 0-255 hue-based color wheel:

| Value | Color |
|-------|-------|
| 0 | Off |
| 1 | Red |
| 21 | Orange |
| 42 | Yellow |
| 85 | Green |
| 127 | Cyan |
| 145 | Teal |
| 170 | Blue |
| 195 | Purple |
| 220 | Light Pink |
| 234 | Pink |
| 255 | White |

### LED Effects

All available Inovelli LED effects:

| Effect Code | Display Name | Description |
|-------------|--------------|-------------|
| `off` | Off | LED off |
| `solid` | Solid | Steady light |
| `fast_blink` | Fast Blink | Rapid on/off blinking |
| `slow_blink` | Slow Blink | Slow on/off blinking |
| `pulse` | Pulse | Fade in/out breathing effect |
| `chase` | Chase | Running light pattern |
| `open_close` | Open/Close | Opening/closing animation |
| `small_to_big` | Small to Big | Growing size animation |
| `aurora` | Aurora | Color-shifting aurora effect |
| `slow_falling` | Slow Falling | Slowly falling animation |
| `medium_falling` | Medium Falling | Medium speed falling |
| `fast_falling` | Fast Falling | Fast falling animation |
| `slow_rising` | Slow Rising | Slowly rising animation |
| `medium_rising` | Medium Rising | Medium speed rising |
| `fast_rising` | Fast Rising | Fast rising animation |
| `medium_blink` | Medium Blink | Medium speed blinking |
| `slow_chase` | Slow Chase | Slow chase effect |
| `fast_chase` | Fast Chase | Fast chase effect |
| `fast_siren` | Fast Siren | Fast siren/alarm effect |
| `slow_siren` | Slow Siren | Slow siren/alarm effect |
| `clear_effect` | Clear Effect | Clear/remove current effect |

### LED Brightness

Brightness is specified as a percentage from 0-100:

| Value | Description |
|-------|-------------|
| 0 | Off |
| 50 | Half brightness |
| 100 | Full brightness |

### LED Duration

Duration uses a special encoding to support seconds, minutes, and hours:

| Value Range | Unit | Calculation |
|-------------|------|-------------|
| 1-60 | Seconds | Direct value (e.g., 30 = 30 seconds) |
| 61-120 | Minutes | `value - 60` (e.g., 65 = 5 minutes) |
| 121-254 | Hours | `value - 120` (e.g., 132 = 12 hours) |
| 255 | Indefinite | Runs until cleared |

**Common Duration Values:**

| Value | Duration |
|-------|----------|
| 5 | 5 seconds |
| 30 | 30 seconds |
| 61 | 1 minute |
| 65 | 5 minutes |
| 75 | 15 minutes |
| 90 | 30 minutes |
| 121 | 1 hour |
| 132 | 12 hours |
| 144 | 24 hours |
| 255 | Indefinitely |

> **Note**: Effect support depends on your specific Inovelli switch model and firmware version. The Blue series (VZM31-SN, VZM35-SN) supports all effects listed above.

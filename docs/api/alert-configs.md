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
| `created_at` | datetime | Creation timestamp |
| `updated_at` | datetime | Last update timestamp |
| `trigger_count` | integer | Total trigger count |

---

## LED Configuration

### LED Colors (Inovelli)

Inovelli switches use a 0-255 color wheel:

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

### LED Effects

Common effect names:

| Effect | Description |
|--------|-------------|
| `solid` | Steady light |
| `blink` | On/off blinking |
| `pulse` | Slow fade in/out |
| `chase` | Moving light pattern |
| `fast_blink` | Rapid blinking |

> **Note**: Effect support depends on your specific Inovelli switch model and firmware version.

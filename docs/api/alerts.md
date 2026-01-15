# Alerts API

The Alerts API manages the current state of alerts and provides trigger/clear functionality.

## Endpoints

- [List All Alerts](#list-all-alerts)
- [List Active Alerts](#list-active-alerts)
- [Get Current Display](#get-current-display)
- [Get Alert by Key](#get-alert-by-key)
- [Trigger Alert](#trigger-alert)
- [Clear Alert](#clear-alert)
- [Clear All Alerts](#clear-all-alerts)

---

## List All Alerts

Get all alerts with their current state.

```
GET /api/v1/alerts
```

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `active_only` | boolean | `false` | Only return active alerts |

### Response

```json
[
  {
    "id": 1,
    "alert_key": "garage_door_open",
    "is_active": true,
    "priority": null,
    "effective_priority": 2,
    "last_triggered_at": "2025-01-15T14:32:00Z",
    "created_at": "2025-01-10T09:00:00Z",
    "updated_at": "2025-01-15T14:32:00Z",
    "config": {
      "id": 1,
      "alert_key": "garage_door_open",
      "name": "Garage Door Open",
      "description": "Triggered when garage door is left open",
      "default_priority": 2,
      "led_color": 255,
      "led_effect": "pulse",
      "created_at": "2025-01-10T09:00:00Z",
      "updated_at": "2025-01-10T09:00:00Z",
      "trigger_count": 47
    }
  }
]
```

### Example

```bash
curl http://localhost:8080/api/v1/alerts
```

---

## List Active Alerts

Get only active alerts, sorted by priority (highest priority first).

```
GET /api/v1/alerts/active
```

### Response

Returns the same format as [List All Alerts](#list-all-alerts), but only includes alerts where `is_active` is `true`, sorted by `effective_priority` ascending (priority 1 first).

### Example

```bash
curl http://localhost:8080/api/v1/alerts/active
```

---

## Get Current Display

Get the alert currently being displayed on switches. This is the highest priority active alert.

```
GET /api/v1/alerts/current
```

### Response

```json
{
  "is_all_clear": false,
  "alert": {
    "id": 1,
    "alert_key": "garage_door_open",
    "is_active": true,
    "priority": null,
    "effective_priority": 2,
    "last_triggered_at": "2025-01-15T14:32:00Z",
    "created_at": "2025-01-10T09:00:00Z",
    "updated_at": "2025-01-15T14:32:00Z",
    "config": { ... }
  },
  "active_count": 3
}
```

When no alerts are active:

```json
{
  "is_all_clear": true,
  "alert": null,
  "active_count": 0
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `is_all_clear` | boolean | `true` if no alerts are active |
| `alert` | object/null | The highest priority active alert |
| `active_count` | integer | Total number of active alerts |

### Example

```bash
curl http://localhost:8080/api/v1/alerts/current
```

---

## Get Alert by Key

Get a specific alert by its key.

```
GET /api/v1/alerts/{alert_key}
```

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `alert_key` | string | The unique alert identifier |

### Response

Returns a single alert object.

### Errors

| Code | Description |
|------|-------------|
| `404` | Alert not found |

### Example

```bash
curl http://localhost:8080/api/v1/alerts/garage_door_open
```

---

## Trigger Alert

Trigger an alert. If the alert key doesn't exist, it will be automatically created with default settings.

```
POST /api/v1/alerts/{alert_key}/trigger
```

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `alert_key` | string | The unique alert identifier |

### Request Body (Optional)

```json
{
  "priority": 2,
  "note": "Door left open for 5 minutes"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `priority` | integer (1-5) | No | Override priority for this trigger |
| `note` | string | No | Note to record in history |

### Response

Returns the updated alert object.

### Behavior

1. If alert config doesn't exist, creates one with default priority 3
2. Sets `is_active` to `true`
3. Updates `last_triggered_at` to current time
4. If `priority` provided, overrides the default priority
5. Records a "triggered" entry in history

### Example

```bash
# Basic trigger
curl -X POST http://localhost:8080/api/v1/alerts/door_open/trigger

# With priority override and note
curl -X POST http://localhost:8080/api/v1/alerts/door_open/trigger \
  -H "Content-Type: application/json" \
  -d '{"priority": 1, "note": "Security alert - back door"}'
```

---

## Clear Alert

Clear an alert, marking it as inactive.

```
POST /api/v1/alerts/{alert_key}/clear
```

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `alert_key` | string | The unique alert identifier |

### Request Body (Optional)

```json
{
  "note": "Manually acknowledged"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `note` | string | No | Note to record in history |

### Response

Returns the updated alert object.

### Behavior

1. Sets `is_active` to `false`
2. Clears any priority override
3. Records a "cleared" entry in history
4. The next highest priority alert becomes the current display

### Errors

| Code | Description |
|------|-------------|
| `404` | Alert not found |

### Example

```bash
# Basic clear
curl -X POST http://localhost:8080/api/v1/alerts/door_open/clear

# With note
curl -X POST http://localhost:8080/api/v1/alerts/door_open/clear \
  -H "Content-Type: application/json" \
  -d '{"note": "Closed by user"}'
```

---

## Clear All Alerts

Clear all active alerts at once.

```
POST /api/v1/alerts/clear-all
```

### Request Body (Optional)

```json
{
  "note": "Bulk clear from dashboard"
}
```

### Response

```json
{
  "cleared_count": 3,
  "alert_keys": ["door_open", "motion_detected", "washer_done"]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `cleared_count` | integer | Number of alerts cleared |
| `alert_keys` | array | List of cleared alert keys |

### Example

```bash
curl -X POST http://localhost:8080/api/v1/alerts/clear-all \
  -H "Content-Type: application/json" \
  -d '{"note": "Morning reset"}'
```

---

## Alert Object Schema

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Database ID |
| `alert_key` | string | Unique identifier |
| `is_active` | boolean | Whether alert is active |
| `priority` | integer/null | Override priority (null = use default) |
| `effective_priority` | integer | Actual priority being used |
| `last_triggered_at` | datetime/null | Last trigger timestamp |
| `created_at` | datetime | Creation timestamp |
| `updated_at` | datetime | Last update timestamp |
| `config` | object/null | Associated configuration |

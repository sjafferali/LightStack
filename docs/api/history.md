# History API

The History API provides access to the audit log of all alert events.

## Endpoints

- [List History](#list-history)
- [Get History by Alert Key](#get-history-by-alert-key)

---

## List History

Get paginated alert history with optional filtering.

```
GET /api/v1/history
```

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `alert_key` | string | - | Filter by alert key |
| `action` | string | - | Filter by action (`triggered` or `cleared`) |
| `page` | integer | 1 | Page number (starts at 1) |
| `page_size` | integer | 50 | Items per page (1-100) |

### Response

```json
{
  "items": [
    {
      "id": 156,
      "alert_key": "garage_door_open",
      "action": "triggered",
      "note": "Door left open for 5 minutes",
      "created_at": "2025-01-15T14:32:00Z"
    },
    {
      "id": 155,
      "alert_key": "washer_done",
      "action": "cleared",
      "note": "Manually acknowledged",
      "created_at": "2025-01-15T14:28:00Z"
    }
  ],
  "total": 523,
  "page": 1,
  "page_size": 50,
  "total_pages": 11
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `items` | array | List of history entries |
| `total` | integer | Total number of entries |
| `page` | integer | Current page number |
| `page_size` | integer | Items per page |
| `total_pages` | integer | Total number of pages |

### Examples

```bash
# Get first page of all history
curl http://localhost:8080/api/v1/history

# Filter by alert key
curl "http://localhost:8080/api/v1/history?alert_key=garage_door_open"

# Filter by action
curl "http://localhost:8080/api/v1/history?action=triggered"

# Combine filters with pagination
curl "http://localhost:8080/api/v1/history?alert_key=garage_door_open&action=triggered&page=2&page_size=25"
```

---

## Get History by Alert Key

Get history entries for a specific alert.

```
GET /api/v1/history/{alert_key}
```

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `alert_key` | string | The unique alert identifier |

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | integer | 50 | Maximum entries to return (1-500) |

### Response

```json
[
  {
    "id": 156,
    "alert_key": "garage_door_open",
    "action": "triggered",
    "note": "Door left open for 5 minutes",
    "created_at": "2025-01-15T14:32:00Z"
  },
  {
    "id": 142,
    "alert_key": "garage_door_open",
    "action": "cleared",
    "note": null,
    "created_at": "2025-01-15T09:30:00Z"
  },
  {
    "id": 141,
    "alert_key": "garage_door_open",
    "action": "triggered",
    "note": null,
    "created_at": "2025-01-15T09:12:00Z"
  }
]
```

Results are ordered by timestamp descending (newest first).

### Examples

```bash
# Get last 50 entries for an alert
curl http://localhost:8080/api/v1/history/garage_door_open

# Get last 10 entries
curl "http://localhost:8080/api/v1/history/garage_door_open?limit=10"

# Get up to 500 entries
curl "http://localhost:8080/api/v1/history/garage_door_open?limit=500"
```

---

## History Entry Schema

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Database ID |
| `alert_key` | string | Alert identifier |
| `action` | string | Action type |
| `note` | string/null | Optional note |
| `created_at` | datetime | Event timestamp |

### Action Types

| Action | Description |
|--------|-------------|
| `triggered` | Alert was activated |
| `cleared` | Alert was deactivated |

---

## Usage Examples

### Get Today's Events

Using date filtering (via your application):

```bash
# Get all events, then filter client-side
curl "http://localhost:8080/api/v1/history?page_size=100"
```

### Track Alert Patterns

Get trigger history for analysis:

```bash
# All triggers for a specific alert
curl "http://localhost:8080/api/v1/history?alert_key=motion_garage&action=triggered&page_size=100"
```

### Audit Trail

Get complete history for compliance:

```bash
# Page through all history
for page in 1 2 3 4 5; do
  curl "http://localhost:8080/api/v1/history?page=$page&page_size=100"
done
```

---

## Notes

- History entries are never deleted, even when the associated alert config is deleted
- The `note` field is populated from trigger/clear request bodies
- Timestamps are in UTC with timezone information
- Results are always sorted by `created_at` descending

# API Overview

LightStack provides a RESTful API for managing alerts, configurations, and history.

## Base URL

All API endpoints are prefixed with `/api/v1`.

```
http://localhost:8080/api/v1
```

## Authentication

Currently, LightStack does not require authentication. For production deployments behind a reverse proxy, consider adding authentication at the proxy level.

## Content Type

All requests and responses use JSON:

```
Content-Type: application/json
```

## Endpoints Summary

### Alerts

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/alerts` | List all alerts |
| `GET` | `/alerts/active` | List active alerts |
| `GET` | `/alerts/current` | Get currently displayed alert |
| `GET` | `/alerts/{alert_key}` | Get specific alert |
| `POST` | `/alerts/{alert_key}/trigger` | Trigger an alert |
| `POST` | `/alerts/{alert_key}/clear` | Clear an alert |
| `POST` | `/alerts/clear-all` | Clear all alerts |

[Full Alerts Documentation](alerts.md)

### Alert Configs

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/alert-configs` | List all configurations |
| `GET` | `/alert-configs/summary` | List with status summary |
| `GET` | `/alert-configs/{alert_key}` | Get specific config |
| `POST` | `/alert-configs` | Create configuration |
| `PUT` | `/alert-configs/{alert_key}` | Update configuration |
| `DELETE` | `/alert-configs/{alert_key}` | Delete configuration |

[Full Alert Configs Documentation](alert-configs.md)

### History

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/history` | List alert history |
| `GET` | `/history/{alert_key}` | Get history for alert |

[Full History Documentation](history.md)

### Stats

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/stats` | Get dashboard statistics |

[Full Stats Documentation](stats.md)

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Basic health check |
| `GET` | `/health/ready` | Readiness check with DB |

## Common Response Formats

### Success Response

```json
{
  "id": 1,
  "alert_key": "garage_door_open",
  "is_active": true,
  ...
}
```

### Error Response

```json
{
  "detail": "Alert 'unknown_key' not found"
}
```

## HTTP Status Codes

| Code | Description |
|------|-------------|
| `200` | Success |
| `201` | Created |
| `204` | No Content (successful delete) |
| `400` | Bad Request |
| `404` | Not Found |
| `409` | Conflict (duplicate) |
| `422` | Validation Error |
| `500` | Server Error |

## Rate Limiting

When rate limiting is enabled:

- Default: 100 requests per 60 seconds
- Exceeded: Returns `429 Too Many Requests`

## Interactive Documentation

OpenAPI/Swagger documentation is available at:

```
http://localhost:8080/api/docs
```

ReDoc documentation:

```
http://localhost:8080/api/redoc
```

## Quick Examples

### Trigger an Alert

```bash
curl -X POST http://localhost:8080/api/v1/alerts/door_open/trigger \
  -H "Content-Type: application/json" \
  -d '{"priority": 2, "note": "Front door left open"}'
```

### Clear an Alert

```bash
curl -X POST http://localhost:8080/api/v1/alerts/door_open/clear
```

### Get Current Display

```bash
curl http://localhost:8080/api/v1/alerts/current
```

### List Active Alerts

```bash
curl http://localhost:8080/api/v1/alerts/active
```

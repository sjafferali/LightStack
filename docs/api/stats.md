# Stats API

The Stats API provides aggregated statistics for the dashboard.

## Endpoints

- [Get Dashboard Stats](#get-dashboard-stats)

---

## Get Dashboard Stats

Get aggregated statistics for the dashboard.

```
GET /api/v1/stats
```

### Response

```json
{
  "total_alerts_today": 12,
  "critical_today": 2,
  "auto_cleared": 8,
  "active_count": 3,
  "total_alert_keys": 15
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `total_alerts_today` | integer | Number of alerts triggered today |
| `critical_today` | integer | Number of P1 (critical) alerts triggered today |
| `auto_cleared` | integer | Number of alerts auto-cleared today |
| `active_count` | integer | Currently active alerts |
| `total_alert_keys` | integer | Total registered alert keys |

### Calculation Details

#### total_alerts_today
Counts all history entries with `action = "triggered"` where `created_at` is today (UTC).

#### critical_today
Counts triggered alerts today where the associated config has `default_priority = 1`.

#### auto_cleared
Counts cleared alerts today where the `note` field contains "auto" (case-insensitive).

#### active_count
Counts alerts where `is_active = true`.

#### total_alert_keys
Counts all entries in the alert_configs table.

### Example

```bash
curl http://localhost:8080/api/v1/stats
```

### Response Example (Active System)

```json
{
  "total_alerts_today": 47,
  "critical_today": 3,
  "auto_cleared": 31,
  "active_count": 5,
  "total_alert_keys": 23
}
```

### Response Example (Quiet System)

```json
{
  "total_alerts_today": 0,
  "critical_today": 0,
  "auto_cleared": 0,
  "active_count": 0,
  "total_alert_keys": 10
}
```

---

## Usage

### Dashboard Polling

The frontend polls this endpoint to update the dashboard stats:

```javascript
// Poll every 30 seconds
const { data: stats } = useQuery({
  queryKey: ['stats'],
  queryFn: statsApi.getDashboard,
  refetchInterval: 30000,
});
```

### Home Assistant Sensor

Create a sensor in Home Assistant:

```yaml
rest:
  - resource: "http://lightstack:8080/api/v1/stats"
    scan_interval: 60
    sensor:
      - name: "LightStack Active Alerts"
        value_template: "{{ value_json.active_count }}"
      - name: "LightStack Alerts Today"
        value_template: "{{ value_json.total_alerts_today }}"
      - name: "LightStack Critical Today"
        value_template: "{{ value_json.critical_today }}"
```

### Monitoring

Monitor alert activity:

```bash
# Check current stats
curl -s http://localhost:8080/api/v1/stats | jq .

# Watch for changes
watch -n 5 'curl -s http://localhost:8080/api/v1/stats | jq .'
```

---

## Notes

- "Today" is defined as UTC midnight to current time
- Stats are computed in real-time, not cached
- Auto-cleared detection relies on the word "auto" in the note field
- For high-traffic systems, consider caching these stats

# Quick Start

Get up and running with LightStack in under 5 minutes.

## 1. Start LightStack

```bash
git clone https://github.com/sjafferali/LightStack.git
cd LightStack
docker-compose up -d
```

## 2. Open the Dashboard

Navigate to http://localhost:8080 in your browser.

You'll see the LightStack dashboard with:
- **Current Display** - The alert currently shown on your switches
- **Active Alerts** - All currently active alerts
- **Quick Stats** - Alert statistics

## 3. Trigger Your First Alert

Using the API:

```bash
curl -X POST http://localhost:8080/api/v1/alerts/test_alert/trigger \
  -H "Content-Type: application/json" \
  -d '{"note": "My first alert"}'
```

Or use the web UI:
1. Click **Alerts** in the navigation
2. Click **+ Trigger Alert**
3. Enter `test_alert` as the alert key
4. Click **Trigger Alert**

## 4. View the Alert

Go back to the Dashboard. You'll see:
- The alert displayed in "Currently Displaying on Switches"
- The alert listed under "Active Alerts"

## 5. Clear the Alert

Using the API:

```bash
curl -X POST http://localhost:8080/api/v1/alerts/test_alert/clear
```

Or click **Clear** next to the alert in the web UI.

## 6. Test Priority

Trigger two alerts with different priorities:

```bash
# Low priority alert
curl -X POST http://localhost:8080/api/v1/alerts/low_priority/trigger \
  -H "Content-Type: application/json" \
  -d '{"priority": 4}'

# High priority alert
curl -X POST http://localhost:8080/api/v1/alerts/high_priority/trigger \
  -H "Content-Type: application/json" \
  -d '{"priority": 1}'
```

Notice that "high_priority" is displayed because priority 1 (Critical) is higher than priority 4 (Low).

Now clear the high priority alert:

```bash
curl -X POST http://localhost:8080/api/v1/alerts/high_priority/clear
```

The display automatically switches to show "low_priority" - the next highest priority active alert.

## 7. Configure Default Priorities

1. Go to **Alerts** in the navigation
2. Find an alert key and click **Configure**
3. Set the default priority level
4. Click **Save Changes**

Now when this alert is triggered without a priority override, it will use this default.

## Understanding Priority

| Priority | Label | Example Use Cases |
|----------|-------|-------------------|
| 1 | Critical | Security breach, water leak, fire alarm |
| 2 | High | Door left open, motion in secure area |
| 3 | Medium | Package delivered, visitor at door |
| 4 | Low | Washer/dryer done, dishwasher complete |
| 5 | Info | Daily reminders, non-urgent notifications |

Lower numbers = higher priority. Priority 1 alerts always display over Priority 5.

## Next Steps

- [Home Assistant Integration](../integrations/home-assistant.md) - Connect LightStack to Home Assistant
- [API Reference](../api/README.md) - Full API documentation
- [Configuration](configuration.md) - Advanced configuration options

## Common Workflows

### Track Door Left Open

```bash
# When door opens and stays open for 5 minutes
curl -X POST http://localhost:8080/api/v1/alerts/front_door_open/trigger \
  -d '{"note": "Front door left open"}'

# When door closes
curl -X POST http://localhost:8080/api/v1/alerts/front_door_open/clear
```

### Appliance Notifications

```bash
# When washer finishes
curl -X POST http://localhost:8080/api/v1/alerts/washer_done/trigger \
  -d '{"priority": 4, "note": "Wash cycle complete"}'

# When acknowledged (clothes removed)
curl -X POST http://localhost:8080/api/v1/alerts/washer_done/clear
```

### Security Alert

```bash
# Motion detected in garage at night
curl -X POST http://localhost:8080/api/v1/alerts/garage_motion/trigger \
  -d '{"priority": 1, "note": "Motion detected at 2:30 AM"}'
```

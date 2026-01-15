# LightStack

A priority-based alert management system for Home Assistant, designed specifically for Inovelli light switches with notification LEDs.

## The Problem

Inovelli switches feature an LED notification bar that can display different colors and effects—perfect for home automation alerts. However, when using these LEDs with Home Assistant to indicate multiple alerts, managing concurrent notifications becomes problematic:

1. **Lost Alerts**: With multiple active alerts, only one LED state can be displayed at a time, causing others to be "lost" visually
2. **Incorrect State on Clear**: When one alert clears, the LED resets to "all clear" even if other alerts are still active

**Example Timeline:**
```
alert 1 fires → switch displays alert 1
alert 2 fires → switch displays alert 2
alert 2 clears → switch shows "all clear" (alert 1 is still active!)
```

## The Solution

LightStack acts as a centralized alert state manager that:

- **Tracks all active alerts** - Maintains state for all alerts, not just the currently displayed one
- **Priority-based display** - Configurable priority levels (1-5) ensure the most important alert is always shown
- **Proper state management** - When an alert clears, the next highest-priority active alert is displayed instead of "all clear"

**With LightStack:**
```
alert 1 fires → switch displays alert 1
alert 2 fires → switch displays alert 2 (if higher priority)
alert 2 clears → switch displays alert 1 (correctly shows remaining alert)
```

## Quick Start with Docker Compose

```bash
# Clone the repository
git clone https://github.com/sjafferali/LightStack.git
cd LightStack

# Start LightStack
docker-compose up -d
```

The application will be available at:
- **Web UI**: http://localhost:8080
- **API Docs**: http://localhost:8080/api/docs

## Home Assistant Integration

### Trigger an Alert

```yaml
rest_command:
  lightstack_trigger:
    url: "http://lightstack:8080/api/v1/alerts/{{ alert_key }}/trigger"
    method: POST
    content_type: "application/json"
    payload: '{"note": "{{ note | default() }}"}'
```

### Clear an Alert

```yaml
rest_command:
  lightstack_clear:
    url: "http://lightstack:8080/api/v1/alerts/{{ alert_key }}/clear"
    method: POST
```

### Poll Current Display (for LED Sync)

```yaml
rest:
  - resource: "http://lightstack:8080/api/v1/alerts/current"
    scan_interval: 5
    sensor:
      - name: "LightStack Current Alert"
        value_template: >
          {{ value_json.alert.alert_key if not value_json.is_all_clear else 'all_clear' }}
      - name: "LightStack Alert Priority"
        value_template: >
          {{ value_json.alert.effective_priority if not value_json.is_all_clear else 0 }}
```

### Example Automation

```yaml
automation:
  - alias: "Trigger LightStack Alert - Garage Door Open"
    trigger:
      - platform: state
        entity_id: binary_sensor.garage_door
        to: "on"
        for: "00:05:00"
    action:
      - service: rest_command.lightstack_trigger
        data:
          alert_key: garage_door_open
          note: "Garage door left open for 5 minutes"

  - alias: "Clear LightStack Alert - Garage Door Closed"
    trigger:
      - platform: state
        entity_id: binary_sensor.garage_door
        to: "off"
    action:
      - service: rest_command.lightstack_clear
        data:
          alert_key: garage_door_open
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/alerts/current` | GET | Get currently displayed alert |
| `/api/v1/alerts/active` | GET | List all active alerts |
| `/api/v1/alerts/{key}/trigger` | POST | Trigger an alert |
| `/api/v1/alerts/{key}/clear` | POST | Clear an alert |
| `/api/v1/alerts/clear-all` | POST | Clear all alerts |
| `/api/v1/alert-configs` | GET | List all alert configurations |
| `/api/v1/alert-configs/{key}` | PUT | Update alert configuration |
| `/api/v1/history` | GET | Get alert history |
| `/api/v1/stats` | GET | Get dashboard statistics |

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_PASSWORD` | `changeme` | PostgreSQL password |
| `SECRET_KEY` | - | Secret key for sessions |

### Priority Levels

| Priority | Label | Use Case |
|----------|-------|----------|
| 1 | Critical | Security alerts, water leaks |
| 2 | High | Door/window left open |
| 3 | Medium | Default priority |
| 4 | Low | Appliance notifications |
| 5 | Info | General information |

## Development

### Local Development with Docker

```bash
docker-compose -f docker-compose.dev.yml up
```

This starts:
- Backend with hot-reload at http://localhost:8000
- Frontend with HMR at http://localhost:5173
- PostgreSQL database
- Adminer at http://localhost:8081

### Local Development without Docker

**Backend:**
```bash
cd backend
poetry install
poetry run uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## Tech Stack

- **Backend**: Python, FastAPI, SQLAlchemy, PostgreSQL
- **Frontend**: React, TypeScript, Tailwind CSS, React Query
- **Infrastructure**: Docker, nginx

## License

MIT License

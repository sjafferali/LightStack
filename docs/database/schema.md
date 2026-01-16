# Database Schema

This document describes the LightStack database schema.

## Overview

LightStack uses a PostgreSQL database (or SQLite for development) with three main tables:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  alert_configs  │────<│     alerts      │     │  alert_history  │
│                 │     │                 │     │                 │
│  alert_key (PK) │     │  alert_key (FK) │     │  alert_key      │
│  default_priority│     │  is_active      │     │  action         │
│  led_color      │     │  priority       │     │  note           │
│  led_effect     │     │  last_triggered │     │  created_at     │
│  led_brightness │     └─────────────────┘     └─────────────────┘
│  led_duration   │
└─────────────────┘
```

## Tables

### alert_configs

Stores configuration for each alert type.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | INTEGER | No | Auto | Primary key |
| `alert_key` | VARCHAR | No | - | Unique alert identifier |
| `name` | VARCHAR | Yes | NULL | Human-readable name |
| `description` | VARCHAR | Yes | NULL | Alert description |
| `default_priority` | INTEGER | No | 3 | Default priority (1-5) |
| `led_color` | INTEGER | Yes | NULL | Inovelli LED color (0-255) |
| `led_effect` | VARCHAR | Yes | NULL | Inovelli LED effect name |
| `led_brightness` | INTEGER | Yes | NULL | LED brightness (0-100) |
| `led_duration` | INTEGER | Yes | NULL | LED duration (encoded, see below) |
| `created_at` | TIMESTAMP | No | NOW() | Creation timestamp |
| `updated_at` | TIMESTAMP | Yes | NULL | Last update timestamp |

**Indexes:**
- `alert_configs_pkey` - Primary key on `id`
- `ix_alert_configs_alert_key` - Unique index on `alert_key`

**SQL:**

```sql
CREATE TABLE alert_configs (
    id SERIAL PRIMARY KEY,
    alert_key VARCHAR NOT NULL UNIQUE,
    name VARCHAR,
    description VARCHAR,
    default_priority INTEGER NOT NULL DEFAULT 3,
    led_color INTEGER,
    led_effect VARCHAR(50),
    led_brightness INTEGER,
    led_duration INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE UNIQUE INDEX ix_alert_configs_alert_key ON alert_configs(alert_key);
```

---

### alerts

Stores the current state of each alert.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | INTEGER | No | Auto | Primary key |
| `alert_key` | VARCHAR | No | - | Foreign key to alert_configs |
| `is_active` | BOOLEAN | No | FALSE | Whether alert is currently active |
| `priority` | INTEGER | Yes | NULL | Priority override (1-5) |
| `last_triggered_at` | TIMESTAMP | Yes | NULL | Last trigger timestamp |
| `created_at` | TIMESTAMP | No | NOW() | Creation timestamp |
| `updated_at` | TIMESTAMP | Yes | NULL | Last update timestamp |

**Indexes:**
- `alerts_pkey` - Primary key on `id`
- `ix_alerts_alert_key` - Index on `alert_key`
- `ix_alerts_is_active` - Index on `is_active`

**Foreign Keys:**
- `alerts_alert_key_fkey` - References `alert_configs(alert_key)`

**SQL:**

```sql
CREATE TABLE alerts (
    id SERIAL PRIMARY KEY,
    alert_key VARCHAR NOT NULL REFERENCES alert_configs(alert_key),
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    priority INTEGER,
    last_triggered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX ix_alerts_alert_key ON alerts(alert_key);
CREATE INDEX ix_alerts_is_active ON alerts(is_active);
```

---

### alert_history

Audit log of all alert events.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | INTEGER | No | Auto | Primary key |
| `alert_key` | VARCHAR | No | - | Alert identifier (not FK) |
| `action` | VARCHAR | No | - | Event type (triggered/cleared) |
| `note` | VARCHAR | Yes | NULL | Optional note |
| `created_at` | TIMESTAMP | No | NOW() | Event timestamp |

**Indexes:**
- `alert_history_pkey` - Primary key on `id`
- `ix_alert_history_alert_key` - Index on `alert_key`
- `ix_alert_history_created_at` - Index on `created_at`
- `ix_alert_history_action` - Index on `action`

**Note:** `alert_key` is not a foreign key to preserve history even when alert configs are deleted.

**SQL:**

```sql
CREATE TABLE alert_history (
    id SERIAL PRIMARY KEY,
    alert_key VARCHAR NOT NULL,
    action VARCHAR NOT NULL,
    note VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX ix_alert_history_alert_key ON alert_history(alert_key);
CREATE INDEX ix_alert_history_created_at ON alert_history(created_at DESC);
CREATE INDEX ix_alert_history_action ON alert_history(action);
```

---

## Entity Relationships

### alert_configs → alerts (One-to-One)

Each alert config has at most one corresponding alert record.

```
alert_configs.alert_key ←──── alerts.alert_key
```

### alert_configs → alert_history (One-to-Many, Soft Reference)

Each alert config can have many history entries. History is preserved when configs are deleted.

```
alert_configs.alert_key ←···· alert_history.alert_key
```

## Priority System

Priority levels (1-5, lower = more urgent):

| Level | Name | Use Case |
|-------|------|----------|
| 1 | Critical | Security alerts, emergencies |
| 2 | High | Important issues requiring attention |
| 3 | Medium | Normal alerts (default) |
| 4 | Low | Non-urgent notifications |
| 5 | Info | Informational messages |

### Effective Priority

The effective priority for display is calculated as:

```sql
COALESCE(alerts.priority, alert_configs.default_priority)
```

This allows:
- Setting a default priority in the config
- Overriding priority on individual triggers

## LED Configuration

Inovelli Blue series switches (VZM31-SN, VZM35-SN, etc.) use the following LED parameters:

### LED Color (0-255)

Hue value on the color wheel:

| Color | Value |
|-------|-------|
| Off | 0 |
| Red | 1 |
| Orange | 21 |
| Yellow | 42 |
| Green | 85 |
| Cyan | 127 |
| Teal | 145 |
| Blue | 170 |
| Purple | 195 |
| Light Pink | 220 |
| Pink | 234 |
| White | 255 |

### LED Effect (String)

Effect names stored as strings:

| Effect | Description |
|--------|-------------|
| `off` | LED off |
| `solid` | Steady light |
| `fast_blink` | Rapid on/off blinking |
| `slow_blink` | Slow on/off blinking |
| `pulse` | Fade in/out breathing effect |
| `chase` | Running light pattern |
| `open_close` | Opening/closing animation |
| `small_to_big` | Growing size animation |
| `aurora` | Color-shifting aurora effect |
| `slow_falling` | Slowly falling animation |
| `medium_falling` | Medium speed falling |
| `fast_falling` | Fast falling animation |
| `slow_rising` | Slowly rising animation |
| `medium_rising` | Medium speed rising |
| `fast_rising` | Fast rising animation |
| `medium_blink` | Medium speed blinking |
| `slow_chase` | Slow chase effect |
| `fast_chase` | Fast chase effect |
| `fast_siren` | Fast siren/alarm effect |
| `slow_siren` | Slow siren/alarm effect |
| `clear_effect` | Clear/remove current effect |

### LED Brightness (0-100)

Brightness as a percentage:

| Value | Description |
|-------|-------------|
| 0 | Off |
| 50 | Half brightness |
| 100 | Full brightness |

### LED Duration (Encoded)

Duration uses special encoding:

| Value Range | Unit | Calculation |
|-------------|------|-------------|
| 1-60 | Seconds | Direct value |
| 61-120 | Minutes | `value - 60` |
| 121-254 | Hours | `value - 120` |
| 255 | Indefinite | Runs until cleared |

## Queries

### Get Current Display Alert

```sql
SELECT
    a.alert_key,
    COALESCE(a.priority, c.default_priority) as priority,
    c.led_color,
    c.led_effect,
    c.led_brightness,
    c.led_duration
FROM alerts a
JOIN alert_configs c ON a.alert_key = c.alert_key
WHERE a.is_active = TRUE
ORDER BY
    COALESCE(a.priority, c.default_priority) ASC,
    a.last_triggered_at DESC
LIMIT 1;
```

### Get Dashboard Stats

```sql
-- Total alerts today
SELECT COUNT(*)
FROM alert_history
WHERE action = 'triggered'
  AND created_at >= CURRENT_DATE;

-- Critical alerts today
SELECT COUNT(*)
FROM alert_history h
JOIN alert_configs c ON h.alert_key = c.alert_key
WHERE h.action = 'triggered'
  AND h.created_at >= CURRENT_DATE
  AND c.default_priority = 1;

-- Active alerts count
SELECT COUNT(*)
FROM alerts
WHERE is_active = TRUE;

-- Auto-cleared today
SELECT COUNT(*)
FROM alert_history
WHERE action = 'cleared'
  AND created_at >= CURRENT_DATE
  AND note ILIKE '%auto%';
```

### Get Active Alerts Sorted

```sql
SELECT
    a.*,
    c.*,
    COALESCE(a.priority, c.default_priority) as effective_priority
FROM alerts a
JOIN alert_configs c ON a.alert_key = c.alert_key
WHERE a.is_active = TRUE
ORDER BY effective_priority ASC, a.last_triggered_at DESC;
```

## Migrations

Migrations are managed with Alembic:

```bash
# Create a new migration
cd backend
alembic revision --autogenerate -m "Description"

# Apply migrations
alembic upgrade head

# Rollback one version
alembic downgrade -1

# View current version
alembic current

# View migration history
alembic history
```

## Backup & Recovery

### PostgreSQL Backup

```bash
# Backup
pg_dump -U lightstack -h localhost lightstack > backup.sql

# Restore
psql -U lightstack -h localhost lightstack < backup.sql
```

### SQLite Backup

```bash
# Backup (just copy the file)
cp lightstack.db lightstack.db.backup

# Restore
cp lightstack.db.backup lightstack.db
```

## Performance Notes

1. **Indexes**: Key columns are indexed for fast lookups
2. **History Growth**: Consider periodic archival of old history records
3. **Connection Pooling**: PostgreSQL uses connection pooling (5 connections, 10 max overflow)
4. **Timestamps**: All timestamps use UTC with timezone info

## See Also

- [Backend Development](../development/backend.md)
- [API Reference](../api/README.md)
- [Configuration Guide](../getting-started/configuration.md)

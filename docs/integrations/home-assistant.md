# Home Assistant Integration

This guide explains how to integrate LightStack with Home Assistant to manage Inovelli light switch notification LEDs.

## Overview

LightStack integrates with Home Assistant in two ways:

1. **HACS Integration (Recommended)** - Native Home Assistant integration with real-time WebSocket updates
2. **REST Integration** - Manual configuration using REST commands and sensors

## HACS Integration (Recommended)

The official LightStack Home Assistant integration provides:

- **Real-time updates** via WebSocket (no polling)
- **Automatic entity creation** (sensors, binary sensors, buttons)
- **Built-in services** for triggering and clearing alerts
- **Full LED effect support** including brightness and duration

### Installation via HACS

1. Open HACS in Home Assistant
2. Click "Integrations"
3. Click the three dots menu → "Custom repositories"
4. Add `https://github.com/sjafferali/lightstack-homeassistant` as an Integration
5. Search for "LightStack" and install
6. Restart Home Assistant
7. Go to Settings → Devices & Services → Add Integration → LightStack
8. Enter your LightStack server host and port

### Entities Created

The integration creates the following entities:

| Entity | Type | Description |
|--------|------|-------------|
| `sensor.lightstack_current_alert` | Sensor | Current highest-priority alert |
| `binary_sensor.lightstack_alert_active` | Binary Sensor | On when any alert is active |
| `button.lightstack_clear_all_alerts` | Button | Clears all active alerts |

### Sensor Attributes

The `sensor.lightstack_current_alert` sensor exposes these attributes:

| Attribute | Type | Description |
|-----------|------|-------------|
| `is_all_clear` | boolean | True if no alerts are active |
| `active_count` | integer | Number of currently active alerts |
| `alert_key` | string | Unique identifier of current alert |
| `effective_priority` | integer | Priority level (1-5) |
| `priority_name` | string | Priority name (Critical, High, etc.) |
| `led_color` | integer | LED color value (0-255) |
| `led_color_name` | string | LED color name (Red, Blue, etc.) |
| `led_effect` | string | LED effect code (pulse, chase, etc.) |
| `led_effect_name` | string | LED effect display name |
| `led_brightness` | integer | LED brightness (0-100) |
| `led_duration` | integer | LED duration value (encoded) |
| `led_duration_name` | string | LED duration (e.g., "5 Minutes") |
| `last_triggered` | datetime | When the alert was triggered |
| `description` | string | Alert description |

### Services

The integration provides these services:

- `lightstack.trigger_alert` - Trigger an alert
- `lightstack.clear_alert` - Clear a specific alert
- `lightstack.clear_all_alerts` - Clear all alerts

---

## REST Integration (Alternative)

If you prefer manual configuration, you can use Home Assistant's REST integrations.

### Prerequisites

- LightStack running and accessible from Home Assistant
- Inovelli Red, Blue, or White series switches with notification LED support
- Home Assistant with REST integration enabled

## Basic Configuration

### Adding LightStack as a REST Command

Add to your `configuration.yaml`:

```yaml
rest_command:
  lightstack_trigger:
    url: "http://lightstack:8080/api/v1/alerts/{{ alert_key }}/trigger"
    method: POST
    headers:
      Content-Type: application/json
    payload: '{"priority": {{ priority | default(3) }}, "note": "{{ note | default("") }}"}'

  lightstack_clear:
    url: "http://lightstack:8080/api/v1/alerts/{{ alert_key }}/clear"
    method: POST
    headers:
      Content-Type: application/json
    payload: '{"note": "{{ note | default("") }}"}'

  lightstack_clear_all:
    url: "http://lightstack:8080/api/v1/alerts/clear-all"
    method: POST
```

### Creating Sensors for LightStack Data

```yaml
rest:
  - resource: "http://lightstack:8080/api/v1/alerts/current"
    scan_interval: 5
    sensor:
      - name: "LightStack Current Alert"
        value_template: "{{ value_json.alert_key | default('none') }}"
        json_attributes:
          - priority
          - led_color
          - led_effect
          - is_active

  - resource: "http://lightstack:8080/api/v1/stats"
    scan_interval: 30
    sensor:
      - name: "LightStack Active Alerts"
        value_template: "{{ value_json.active_count }}"
      - name: "LightStack Alerts Today"
        value_template: "{{ value_json.total_alerts_today }}"
      - name: "LightStack Critical Today"
        value_template: "{{ value_json.critical_today }}"
```

## Automation Examples

### Trigger Alert When Door Left Open

```yaml
automation:
  - alias: "Alert - Garage Door Left Open"
    trigger:
      - platform: state
        entity_id: binary_sensor.garage_door
        to: "on"
        for:
          minutes: 5
    action:
      - service: rest_command.lightstack_trigger
        data:
          alert_key: "garage_door_open"
          priority: 2
          note: "Garage door open for 5+ minutes"

  - alias: "Clear Alert - Garage Door Closed"
    trigger:
      - platform: state
        entity_id: binary_sensor.garage_door
        to: "off"
    action:
      - service: rest_command.lightstack_clear
        data:
          alert_key: "garage_door_open"
          note: "Auto-cleared: door closed"
```

### Washer/Dryer Cycle Complete

```yaml
automation:
  - alias: "Alert - Washer Done"
    trigger:
      - platform: numeric_state
        entity_id: sensor.washer_power
        below: 5
        for:
          minutes: 2
    condition:
      - condition: numeric_state
        entity_id: sensor.washer_power
        above: 0
        for:
          minutes: 30
    action:
      - service: rest_command.lightstack_trigger
        data:
          alert_key: "washer_done"
          priority: 4
          note: "Washer cycle complete"
```

### Critical Security Alert

```yaml
automation:
  - alias: "Alert - Motion While Away"
    trigger:
      - platform: state
        entity_id: binary_sensor.living_room_motion
        to: "on"
    condition:
      - condition: state
        entity_id: alarm_control_panel.home
        state: "armed_away"
    action:
      - service: rest_command.lightstack_trigger
        data:
          alert_key: "security_motion"
          priority: 1
          note: "Motion detected while armed away"
```

## Inovelli LED Integration

The Inovelli Blue Series LED bar has seven LEDs (LED 1 at the bottom, LED 7 at the
top). Each LED holds its own effect in firmware, so several alerts can show at once
on different LEDs. LightStack works out which alert owns which LED and publishes the
result.

### How LightStack decides what to show

1. A whole-bar alert outranks every per-LED alert. If any bar alert is active, it is
   shown and per-LED alerts are hidden. This matches the hardware: a whole-bar effect
   masks the individual LEDs underneath it.
2. Among competing bar alerts, the highest priority one wins.
3. With no bar alert active, every per-LED alert shows at once. Where two alerts claim
   the same LED, the higher priority one wins that LED.
4. Equal priorities are broken alphabetically by alert key, so the display is stable.

Effects are never blended: each LED shows exactly one alert.

### Render plan

`GET /api/v1/alerts/plan` and the `led_plan_changed` WebSocket event both return the
switch's complete display state:

```json
{
  "mode": "individual",
  "is_all_clear": false,
  "bar_alert_key": null,
  "leds": [
    {"led": 7, "alert_key": "doorbell", "effect": "fast_blink", "color": 1, "level": 100, "duration": 255},
    {"led": 1, "alert_key": "laundry",  "effect": "solid",      "color": 170, "level": 60, "duration": 255}
  ],
  "suppressed": [],
  "commands": [
    {"led_effect": {"effect": "clear_effect", "color": 0, "level": 0, "duration": 255}},
    {"individual_led_effect": {"led": "1", "effect": "solid", "color": 170, "level": 60, "duration": 255}},
    {"individual_led_effect": {"led": "7", "effect": "fast_blink", "color": 1, "level": 100, "duration": 255}}
  ]
}
```

- `leds` is what each LED shows, for displaying in a UI.
- `commands` is the payload sequence to publish, in order. It always specifies the bar
  and all seven LEDs, so it can be applied without knowing what the switch showed
  before. There is no bitmask on the hardware: one publish per LED.
- `suppressed` lists alerts that are active but not currently on the switch.

### Update Switch LEDs from the render plan

Publish each command in order. Inovelli spaces its own per-LED commands about 100 ms
apart, which this mirrors:

```yaml
automation:
  - alias: "Update Inovelli LEDs from LightStack"
    trigger:
      - platform: state
        entity_id: sensor.lightstack_led_plan
    action:
      - repeat:
          for_each: "{{ state_attr('sensor.lightstack_led_plan', 'commands') }}"
          sequence:
            - service: mqtt.publish
              data:
                topic: "zigbee2mqtt/Office Switch/set"
                payload: "{{ repeat.item | to_json }}"
            - delay:
                milliseconds: 100
```

### Effects differ by scope

A single LED accepts a smaller set of effects than the whole bar. Zigbee2MQTT discards
an unsupported effect without reporting an error, so LightStack rejects the combination
when the alert is saved.

| Scope | Effects |
|-------|---------|
| Whole bar | off, solid, fast_blink, slow_blink, pulse, chase, open_close, small_to_big, aurora, slow_falling, medium_falling, fast_falling, slow_rising, medium_rising, fast_rising, medium_blink, slow_chase, fast_chase, fast_siren, slow_siren, clear_effect |
| Single LED | off, solid, fast_blink, slow_blink, pulse, chase, falling, rising, aurora, clear_effect |

`falling` and `rising` are per-LED names. The bar's speed variants (`fast_falling`,
`slow_rising`, and so on) and its bar-wide animations (`fast_siren`, `open_close`,
`small_to_big`, `slow_chase`, `fast_chase`, `medium_blink`) have no per-LED equivalent.

### Keeping the switch and LightStack in step

- **Set `duration` to 255 (indefinite) for alerts LightStack clears itself.** A shorter
  duration expires in firmware while LightStack still believes the LED is lit.
- **A per-LED effect is not erased by a whole-bar effect, only hidden.** Clearing the
  bar brings it back. The published commands clear every LED explicitly, so applying a
  plan in full always leaves the switch in the state LightStack intends.
- **Double-tapping the config button clears notifications at the switch.** Re-publish
  the current plan to bring the switch back in step.
- **VZM36 (canopy module) has no LED bar** and cannot show notifications.

### Update Switch LED (REST Integration / Z-Wave)

For Z-Wave switches using the REST integration:

```yaml
automation:
  - alias: "Update Inovelli LED from LightStack"
    trigger:
      - platform: state
        entity_id: sensor.lightstack_current_alert
    action:
      - choose:
          - conditions:
              - condition: state
                entity_id: sensor.lightstack_current_alert
                state: "none"
            sequence:
              - service: zwave_js.set_config_parameter
                target:
                  entity_id: light.living_room_switch
                data:
                  parameter: 16
                  value: 0  # Clear notification
          - conditions:
              - condition: template
                value_template: "{{ states('sensor.lightstack_current_alert') != 'none' }}"
            sequence:
              - service: zwave_js.set_config_parameter
                target:
                  entity_id: light.living_room_switch
                data:
                  parameter: 16
                  value: >
                    {% set color = state_attr('sensor.lightstack_current_alert', 'led_color') | default(0) %}
                    {% set effect = state_attr('sensor.lightstack_current_alert', 'led_effect') | default(1) %}
                    {{ (color * 65536) + (effect * 256) + 255 }}
```

### Inovelli LED Value Calculation (Z-Wave)

The Inovelli Z-Wave notification parameter (16) uses a calculated value:

```
Value = (Color * 65536) + (Effect * 256) + Duration
```

Where:
- **Color**: 0-255 (hue on color wheel)
- **Effect**: 0=Off, 1=Solid, 2=Fast Blink, 3=Slow Blink, 4=Pulse
- **Duration**: 1-254 seconds, 255=indefinitely

### LED Colors

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

### LED Effects (Zigbee/Zigbee2MQTT)

The HACS integration provides these effect names for Zigbee switches:

| Effect | Description |
|--------|-------------|
| `off` | LED off |
| `solid` | Steady light |
| `fast_blink` | Rapid blinking |
| `slow_blink` | Slow blinking |
| `pulse` | Breathing effect |
| `chase` | Running light |
| `aurora` | Color-shifting |
| `slow_falling` | Slow falling |
| `fast_falling` | Fast falling |
| `slow_rising` | Slow rising |
| `fast_rising` | Fast rising |
| `slow_siren` | Slow siren |
| `fast_siren` | Fast siren |

### LED Duration Encoding

LightStack uses encoded duration values:

| Value Range | Unit | Example |
|-------------|------|---------|
| 1-60 | Seconds | 30 = 30 seconds |
| 61-120 | Minutes | 65 = 5 minutes |
| 121-254 | Hours | 132 = 12 hours |
| 255 | Indefinite | Runs until cleared |

### Multiple Switch Updates

To update multiple switches at once:

```yaml
script:
  update_all_inovelli_leds:
    alias: "Update All Inovelli LEDs"
    sequence:
      - service: zwave_js.set_config_parameter
        target:
          entity_id:
            - light.living_room_switch
            - light.kitchen_switch
            - light.bedroom_switch
        data:
          parameter: 16
          value: "{{ led_value }}"
```

## Advanced Configurations

### Priority-Based LED Colors

Configure your alert keys with appropriate LED colors in LightStack:

| Alert Type | Priority | LED Color | LED Effect |
|------------|----------|-----------|------------|
| Security alerts | P1 | 0 (Red) | 2 (Fast blink) |
| Door/window open | P2 | 21 (Orange) | 3 (Slow blink) |
| Appliance done | P3 | 42 (Yellow) | 4 (Pulse) |
| Reminders | P4 | 85 (Green) | 1 (Solid) |
| Information | P5 | 127 (Cyan) | 1 (Solid) |

### Using Input Helpers for Manual Control

Create input helpers to manually trigger alerts from the UI:

```yaml
input_button:
  trigger_test_alert:
    name: "Trigger Test Alert"
    icon: mdi:bell

automation:
  - alias: "Manual Test Alert Trigger"
    trigger:
      - platform: state
        entity_id: input_button.trigger_test_alert
    action:
      - service: rest_command.lightstack_trigger
        data:
          alert_key: "test_alert"
          priority: 3
          note: "Manually triggered from HA"
```

### Dashboard Card

Create a Lovelace card to display LightStack status:

```yaml
type: entities
title: LightStack Status
entities:
  - entity: sensor.lightstack_current_alert
    name: Current Alert
  - entity: sensor.lightstack_active_alerts
    name: Active Alerts
  - entity: sensor.lightstack_alerts_today
    name: Alerts Today
  - entity: sensor.lightstack_critical_today
    name: Critical Today
```

## Troubleshooting

### Alert Not Triggering

1. Check LightStack is accessible:
   ```bash
   curl http://lightstack:8080/api/v1/health
   ```

2. Test the REST command manually:
   ```yaml
   # Developer Tools > Services
   service: rest_command.lightstack_trigger
   data:
     alert_key: "test"
     priority: 3
   ```

3. Check Home Assistant logs for REST command errors

### LED Not Updating

1. Verify the sensor is receiving data:
   ```yaml
   # Check sensor state
   {{ states('sensor.lightstack_current_alert') }}
   {{ state_attr('sensor.lightstack_current_alert', 'led_color') }}
   ```

2. Test LED notification directly:
   ```yaml
   service: zwave_js.set_config_parameter
   target:
     entity_id: light.your_switch
   data:
     parameter: 16
     value: 16711935  # Red, solid, indefinite
   ```

3. Check Z-Wave network connectivity

### Stale Data

If sensor data seems stale:

1. Reduce `scan_interval` for more frequent updates
2. Check network connectivity between Home Assistant and LightStack
3. Verify LightStack container is running properly

## Best Practices

1. **Use meaningful alert keys**: `garage_door_open` is better than `alert1`
2. **Set appropriate priorities**: Reserve P1 for true emergencies
3. **Include notes**: Add context to help debug issues later
4. **Auto-clear when possible**: Use automations to clear alerts when conditions resolve
5. **Test LED colors**: Verify colors look correct on your specific switches
6. **Monitor the dashboard**: Regularly check for stuck alerts

## See Also

- [API Reference](../api/README.md)
- [Configuration Guide](../getting-started/configuration.md)
- [Inovelli Switch Documentation](https://inovelli.com/pages/support)

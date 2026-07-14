"""
LED render plan - compiles the set of active alerts into what the switch shows.

Arbitration rules
-----------------
1. A whole-bar alert outranks every per-LED alert. If any bar alert is active,
   the bar is rendered and all per-LED alerts are suppressed.
2. Among competing bar alerts, the highest priority one wins.
3. With no bar alert active, every per-LED alert renders at once. Where two
   alerts claim the same LED, the highest priority one wins that LED.
4. Equal priorities are broken alphabetically by alert_key, so the plan is a
   pure function of the active set and never flickers between equal claimants.

Effects are never blended: each LED shows exactly one alert.

The plan carries two independent views of the same decision:

- ``leds`` describes what each LED *looks like*, and drives the UI preview.
- ``commands`` is the Zigbee2MQTT payload sequence that *makes it so*.

``commands`` always fully specifies the bar and all seven LEDs, which makes it
idempotent: a consumer can apply it without knowing the previous state. This
matters because a whole-bar effect only masks per-LED effects rather than
erasing them, so per-LED effects are cleared explicitly whenever the bar takes
over. Consumers that want to minimise Zigbee traffic may diff against the last
plan they applied.
"""

from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any

from app.constants.inovelli import (
    ALL_LEDS,
    CLEAR_EFFECT,
    DEFAULT_COLOR,
    DEFAULT_EFFECT,
    DEFAULT_LEVEL,
    DURATION_INDEFINITE,
    LedScope,
    is_valid_effect,
)

if TYPE_CHECKING:
    from app.models import Alert, AlertConfig


@dataclass(frozen=True)
class ActiveAlert:
    """An active alert reduced to just what the renderer needs."""

    alert_key: str
    priority: int
    scope: LedScope
    positions: tuple[int, ...]
    color: int
    effect: str
    level: int
    duration: int

    @property
    def sort_key(self) -> tuple[int, str]:
        """Order by priority (lower number wins), then alphabetically."""
        return (self.priority, self.alert_key)


@dataclass(frozen=True)
class LedSlot:
    """What a single LED displays."""

    led: int
    alert_key: str | None
    effect: str
    color: int
    level: int
    duration: int

    @property
    def is_lit(self) -> bool:
        return self.alert_key is not None


@dataclass
class RenderPlan:
    """The complete display state of one switch."""

    mode: str
    bar_alert_key: str | None = None
    leds: list[LedSlot] = field(default_factory=list)
    suppressed: list[str] = field(default_factory=list)
    commands: list[dict[str, Any]] = field(default_factory=list)

    @property
    def is_all_clear(self) -> bool:
        return self.mode == "idle"


MODE_BAR = "bar"
MODE_INDIVIDUAL = "individual"
MODE_IDLE = "idle"


def _clear_slot(led: int) -> LedSlot:
    return LedSlot(
        led=led,
        alert_key=None,
        effect=CLEAR_EFFECT,
        color=DEFAULT_COLOR,
        level=0,
        duration=DURATION_INDEFINITE,
    )


def _safe_effect(alert: ActiveAlert) -> str:
    """
    Return an effect the target scope actually accepts.

    Zigbee2MQTT silently discards an effect outside the scope's vocabulary, so a
    config that slipped through with a bar-only effect on an individual LED
    renders as a plain solid rather than vanishing.
    """
    if is_valid_effect(alert.effect, alert.scope):
        return alert.effect
    return DEFAULT_EFFECT


def _bar_command(alert: ActiveAlert) -> dict[str, Any]:
    return {
        "led_effect": {
            "effect": _safe_effect(alert),
            "color": alert.color,
            "level": alert.level,
            "duration": alert.duration,
        }
    }


def _bar_clear_command() -> dict[str, Any]:
    return {
        "led_effect": {
            "effect": CLEAR_EFFECT,
            "color": DEFAULT_COLOR,
            "level": 0,
            "duration": DURATION_INDEFINITE,
        }
    }


def _individual_command(slot: LedSlot) -> dict[str, Any]:
    return {
        "individual_led_effect": {
            "led": str(slot.led),
            "effect": slot.effect,
            "color": slot.color,
            "level": slot.level,
            "duration": slot.duration,
        }
    }


def build_plan(active: list[ActiveAlert]) -> RenderPlan:
    """Compile the active alert set into the switch's display state."""
    if not active:
        return _idle_plan()

    bar_alerts = [a for a in active if a.scope is LedScope.BAR]
    if bar_alerts:
        return _bar_plan(winner=min(bar_alerts, key=lambda a: a.sort_key), active=active)

    return _individual_plan(active)


def _idle_plan() -> RenderPlan:
    leds = [_clear_slot(led) for led in ALL_LEDS]
    commands = [_bar_clear_command()] + [_individual_command(slot) for slot in leds]
    return RenderPlan(mode=MODE_IDLE, leds=leds, commands=commands)


def _bar_plan(winner: ActiveAlert, active: list[ActiveAlert]) -> RenderPlan:
    """Render the winning bar alert across the whole strip."""
    effect = _safe_effect(winner)
    leds = [
        LedSlot(
            led=led,
            alert_key=winner.alert_key,
            effect=effect,
            color=winner.color,
            level=winner.level,
            duration=winner.duration,
        )
        for led in ALL_LEDS
    ]

    # Per-LED effects survive underneath a bar effect and would reappear when it
    # clears, so they are torn down before the bar takes over.
    commands = [_individual_command(_clear_slot(led)) for led in ALL_LEDS]
    commands.append(_bar_command(winner))

    suppressed = sorted(a.alert_key for a in active if a.alert_key != winner.alert_key)

    return RenderPlan(
        mode=MODE_BAR,
        bar_alert_key=winner.alert_key,
        leds=leds,
        suppressed=suppressed,
        commands=commands,
    )


def _individual_plan(active: list[ActiveAlert]) -> RenderPlan:
    """Render every per-LED alert at once, resolving each LED independently."""
    leds: list[LedSlot] = []
    winners: set[str] = set()

    for led in ALL_LEDS:
        claimants = [a for a in active if led in a.positions]
        if not claimants:
            leds.append(_clear_slot(led))
            continue

        winner = min(claimants, key=lambda a: a.sort_key)
        winners.add(winner.alert_key)
        leds.append(
            LedSlot(
                led=led,
                alert_key=winner.alert_key,
                effect=_safe_effect(winner),
                color=winner.color,
                level=winner.level,
                duration=winner.duration,
            )
        )

    # A bar effect would mask every LED below it, so it is cleared first.
    commands = [_bar_clear_command()]
    commands.extend(_individual_command(slot) for slot in leds)

    suppressed = sorted(a.alert_key for a in active if a.alert_key not in winners)

    return RenderPlan(
        mode=MODE_INDIVIDUAL,
        leds=leds,
        suppressed=suppressed,
        commands=commands,
    )


def from_config(config: "AlertConfig", priority: int) -> ActiveAlert:
    """
    Reduce an AlertConfig to renderer input at the given effective priority.

    Unset LED settings fall back to a visible default, and an unset duration
    holds the LED indefinitely so that LightStack, rather than a firmware timer,
    decides when the alert stops showing.
    """
    scope = LedScope(config.led_scope or LedScope.BAR.value)
    positions = ALL_LEDS if scope is LedScope.BAR else tuple(sorted(config.led_positions or ()))

    color = config.led_color
    level = config.led_brightness
    duration = config.led_duration

    return ActiveAlert(
        alert_key=config.alert_key,
        priority=priority,
        scope=scope,
        positions=positions,
        color=DEFAULT_COLOR if color is None else color,
        effect=config.led_effect or DEFAULT_EFFECT,
        level=DEFAULT_LEVEL if level is None else level,
        duration=DURATION_INDEFINITE if duration is None else duration,
    )


def to_active_alert(alert: "Alert") -> ActiveAlert:
    """Reduce an active Alert row (with its config loaded) to renderer input."""
    return from_config(alert.config, alert.effective_priority)

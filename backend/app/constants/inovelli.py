"""
Inovelli Blue Series LED capabilities.

The 7-LED notification bar (LED 1 = bottom, LED 7 = top) exposes two independent
notification surfaces through Zigbee2MQTT:

- ``led_effect``            applies an effect to the whole bar.
- ``individual_led_effect`` applies an effect to a single LED.

Each LED holds its own effect in firmware, so effects on different LEDs display
simultaneously. There is no bitmask: targeting N LEDs requires N separate
publishes. A whole-bar effect visually masks the individual LEDs while it runs.

Individual LEDs accept a strict subset of the whole-bar effects, and two members
are named differently (``falling``/``rising``), so the two vocabularies are not
interchangeable. An effect outside the accepted set is silently discarded by
Zigbee2MQTT, which is why scope-aware validation lives here.

Reference: zigbee-herdsman-converters ``src/lib/inovelli.ts``.
"""

from enum import Enum

# LED bar geometry.
LED_MIN = 1
LED_MAX = 7
ALL_LEDS: tuple[int, ...] = (1, 2, 3, 4, 5, 6, 7)


class LedScope(str, Enum):
    """Which notification surface an alert renders on."""

    BAR = "bar"
    INDIVIDUAL = "individual"


# Effects valid for the whole-bar ``led_effect`` command, mapped to firmware codes.
BAR_EFFECTS: dict[str, int] = {
    "off": 0,
    "solid": 1,
    "fast_blink": 2,
    "slow_blink": 3,
    "pulse": 4,
    "chase": 5,
    "open_close": 6,
    "small_to_big": 7,
    "aurora": 8,
    "slow_falling": 9,
    "medium_falling": 10,
    "fast_falling": 11,
    "slow_rising": 12,
    "medium_rising": 13,
    "fast_rising": 14,
    "medium_blink": 15,
    "slow_chase": 16,
    "fast_chase": 17,
    "fast_siren": 18,
    "slow_siren": 19,
    "clear_effect": 255,
}

# Effects valid for the per-LED ``individual_led_effect`` command.
INDIVIDUAL_EFFECTS: dict[str, int] = {
    "off": 0,
    "solid": 1,
    "fast_blink": 2,
    "slow_blink": 3,
    "pulse": 4,
    "chase": 5,
    "falling": 6,
    "rising": 7,
    "aurora": 8,
    "clear_effect": 255,
}

# Sentinel effect that releases an LED back to its normal on/off indication.
CLEAR_EFFECT = "clear_effect"

# Value bounds shared by both commands.
COLOR_MIN, COLOR_MAX = 0, 255
LEVEL_MIN, LEVEL_MAX = 0, 100
DURATION_MIN, DURATION_MAX = 0, 255

# Effects rendered by an alert that LightStack keeps lit until it clears the
# alert itself. Anything shorter expires in firmware while LightStack still
# believes the LED is lit.
DURATION_INDEFINITE = 255

# Fallbacks for configs that leave LED settings unset.
DEFAULT_COLOR = 0
DEFAULT_LEVEL = 100
DEFAULT_EFFECT = "solid"


def effects_for_scope(scope: LedScope | str) -> dict[str, int]:
    """Return the effect vocabulary accepted by the given scope."""
    if LedScope(scope) is LedScope.BAR:
        return BAR_EFFECTS
    return INDIVIDUAL_EFFECTS


def is_valid_effect(effect: str, scope: LedScope | str) -> bool:
    """Report whether an effect name is accepted by the given scope."""
    return effect in effects_for_scope(scope)


def validate_positions(positions: list[int]) -> list[int]:
    """
    Normalize LED positions to a sorted, de-duplicated list within 1-7.

    Raises ValueError if the list is empty or contains an out-of-range LED.
    """
    if not positions:
        raise ValueError("At least one LED position is required")

    out_of_range = sorted({p for p in positions if p < LED_MIN or p > LED_MAX})
    if out_of_range:
        raise ValueError(
            f"LED positions must be between {LED_MIN} and {LED_MAX}; got {out_of_range}"
        )

    return sorted(set(positions))

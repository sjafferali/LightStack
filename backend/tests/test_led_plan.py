"""Tests for the LED render plan arbitration rules."""

import pytest
from app.constants.inovelli import ALL_LEDS, CLEAR_EFFECT, LedScope
from app.services.led_plan import (
    MODE_BAR,
    MODE_IDLE,
    MODE_INDIVIDUAL,
    ActiveAlert,
    build_plan,
)


def make_alert(
    key: str,
    priority: int = 3,
    scope: LedScope = LedScope.INDIVIDUAL,
    positions: tuple[int, ...] = (1,),
    color: int = 170,
    effect: str = "solid",
    level: int = 100,
    duration: int = 255,
) -> ActiveAlert:
    return ActiveAlert(
        alert_key=key,
        priority=priority,
        scope=scope,
        positions=ALL_LEDS if scope is LedScope.BAR else positions,
        color=color,
        effect=effect,
        level=level,
        duration=duration,
    )


def slot_owners(plan) -> dict[int, str | None]:
    return {slot.led: slot.alert_key for slot in plan.leds}


# =============================================================================
# Idle
# =============================================================================


def test_no_active_alerts_is_idle_and_clears_everything():
    plan = build_plan([])

    assert plan.mode == MODE_IDLE
    assert plan.is_all_clear
    assert all(not slot.is_lit for slot in plan.leds)

    # The bar and every LED are cleared, so the switch cannot retain a stale effect.
    assert plan.commands[0] == {
        "led_effect": {
            "effect": CLEAR_EFFECT,
            "color": 0,
            "level": 0,
            "duration": 255,
        }
    }
    cleared = [c["individual_led_effect"]["led"] for c in plan.commands[1:]]
    assert cleared == ["1", "2", "3", "4", "5", "6", "7"]


# =============================================================================
# Rule 1: a bar alert outranks every per-LED alert
# =============================================================================


def test_bar_alert_beats_individual_alert_regardless_of_priority():
    # The individual alert is P1, the bar alert only P5.
    individual = make_alert("doorbell", priority=1, positions=(7,))
    bar = make_alert("security", priority=5, scope=LedScope.BAR, effect="fast_siren")

    plan = build_plan([individual, bar])

    assert plan.mode == MODE_BAR
    assert plan.bar_alert_key == "security"
    assert set(slot_owners(plan).values()) == {"security"}
    assert plan.suppressed == ["doorbell"]


def test_bar_mode_clears_individual_leds_before_applying_the_bar():
    # A bar effect masks per-LED effects rather than erasing them, so they would
    # reappear when it clears unless torn down first.
    plan = build_plan(
        [
            make_alert("doorbell", priority=1, positions=(7,)),
            make_alert("security", priority=2, scope=LedScope.BAR),
        ]
    )

    individual_cmds = plan.commands[:-1]
    assert len(individual_cmds) == 7
    assert all(c["individual_led_effect"]["effect"] == CLEAR_EFFECT for c in individual_cmds)

    # The bar command lands last so nothing overwrites it.
    assert plan.commands[-1]["led_effect"]["effect"] == "solid"


# =============================================================================
# Rule 2: highest priority bar alert wins the bar
# =============================================================================


def test_highest_priority_bar_alert_wins():
    plan = build_plan(
        [
            make_alert("info", priority=4, scope=LedScope.BAR, color=85),
            make_alert("critical", priority=1, scope=LedScope.BAR, color=1),
            make_alert("warning", priority=2, scope=LedScope.BAR, color=42),
        ]
    )

    assert plan.bar_alert_key == "critical"
    assert plan.commands[-1]["led_effect"]["color"] == 1
    assert plan.suppressed == ["info", "warning"]


# =============================================================================
# Rule 3: per-LED alerts all render at once; per-LED priority resolution
# =============================================================================


def test_multiple_individual_alerts_render_simultaneously():
    plan = build_plan(
        [
            make_alert("laundry", priority=4, positions=(1,), color=170),
            make_alert("doorbell", priority=2, positions=(7,), color=1),
        ]
    )

    assert plan.mode == MODE_INDIVIDUAL
    owners = slot_owners(plan)
    assert owners[1] == "laundry"
    assert owners[7] == "doorbell"
    assert owners[4] is None
    assert plan.suppressed == []


def test_single_alert_can_claim_multiple_leds():
    plan = build_plan([make_alert("laundry", positions=(1, 2, 3))])

    owners = slot_owners(plan)
    assert [owners[i] for i in (1, 2, 3)] == ["laundry"] * 3
    assert owners[4] is None


def test_higher_priority_alert_wins_a_contested_led():
    # Both claim LED 3; doorbell (P1) outranks laundry (P4) there, but laundry
    # keeps the LEDs doorbell does not claim.
    plan = build_plan(
        [
            make_alert("laundry", priority=4, positions=(1, 2, 3), color=170),
            make_alert("doorbell", priority=1, positions=(3,), color=1),
        ]
    )

    owners = slot_owners(plan)
    assert owners[1] == "laundry"
    assert owners[2] == "laundry"
    assert owners[3] == "doorbell"

    # Never blended: the contested LED shows exactly one alert's colour.
    led3 = next(s for s in plan.leds if s.led == 3)
    assert led3.color == 1


def test_fully_overlapped_alert_is_reported_as_suppressed():
    plan = build_plan(
        [
            make_alert("quiet", priority=4, positions=(5,)),
            make_alert("loud", priority=1, positions=(5,)),
        ]
    )

    assert slot_owners(plan)[5] == "loud"
    assert plan.suppressed == ["quiet"]


def test_individual_mode_clears_the_bar_first():
    plan = build_plan([make_alert("laundry", positions=(1,))])

    # A leftover bar effect would mask every LED underneath it.
    assert plan.commands[0]["led_effect"]["effect"] == CLEAR_EFFECT
    assert len(plan.commands) == 8


def test_unclaimed_leds_are_explicitly_cleared():
    plan = build_plan([make_alert("laundry", positions=(1,))])

    cmds = {
        c["individual_led_effect"]["led"]: c["individual_led_effect"] for c in plan.commands[1:]
    }
    assert cmds["1"]["effect"] == "solid"
    for led in ("2", "3", "4", "5", "6", "7"):
        assert cmds[led]["effect"] == CLEAR_EFFECT


# =============================================================================
# Rule 4: alphabetical tie-break
# =============================================================================


def test_equal_priority_individual_alerts_break_alphabetically():
    plan = build_plan(
        [
            make_alert("zebra", priority=3, positions=(4,)),
            make_alert("alpha", priority=3, positions=(4,)),
        ]
    )

    assert slot_owners(plan)[4] == "alpha"
    assert plan.suppressed == ["zebra"]


def test_equal_priority_bar_alerts_break_alphabetically():
    plan = build_plan(
        [
            make_alert("zebra", priority=2, scope=LedScope.BAR),
            make_alert("alpha", priority=2, scope=LedScope.BAR),
        ]
    )

    assert plan.bar_alert_key == "alpha"


def test_tie_break_is_stable_regardless_of_input_order():
    a = make_alert("alpha", priority=3, positions=(4,))
    z = make_alert("zebra", priority=3, positions=(4,))

    assert slot_owners(build_plan([a, z]))[4] == slot_owners(build_plan([z, a]))[4] == "alpha"


# =============================================================================
# Effect vocabulary safety
# =============================================================================


def test_bar_only_effect_on_an_individual_led_falls_back_to_solid():
    # Zigbee2MQTT discards an unsupported effect without error, which would
    # leave the LED dark; a solid fallback keeps the alert visible.
    plan = build_plan([make_alert("siren", positions=(2,), effect="fast_siren")])

    led2 = next(s for s in plan.leds if s.led == 2)
    assert led2.effect == "solid"


def test_bar_scope_keeps_its_richer_effects():
    plan = build_plan([make_alert("siren", scope=LedScope.BAR, effect="fast_siren")])

    assert plan.commands[-1]["led_effect"]["effect"] == "fast_siren"


@pytest.mark.parametrize("effect", ["falling", "rising", "chase", "aurora", "pulse"])
def test_individual_effects_are_preserved(effect: str):
    plan = build_plan([make_alert("a", positions=(1,), effect=effect)])

    assert next(s for s in plan.leds if s.led == 1).effect == effect


# =============================================================================
# Command payload shape
# =============================================================================


def test_individual_command_payload_matches_zigbee2mqtt_schema():
    plan = build_plan(
        [
            make_alert(
                "doorbell", positions=(7,), color=1, effect="fast_blink", level=80, duration=255
            )
        ]
    )

    cmd = next(
        c["individual_led_effect"]
        for c in plan.commands[1:]
        if c["individual_led_effect"]["led"] == "7"
    )
    assert cmd == {
        "led": "7",
        "effect": "fast_blink",
        "color": 1,
        "level": 80,
        "duration": 255,
    }

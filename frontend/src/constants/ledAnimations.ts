/**
 * Visual model of the Inovelli 7-LED notification bar.
 *
 * Effects are described as loops of per-LED intensity (0-1). Whole-bar effects
 * animate all seven LEDs together as a travelling pattern, so each frame is a
 * 7-wide row. Per-LED effects animate one LED on its own, so each frame is a
 * single intensity.
 *
 * Frame data is adapted from Inovelli's switch toolbox. It approximates what the
 * firmware renders rather than reproducing it exactly, which is enough to tell
 * two effects apart when choosing one.
 */

import type { LedSlot } from '../types/alert'

export const LED_COUNT = 7

/** LED positions, top of the bar first, matching how the switch is read. */
export const LEDS_TOP_DOWN = [7, 6, 5, 4, 3, 2, 1] as const

export interface Animation {
  /** Frames to loop through. */
  frames: number[][]
  /** Milliseconds each frame is held. */
  frameMs: number
}

const solid = (): number[] => Array(LED_COUNT).fill(1)
const dark = (): number[] => Array(LED_COUNT).fill(0)

/**
 * Whole-bar effects: patterns that travel across all seven LEDs.
 * Index 0 of each row is LED 1 (bottom of the bar).
 */
export const BAR_ANIMATIONS: Record<string, Animation> = {
  off: { frames: [dark()], frameMs: 1000 },
  clear_effect: { frames: [dark()], frameMs: 1000 },
  solid: { frames: [solid()], frameMs: 1000 },

  fast_blink: { frames: [solid(), dark()], frameMs: 180 },
  medium_blink: { frames: [solid(), dark()], frameMs: 400 },
  slow_blink: { frames: [solid(), dark()], frameMs: 800 },

  pulse: {
    frames: [
      [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1],
      [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
      [1, 1, 1, 1, 1, 1, 1],
      [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
    ],
    frameMs: 260,
  },

  chase: {
    frames: [
      [0, 0, 0.5, 1, 0.5, 0, 0],
      [0, 0.5, 1, 0.5, 0, 0, 0],
      [0.5, 1, 0.5, 0, 0, 0, 0],
      [0, 0.5, 1, 0.5, 0, 0, 0],
      [0, 0, 0.5, 1, 0.5, 0, 0],
      [0, 0, 0, 0.5, 1, 0.5, 0],
      [0, 0, 0, 0, 0.5, 1, 0.5],
      [0, 0, 0, 0.5, 1, 0.5, 0],
    ],
    frameMs: 120,
  },
  open_close: {
    frames: [
      [0, 0, 0, 1, 0, 0, 0],
      [0, 0, 1, 0, 1, 0, 0],
      [0, 1, 0, 0, 0, 1, 0],
      [1, 0, 0, 0, 0, 0, 1],
      [0, 1, 0, 0, 0, 1, 0],
      [0, 0, 1, 0, 1, 0, 0],
      [0, 0, 0, 1, 0, 0, 0],
    ],
    frameMs: 150,
  },

  small_to_big: {
    frames: [
      [0, 0, 0, 1, 0, 0, 0],
      [0, 0, 1, 1, 1, 0, 0],
      [0, 1, 1, 1, 1, 1, 0],
      [1, 1, 1, 1, 1, 1, 1],
      [0, 1, 1, 1, 1, 1, 0],
      [0, 0, 1, 1, 1, 0, 0],
      [0, 0, 0, 1, 0, 0, 0],
    ],
    frameMs: 150,
  },

  aurora: {
    frames: [
      [0, 0.25, 0.25, 0.5, 1, 0.5, 0.25],
      [0.25, 0, 0.25, 0.25, 0.5, 1, 0.5],
      [0.25, 0.25, 0, 0.25, 0.25, 0.5, 1],
      [0.5, 0.25, 0.25, 0, 0.25, 0.25, 0.5],
      [1, 0.5, 0.25, 0.25, 0, 0.25, 0.25],
      [0.5, 1, 0.5, 0.25, 0.25, 0, 0.25],
      [0.25, 0.5, 1, 0.5, 0.25, 0.25, 0],
      [0.25, 0.25, 0.5, 1, 0.5, 0.25, 0.25],
    ],
    frameMs: 200,
  },

  falling: {
    frames: [
      [0, 0, 0, 0, 0, 0, 1],
      [0, 0, 0, 0, 0, 1, 0],
      [0, 0, 0, 0, 1, 0, 0],
      [0, 0, 0, 1, 0, 0, 0],
      [0, 0, 1, 0, 0, 0, 0],
      [0, 1, 0, 0, 0, 0, 0],
      [1, 0, 0, 0, 0, 0, 0],
    ],
    frameMs: 110,
  },
  rising: {
    frames: [
      [1, 0, 0, 0, 0, 0, 0],
      [0, 1, 0, 0, 0, 0, 0],
      [0, 0, 1, 0, 0, 0, 0],
      [0, 0, 0, 1, 0, 0, 0],
      [0, 0, 0, 0, 1, 0, 0],
      [0, 0, 0, 0, 0, 1, 0],
      [0, 0, 0, 0, 0, 0, 1],
    ],
    frameMs: 110,
  },

  siren: {
    frames: [
      [1, 1, 1, 1, 1, 1, 1],
      [0, 1, 1, 1, 1, 1, 0],
    ],
    frameMs: 120,
  },
}

// Effects that share a pattern and differ only in speed.
const SPEED_VARIANTS: Record<string, { base: string; frameMs: number }> = {
  fast_chase: { base: 'chase', frameMs: 70 },
  slow_chase: { base: 'chase', frameMs: 220 },
  fast_falling: { base: 'falling', frameMs: 70 },
  medium_falling: { base: 'falling', frameMs: 130 },
  slow_falling: { base: 'falling', frameMs: 240 },
  fast_rising: { base: 'rising', frameMs: 70 },
  medium_rising: { base: 'rising', frameMs: 130 },
  slow_rising: { base: 'rising', frameMs: 240 },
  fast_siren: { base: 'siren', frameMs: 90 },
  slow_siren: { base: 'siren', frameMs: 260 },
}

for (const [name, { base, frameMs }] of Object.entries(SPEED_VARIANTS)) {
  BAR_ANIMATIONS[name] = { frames: BAR_ANIMATIONS[base].frames, frameMs }
}

/**
 * Per-LED effects: intensity of a single LED over time.
 *
 * Each LED runs its own firmware timer, so LEDs animating the same effect are
 * not in step with one another. The preview mirrors that by giving each LED an
 * independent phase.
 */
export const LED_ANIMATIONS: Record<string, { frames: number[]; frameMs: number }> = {
  off: { frames: [0], frameMs: 1000 },
  clear_effect: { frames: [0], frameMs: 1000 },
  solid: { frames: [1], frameMs: 1000 },
  fast_blink: { frames: [1, 0], frameMs: 180 },
  slow_blink: { frames: [1, 0], frameMs: 800 },
  pulse: { frames: [0.15, 0.5, 0.85, 1, 0.85, 0.5], frameMs: 150 },
  chase: { frames: [0.2, 0.6, 1, 0.6], frameMs: 150 },
  falling: { frames: [1, 0.7, 0.4, 0.1], frameMs: 150 },
  rising: { frames: [0.1, 0.4, 0.7, 1], frameMs: 150 },
  aurora: { frames: [0.35, 0.6, 0.9, 1, 0.7, 0.45], frameMs: 220 },
}

/**
 * Convert an Inovelli colour value to CSS.
 *
 * The scale is a hue circle (value / 255 * 360). 255 is the exception: it is
 * white rather than a hue.
 *
 * `intensity` dims the colour towards black rather than towards transparent, so
 * a half-lit LED reads as a darker LED instead of letting the switch behind it
 * show through.
 */
export function inovelliColorToCss(color: number, intensity = 1): string {
  const lightness = Math.max(0, Math.min(1, intensity))
  if (color >= 255) return `hsl(0, 0%, ${100 * lightness}%)`
  const hue = Math.round((color / 255) * 360)
  return `hsl(${hue}, 100%, ${55 * lightness}%)`
}

export function barAnimation(effect: string | null | undefined): Animation {
  return BAR_ANIMATIONS[effect ?? ''] ?? BAR_ANIMATIONS.solid
}

/** Build the seven LED slots a single alert would light, for previewing one config. */
export function slotsForAlert(params: {
  scope: 'bar' | 'individual'
  positions: number[]
  color: number
  effect: string
  level: number
  alertKey?: string
}): LedSlot[] {
  const { scope, positions, color, effect, level, alertKey = 'preview' } = params
  const claimed = scope === 'bar' ? [1, 2, 3, 4, 5, 6, 7] : positions

  return [1, 2, 3, 4, 5, 6, 7].map((led) => ({
    led,
    alert_key: claimed.includes(led) ? alertKey : null,
    effect: claimed.includes(led) ? effect : 'clear_effect',
    color,
    level,
    duration: 255,
  }))
}

export function ledAnimation(effect: string | null | undefined) {
  return LED_ANIMATIONS[effect ?? ''] ?? LED_ANIMATIONS.solid
}

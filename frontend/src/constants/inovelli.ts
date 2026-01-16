/**
 * Inovelli LED effect constants based on zigbee-herdsman-converters and Inovelli documentation
 * https://help.inovelli.com/en/articles/8746103-animated-notification-examples
 */

// LED Color options with display name and numeric value
// Values are hue-based (0-255) where 255 is special for white
export const LED_COLORS = [
  { label: 'Off', value: 0, hex: '#000000' },
  { label: 'Red', value: 1, hex: '#ff0000' },
  { label: 'Orange', value: 21, hex: '#ff8000' },
  { label: 'Yellow', value: 42, hex: '#ffff00' },
  { label: 'Green', value: 85, hex: '#00ff00' },
  { label: 'Cyan', value: 127, hex: '#00ffff' },
  { label: 'Teal', value: 145, hex: '#00bfbf' },
  { label: 'Blue', value: 170, hex: '#0000ff' },
  { label: 'Purple', value: 195, hex: '#8000ff' },
  { label: 'Light Pink', value: 220, hex: '#ff80ff' },
  { label: 'Pink', value: 234, hex: '#ff0080' },
  { label: 'White', value: 255, hex: '#ffffff' },
] as const

// LED Effect options with display name and effect code
export const LED_EFFECTS = [
  { label: 'Off', value: 'off', code: 0 },
  { label: 'Solid', value: 'solid', code: 1 },
  { label: 'Fast Blink', value: 'fast_blink', code: 2 },
  { label: 'Slow Blink', value: 'slow_blink', code: 3 },
  { label: 'Pulse', value: 'pulse', code: 4 },
  { label: 'Chase', value: 'chase', code: 5 },
  { label: 'Open/Close', value: 'open_close', code: 6 },
  { label: 'Small to Big', value: 'small_to_big', code: 7 },
  { label: 'Aurora', value: 'aurora', code: 8 },
  { label: 'Slow Falling', value: 'slow_falling', code: 9 },
  { label: 'Medium Falling', value: 'medium_falling', code: 10 },
  { label: 'Fast Falling', value: 'fast_falling', code: 11 },
  { label: 'Slow Rising', value: 'slow_rising', code: 12 },
  { label: 'Medium Rising', value: 'medium_rising', code: 13 },
  { label: 'Fast Rising', value: 'fast_rising', code: 14 },
  { label: 'Medium Blink', value: 'medium_blink', code: 15 },
  { label: 'Slow Chase', value: 'slow_chase', code: 16 },
  { label: 'Fast Chase', value: 'fast_chase', code: 17 },
  { label: 'Fast Siren', value: 'fast_siren', code: 18 },
  { label: 'Slow Siren', value: 'slow_siren', code: 19 },
  { label: 'Clear Effect', value: 'clear_effect', code: 255 },
] as const

// LED Duration options
// Duration encoding:
// - 1-60: seconds (direct value)
// - 61-120: minutes (value - 60)
// - 121-254: hours (value - 120)
// - 255: indefinite
export const LED_DURATIONS = [
  { label: '1 Second', value: 1 },
  { label: '2 Seconds', value: 2 },
  { label: '3 Seconds', value: 3 },
  { label: '4 Seconds', value: 4 },
  { label: '5 Seconds', value: 5 },
  { label: '10 Seconds', value: 10 },
  { label: '15 Seconds', value: 15 },
  { label: '20 Seconds', value: 20 },
  { label: '25 Seconds', value: 25 },
  { label: '30 Seconds', value: 30 },
  { label: '45 Seconds', value: 45 },
  { label: '1 Minute', value: 61 },
  { label: '2 Minutes', value: 62 },
  { label: '3 Minutes', value: 63 },
  { label: '4 Minutes', value: 64 },
  { label: '5 Minutes', value: 65 },
  { label: '10 Minutes', value: 70 },
  { label: '15 Minutes', value: 75 },
  { label: '20 Minutes', value: 80 },
  { label: '30 Minutes', value: 90 },
  { label: '45 Minutes', value: 105 },
  { label: '1 Hour', value: 121 },
  { label: '2 Hours', value: 122 },
  { label: '3 Hours', value: 123 },
  { label: '4 Hours', value: 124 },
  { label: '6 Hours', value: 126 },
  { label: '8 Hours', value: 128 },
  { label: '10 Hours', value: 130 },
  { label: '12 Hours', value: 132 },
  { label: '24 Hours', value: 144 },
  { label: 'Indefinitely', value: 255 },
] as const

// Helper function to get color by value
export function getColorByValue(value: number | null | undefined) {
  if (value === null || value === undefined) return null
  return LED_COLORS.find((c) => c.value === value) || null
}

// Helper function to get effect by value (string)
export function getEffectByValue(value: string | null | undefined) {
  if (!value) return null
  return LED_EFFECTS.find((e) => e.value === value) || null
}

// Helper function to get duration by value
export function getDurationByValue(value: number | null | undefined) {
  if (value === null || value === undefined) return null
  return LED_DURATIONS.find((d) => d.value === value) || null
}

// Helper function to format duration for display
export function formatDuration(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'Not set'
  const duration = getDurationByValue(value)
  if (duration) return duration.label

  // Handle custom values
  if (value === 0) return 'Disabled'
  if (value <= 60) return `${value} Second${value !== 1 ? 's' : ''}`
  if (value <= 120) return `${value - 60} Minute${value - 60 !== 1 ? 's' : ''}`
  if (value <= 254) return `${value - 120} Hour${value - 120 !== 1 ? 's' : ''}`
  return 'Indefinitely'
}

// Type exports for TypeScript
export type LedColor = (typeof LED_COLORS)[number]
export type LedEffect = (typeof LED_EFFECTS)[number]
export type LedDuration = (typeof LED_DURATIONS)[number]

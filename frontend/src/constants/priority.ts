/**
 * Priority colours live in the theme (--p1 … --p5), so they adapt to light and
 * dark rather than being fixed hex values.
 */

export const PRIORITY_LABELS: Record<number, string> = {
  1: 'Critical',
  2: 'High',
  3: 'Medium',
  4: 'Low',
  5: 'Info',
}

export const PRIORITIES = [1, 2, 3, 4, 5] as const

function clamp(priority: number): number {
  return priority >= 1 && priority <= 5 ? priority : 3
}

export function priorityLabel(priority: number): string {
  return PRIORITY_LABELS[clamp(priority)]
}

/** The priority's colour, as a CSS value. */
export function priorityColor(priority: number): string {
  return `var(--p${clamp(priority)})`
}

/** A translucent wash of the priority's colour, for badge and row backgrounds. */
export function priorityTint(priority: number, percent = 14): string {
  return `color-mix(in srgb, var(--p${clamp(priority)}) ${percent}%, transparent)`
}

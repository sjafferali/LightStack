import clsx from 'clsx'
import { LEDS_TOP_DOWN, inovelliColorToCss } from '../constants/ledAnimations'

interface LedPickerProps {
  selected: number[]
  onChange: (positions: number[]) => void
  /** Colour the alert will light its LEDs with, so the choice previews itself. */
  color: number
  disabled?: boolean
}

const GROUPS: { label: string; leds: number[] }[] = [
  { label: 'All', leds: [1, 2, 3, 4, 5, 6, 7] },
  { label: 'Top half', leds: [5, 6, 7] },
  { label: 'Bottom half', leds: [1, 2, 3] },
  { label: 'Middle', leds: [4] },
]

/**
 * Choose which LEDs an alert lights.
 *
 * Laid out vertically to match the switch on the wall: LED 7 at the top,
 * LED 1 at the bottom.
 */
export function LedPicker({ selected, onChange, color, disabled }: LedPickerProps) {
  const toggle = (led: number) => {
    if (disabled) return
    onChange(
      selected.includes(led)
        ? selected.filter((l) => l !== led)
        : [...selected, led].sort((a, b) => a - b),
    )
  }

  const applyGroup = (leds: number[]) => {
    if (disabled) return
    const same = leds.length === selected.length && leds.every((l) => selected.includes(l))
    onChange(same ? [] : leds)
  }

  const css = inovelliColorToCss(color)

  return (
    <div className="flex gap-4">
      <div className="flex flex-col gap-1">
        {LEDS_TOP_DOWN.map((led) => {
          const on = selected.includes(led)
          return (
            <button
              key={led}
              type="button"
              onClick={() => toggle(led)}
              disabled={disabled}
              aria-pressed={on}
              aria-label={`LED ${led}`}
              className={clsx(
                'group flex h-8 w-28 items-center gap-2 rounded-lg border px-2 text-left transition-colors',
                disabled && 'cursor-not-allowed opacity-40',
                on ? 'border-accent bg-panel2' : 'border-line bg-panel2 hover:border-line2',
              )}
            >
              <span
                className="h-4 w-1.5 shrink-0 rounded-full transition-all"
                style={{
                  backgroundColor: on ? css : 'var(--line2)',
                  boxShadow: on ? `0 0 8px 1px ${css}` : undefined,
                }}
              />
              <span
                className={clsx(
                  'font-mono text-xs font-semibold tabular-nums',
                  on ? 'text-tx' : 'text-tx2',
                )}
              >
                LED {led}
              </span>
              {led === 7 && <span className="ml-auto text-[10px] text-tx3">top</span>}
              {led === 1 && <span className="ml-auto text-[10px] text-tx3">bottom</span>}
            </button>
          )
        })}
      </div>

      <div className="flex flex-col gap-1.5">
        {GROUPS.map((g) => (
          <button
            key={g.label}
            type="button"
            onClick={() => applyGroup(g.leds)}
            disabled={disabled}
            className={clsx(
              'rounded-lg border border-line bg-panel2 px-2.5 py-1 text-xs font-semibold text-tx2 transition-colors',
              'hover:border-line2 hover:text-tx',
              disabled && 'cursor-not-allowed opacity-40',
            )}
          >
            {g.label}
          </button>
        ))}
      </div>
    </div>
  )
}

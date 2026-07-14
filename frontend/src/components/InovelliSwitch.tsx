import clsx from 'clsx'
import switchImage from '../assets/inovelli-switch.webp'
import { inovelliColorToCss } from '../constants/ledAnimations'
import { useLedIntensities, type LedMode } from '../hooks/useLedIntensities'
import type { LedSlot } from '../types/alert'

// Where the light pipe sits on the switch photo, as a fraction of the image.
const PIPE = {
  left: '66.9%',
  width: '5.1%',
  top: '35.8%',
  height: '40.7%',
}

const WIDTHS = {
  sm: 'w-[128px]',
  md: 'w-[168px]',
  lg: 'w-[210px]',
}

interface InovelliSwitchProps {
  mode: LedMode
  leds: LedSlot[]
  size?: keyof typeof WIDTHS
  className?: string
}

/**
 * The switch as it looks on the wall, with the notification LEDs lit.
 *
 * LED 1 is at the bottom of the light pipe and LED 7 at the top. Lit LEDs spill
 * light onto the plastic around them, the way the real diffuser does, so a
 * fine-grained pattern reads here about as clearly as it will in the hallway.
 */
export function InovelliSwitch({ mode, leds, size = 'md', className }: InovelliSwitchProps) {
  const lit = useLedIntensities(mode, leds)

  return (
    <div className={clsx('relative select-none', WIDTHS[size], className)}>
      <img
        src={switchImage}
        alt="Inovelli switch"
        className="block w-full rounded-lg"
        draggable={false}
      />

      <div className="absolute flex flex-col-reverse" style={PIPE}>
        {lit.map(({ led, color, css, alpha }) => (
          <div
            key={led}
            className="flex-1"
            style={
              alpha > 0.02
                ? {
                    // Opaque, dimmed towards black: an LED at half brightness is
                    // a darker LED, not a see-through one.
                    backgroundColor: inovelliColorToCss(color, Math.max(alpha, 0.18)),
                    boxShadow: `0 0 ${3 + alpha * 6}px ${alpha * 2.5}px ${css}`,
                  }
                : undefined
            }
          />
        ))}
      </div>
    </div>
  )
}

interface LedLegendProps {
  leds: LedSlot[]
  mode: LedMode
  className?: string
}

/**
 * Which alert owns which LEDs, so a colour on the switch can be traced back to
 * the alert that put it there.
 */
export function LedLegend({ leds, mode, className }: LedLegendProps) {
  const owners = new Map<string, number[]>()
  for (const slot of leds) {
    if (!slot.alert_key) continue
    owners.set(slot.alert_key, [...(owners.get(slot.alert_key) ?? []), slot.led])
  }

  if (owners.size === 0) {
    return (
      <p className={clsx('m-0 text-[12px] text-[#636366]', className)}>
        No alerts showing. The LEDs are off.
      </p>
    )
  }

  const entries = [...owners.entries()].sort((a, b) => Math.max(...b[1]) - Math.max(...a[1]))

  return (
    <ul className={clsx('m-0 flex list-none flex-col gap-2 p-0', className)}>
      {entries.map(([alertKey, ledNumbers]) => {
        const slot = leds.find((l) => l.alert_key === alertKey)!
        const sorted = [...ledNumbers].sort((a, b) => a - b)
        const where =
          mode === 'bar'
            ? 'Whole bar'
            : sorted.length === 1
              ? `LED ${sorted[0]}`
              : `LEDs ${sorted.join(', ')}`

        return (
          <li key={alertKey} className="flex items-center gap-2.5">
            <span
              className="h-6 w-1 shrink-0 rounded-full"
              style={{
                backgroundColor: `hsl(${Math.round((slot.color / 255) * 360)}, 100%, 55%)`,
              }}
            />
            <span className="min-w-0">
              <span className="block truncate font-mono text-[12px] leading-tight text-white">
                {alertKey}
              </span>
              <span className="block truncate text-[11px] leading-tight text-[#8e8e93]">
                {where} · {slot.effect.replace(/_/g, ' ')}
              </span>
            </span>
          </li>
        )
      })}
    </ul>
  )
}

import { useEffect, useMemo, useRef, useState } from 'react'
import { barAnimation, inovelliColorToCss, ledAnimation } from '../constants/ledAnimations'
import type { LedSlot } from '../types/alert'

export type LedMode = 'bar' | 'individual' | 'idle'

export interface LitLed {
  led: number
  alertKey: string | null
  /** Inovelli colour value, 0-255. */
  color: number
  /** The colour at full brightness, for the light it casts around it. */
  css: string
  /** How brightly it is shining right now, 0-1, effect and brightness combined. */
  alpha: number
}

const FRAME_MS = 50
const STATIC_EFFECTS = new Set(['solid', 'off', 'clear_effect'])

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
  )

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(query.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  return reduced
}

/** Advance a clock only while something on the bar is actually animating. */
function useClock(active: boolean): number {
  const [tick, setTick] = useState(0)
  const raf = useRef<number>()

  useEffect(() => {
    if (!active) return

    let last = performance.now()
    let elapsed = 0

    const step = (now: number) => {
      elapsed += now - last
      last = now
      if (elapsed >= FRAME_MS) {
        setTick((t) => t + Math.floor(elapsed / FRAME_MS))
        elapsed %= FRAME_MS
      }
      raf.current = requestAnimationFrame(step)
    }

    raf.current = requestAnimationFrame(step)
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current)
    }
  }, [active])

  return tick
}

/**
 * Work out how brightly each of the seven LEDs is shining at this moment.
 *
 * A whole-bar effect is one pattern travelling across all seven LEDs, so its
 * frame is shared. Per-LED effects each run on their own firmware timer, so
 * they are given independent phases and drift apart, as they do on the switch.
 */
export function useLedIntensities(mode: LedMode, leds: LedSlot[]): LitLed[] {
  const reducedMotion = usePrefersReducedMotion()

  const animates = useMemo(
    () => leds.some((l) => l.alert_key && !STATIC_EFFECTS.has(l.effect)),
    [leds],
  )

  const tick = useClock(animates && !reducedMotion)
  const elapsedMs = tick * FRAME_MS

  return useMemo(() => {
    const barFrame = (() => {
      if (mode !== 'bar') return null
      const lit = leds.find((l) => l.alert_key)
      if (!lit) return null
      const anim = barAnimation(lit.effect)
      const index = reducedMotion ? 0 : Math.floor(elapsedMs / anim.frameMs) % anim.frames.length
      return anim.frames[index]
    })()

    return [1, 2, 3, 4, 5, 6, 7].map((led) => {
      const slot = leds.find((l) => l.led === led)

      if (!slot?.alert_key) {
        return { led, alertKey: null, color: 0, css: 'transparent', alpha: 0 }
      }

      const intensity = barFrame
        ? (barFrame[led - 1] ?? 0)
        : (() => {
            const anim = ledAnimation(slot.effect)
            const phase = reducedMotion ? 0 : Math.floor(elapsedMs / anim.frameMs) + led
            return anim.frames[phase % anim.frames.length] ?? 0
          })()

      return {
        led,
        alertKey: slot.alert_key,
        color: slot.color,
        css: inovelliColorToCss(slot.color),
        alpha: intensity * (slot.level / 100),
      }
    })
  }, [mode, leds, elapsedMs, reducedMotion])
}

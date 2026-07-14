import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { Card, PriorityBadge } from '../components/ui'
import { InovelliSwitch, LedLegend } from '../components/InovelliSwitch'
import { alertsApi, alertConfigsApi } from '../services/api'
import { getColorByValue } from '../constants/inovelli'

/**
 * Try alert combinations against the arbitration rules without triggering
 * anything, to see which alerts stay visible when they compete.
 */
export function Simulator() {
  const [selected, setSelected] = useState<string[]>([])

  const { data: summary = [] } = useQuery({
    queryKey: ['alert-configs', 'summary'],
    queryFn: alertConfigsApi.getSummary,
  })

  const { data: plan } = useQuery({
    queryKey: ['alerts', 'plan', 'simulate', selected],
    queryFn: () => alertsApi.simulatePlan(selected),
  })

  const toggle = (key: string) =>
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key].sort(),
    )

  const suppressed = new Set(plan?.suppressed ?? [])

  return (
    <div>
      <div className="mb-6">
        <h2 className="m-0 mb-1 text-xl font-bold">Simulator</h2>
        <p className="m-0 text-[13px] text-[#8e8e93]">
          Turn alerts on to see what the switch would show. Nothing here changes live alerts.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
        <Card noPadding className="overflow-hidden">
          {summary.length === 0 ? (
            <p className="p-8 text-center text-[13px] text-[#8e8e93]">
              No alert keys yet. Create one on the Alerts page to simulate it here.
            </p>
          ) : (
            <ul className="m-0 list-none p-0">
              {summary.map((a) => {
                const on = selected.includes(a.alert_key)
                const hidden = on && suppressed.has(a.alert_key)
                const swatch = getColorByValue(a.led_color)?.hex ?? '#3a3a3c'

                return (
                  <li key={a.alert_key} className="border-b border-[#2c2c2e] last:border-b-0">
                    <button
                      type="button"
                      onClick={() => toggle(a.alert_key)}
                      aria-pressed={on}
                      className={clsx(
                        'flex w-full items-center gap-3 px-5 py-3 text-left transition-colors',
                        'focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0a84ff]',
                        on ? 'bg-[#2c2c2e]/60' : 'hover:bg-[#2c2c2e]/30',
                      )}
                    >
                      <span
                        className={clsx(
                          'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
                          on ? 'border-[#0a84ff] bg-[#0a84ff]' : 'border-[#48484a]',
                        )}
                      >
                        {on && (
                          <svg
                            className="h-3 w-3 text-white"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 9.7a1 1 0 011.4-1.4l3.8 3.8 6.8-6.8a1 1 0 011.4 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </span>

                      <span
                        className="h-6 w-1 shrink-0 rounded-full"
                        style={{ backgroundColor: on ? swatch : '#3a3a3c' }}
                      />

                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-mono text-[13px] text-white">
                          {a.alert_key}
                        </span>
                        <span className="block truncate text-[11px] text-[#8e8e93]">
                          {a.led_scope === 'bar'
                            ? 'Whole bar'
                            : `LED ${(a.led_positions ?? []).join(', ') || '—'}`}
                          {a.led_effect ? ` · ${a.led_effect}` : ''}
                        </span>
                      </span>

                      {hidden && (
                        <span className="shrink-0 rounded-full bg-[#3a3a3c] px-2 py-0.5 text-[10px] text-[#c7c7cc]">
                          Hidden
                        </span>
                      )}

                      <PriorityBadge priority={a.default_priority} />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        <Card className="flex flex-col items-center gap-4 self-start">
          <span className="font-mono text-[11px] uppercase tracking-wider text-[#8e8e93]">
            On the switch
          </span>

          {plan && <InovelliSwitch mode={plan.mode} leds={plan.leds} size="lg" />}

          {plan && !plan.is_all_clear && (
            <LedLegend mode={plan.mode} leds={plan.leds} className="w-full" />
          )}

          <p className="m-0 max-w-[15rem] text-center text-[12px] leading-relaxed text-[#8e8e93]">
            {!plan || plan.is_all_clear
              ? 'All clear. Turn on an alert to see it appear.'
              : plan.mode === 'bar'
                ? `${plan.bar_alert_key} is a whole-bar alert, so it covers the switch and hides every per-LED alert while it is active.`
                : `${plan.leds.filter((l) => l.alert_key).length} of 7 LEDs lit. Where alerts overlap, the higher priority one wins that LED.`}
          </p>
        </Card>
      </div>
    </div>
  )
}

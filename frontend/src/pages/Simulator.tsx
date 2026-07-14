import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { Button, Card, CardTitle, PriorityBadge } from '../components/ui'
import { PageHeader } from '../components/Layout'
import { InovelliSwitch, LedLegend } from '../components/InovelliSwitch'
import { alertsApi, alertConfigsApi } from '../services/api'
import { getColorByValue } from '../constants/inovelli'
import { priorityColor } from '../constants/priority'

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
  const litCount = plan?.leds.filter((l) => l.alert_key).length ?? 0

  const explanation = () => {
    if (!plan || plan.is_all_clear) return 'Turn on an alert to see it appear on the switch.'
    if (plan.mode === 'bar') {
      return `${plan.bar_alert_key} is a whole-bar alert, so it covers the switch and hides every per-LED alert while it is active — whatever their priority.`
    }
    return `${litCount} of 7 LEDs lit. Where two alerts claim the same LED, the higher priority one wins it.`
  }

  return (
    <div>
      <PageHeader
        title="Simulator"
        subtitle="Turn alerts on to see what the switch would show. Nothing here changes live alerts."
        action={
          selected.length > 0 ? (
            <Button variant="default" onClick={() => setSelected([])}>
              Reset
            </Button>
          ) : undefined
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card noPadding className="overflow-hidden">
          {summary.length === 0 ? (
            <p className="m-0 p-10 text-center text-[13px] text-tx2">
              No alert keys yet. Create one on the Alerts page to simulate it here.
            </p>
          ) : (
            <ul className="m-0 list-none p-0">
              {summary.map((a) => {
                const on = selected.includes(a.alert_key)
                const hidden = on && suppressed.has(a.alert_key)
                const swatch = getColorByValue(a.led_color)?.hex ?? 'var(--line2)'

                return (
                  <li key={a.alert_key} className="border-b border-line last:border-b-0">
                    <button
                      type="button"
                      onClick={() => toggle(a.alert_key)}
                      aria-pressed={on}
                      className={clsx(
                        'flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors',
                        on ? 'bg-panel2' : 'hover:bg-panel2',
                      )}
                    >
                      <span
                        className={clsx(
                          'grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[5px] border transition-colors',
                          on ? 'border-accent bg-accent text-white' : 'border-line2',
                        )}
                      >
                        {on && (
                          <svg
                            className="h-3 w-3"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            aria-hidden="true"
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
                        className="h-7 w-1 shrink-0 rounded"
                        style={{ backgroundColor: on ? swatch : 'var(--line2)' }}
                      />

                      <span className="min-w-0 flex-1">
                        <b className="block truncate font-mono text-[13px] font-semibold text-tx">
                          {a.alert_key}
                        </b>
                        <small className="block truncate text-[12px] text-tx2">
                          {a.led_scope === 'bar'
                            ? 'Whole bar'
                            : `LEDs ${(a.led_positions ?? []).join(', ') || '—'}`}
                          {a.led_effect ? ` · ${a.led_effect.replace(/_/g, ' ')}` : ''}
                        </small>
                      </span>

                      {hidden && (
                        <span className="shrink-0 rounded-full border border-line2 px-2 py-0.5 text-[10.5px] font-semibold text-tx2">
                          Hidden
                        </span>
                      )}

                      <PriorityBadge priority={a.default_priority} variant="compact" />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        <Card className="self-start">
          <CardTitle>On the switch</CardTitle>

          <div className="flex flex-col items-center gap-4">
            {plan && <InovelliSwitch mode={plan.mode} leds={plan.leds} size="lg" />}

            {plan && !plan.is_all_clear && (
              <LedLegend mode={plan.mode} leds={plan.leds} className="w-full" />
            )}

            <p className="m-0 text-center text-[12.5px] leading-relaxed text-tx2">
              {explanation()}
            </p>

            {plan && plan.suppressed.length > 0 && (
              <div className="w-full rounded-xl border border-line bg-panel2 p-3">
                <p className="eyebrow m-0 mb-1.5">Hidden</p>
                <ul className="m-0 flex list-none flex-col gap-1 p-0">
                  {plan.suppressed.map((key) => {
                    const cfg = summary.find((s) => s.alert_key === key)
                    return (
                      <li
                        key={key}
                        className="flex items-center gap-2 font-mono text-[12px] text-tx2"
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ background: priorityColor(cfg?.default_priority ?? 3) }}
                        />
                        {key}
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}

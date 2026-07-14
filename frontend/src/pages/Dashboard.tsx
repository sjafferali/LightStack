import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Button, Card, CardTitle, Modal, PriorityBadge } from '../components/ui'
import { PageHeader } from '../components/Layout'
import { InovelliSwitch, LedLegend } from '../components/InovelliSwitch'
import { alertsApi, statsApi, historyApi } from '../services/api'
import { priorityColor, priorityTint } from '../constants/priority'
import { formatDuration, getColorByValue, getEffectByValue } from '../constants/inovelli'
import { Alert, AlertHistory } from '../types/alert'

function formatTime(timestamp: string | null): string {
  if (!timestamp) return '—'
  return new Date(timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(timestamp: string | null): string {
  if (!timestamp) return '—'
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface StatProps {
  label: string
  value: number | string
  sub: string
  icon: string
  color?: string
}

function Stat({ label, value, sub, icon, color }: StatProps) {
  return (
    <Card className="!p-4 sm:!p-[18px]">
      <div className="flex items-center gap-2 text-[12px] font-semibold text-tx2">
        <span style={color ? { color } : undefined}>{icon}</span>
        {label}
      </div>
      <div
        className="mt-2 text-[30px] font-bold leading-none tracking-[-1px] text-tx"
        style={color ? { color } : undefined}
      >
        {value}
      </div>
      <div className="mt-1.5 text-[11.5px] font-medium text-tx3">{sub}</div>
    </Card>
  )
}

export function Dashboard() {
  const queryClient = useQueryClient()
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null)

  const { data: activeAlerts = [], isLoading } = useQuery({
    queryKey: ['alerts', 'active'],
    queryFn: alertsApi.getActive,
    refetchInterval: 5000,
  })

  const { data: plan } = useQuery({
    queryKey: ['alerts', 'plan'],
    queryFn: alertsApi.getPlan,
    refetchInterval: 5000,
  })

  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn: statsApi.getDashboard,
    refetchInterval: 30000,
  })

  const { data: alertHistory } = useQuery({
    queryKey: ['history', selectedAlert?.alert_key],
    queryFn: () =>
      selectedAlert ? historyApi.getByKey(selectedAlert.alert_key, 5) : Promise.resolve([]),
    enabled: !!selectedAlert,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['alerts'] })
    queryClient.invalidateQueries({ queryKey: ['stats'] })
  }

  const clearMutation = useMutation({
    mutationFn: (alertKey: string) => alertsApi.clear(alertKey),
    onSuccess: () => {
      invalidate()
      toast.success('Alert cleared')
    },
    onError: () => toast.error("Couldn't clear the alert"),
  })

  const clearAllMutation = useMutation({
    mutationFn: () => alertsApi.clearAll(),
    onSuccess: (data) => {
      invalidate()
      toast.success(`Cleared ${data.cleared_count} alerts`)
    },
    onError: () => toast.error("Couldn't clear the alerts"),
  })

  // Alerts actually lit on the switch. Several can show at once, so this is a
  // set rather than a single winner.
  const shown = new Set((plan?.leds ?? []).filter((l) => l.alert_key).map((l) => l.alert_key!))
  const litCount = plan?.leds.filter((l) => l.alert_key).length ?? 0
  const barAlert =
    plan?.mode === 'bar' ? activeAlerts.find((a) => a.alert_key === plan.bar_alert_key) : undefined

  // These four settings describe the whole bar, so they only hold when a single
  // alert owns it. With several per-LED alerts lit, the legend carries each
  // alert's own colour and effect instead.
  const heroConfig = plan?.mode === 'bar' ? barAlert?.config : undefined

  const headline = () => {
    if (!plan || isLoading) return 'Loading…'
    if (plan.is_all_clear) return 'All clear'
    if (plan.mode === 'bar' && barAlert) return barAlert.config?.name || barAlert.alert_key
    return `${shown.size} ${shown.size === 1 ? 'alert' : 'alerts'} on ${litCount} ${
      litCount === 1 ? 'LED' : 'LEDs'
    }`
  }

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={
          activeAlerts.length === 0
            ? 'Nothing active — your switches are clear'
            : `${activeAlerts.length} active ${activeAlerts.length === 1 ? 'alert' : 'alerts'}`
        }
        action={
          activeAlerts.length > 0 ? (
            <Button
              variant="danger"
              onClick={() => clearAllMutation.mutate()}
              disabled={clearAllMutation.isPending}
            >
              Clear all
            </Button>
          ) : undefined
        }
      />

      {/* Stats */}
      <div className="mb-4 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <Stat
          icon="◔"
          label="Active now"
          value={stats?.active_count ?? '—'}
          sub={`across ${stats?.total_alert_keys ?? 0} alert keys`}
        />
        <Stat
          icon="◆"
          label="Critical"
          value={stats?.critical_today ?? '—'}
          sub="triggered today"
          color={stats?.critical_today ? priorityColor(1) : undefined}
        />
        <Stat
          icon="↯"
          label="Today"
          value={stats?.total_alerts_today ?? '—'}
          sub="total triggers"
        />
        <Stat
          icon="✓"
          label="Auto-cleared"
          value={stats?.auto_cleared ?? '—'}
          sub="resolved on their own"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        {/* Hero: what the switch is showing */}
        <Card>
          <CardTitle>Currently displaying on switches</CardTitle>

          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2
                className="m-0 text-[26px] font-bold leading-tight tracking-[-0.5px]"
                style={{
                  color: plan?.is_all_clear
                    ? priorityColor(4)
                    : barAlert
                      ? priorityColor(barAlert.effective_priority)
                      : 'var(--tx)',
                }}
              >
                {headline()}
              </h2>
              <p className="m-0 mt-2 text-[13px] text-tx2">
                {!plan || plan.is_all_clear
                  ? 'No alerts are active. The LEDs are off.'
                  : plan.mode === 'bar'
                    ? `${plan.bar_alert_key} covers the whole bar${
                        plan.suppressed.length > 0
                          ? `, hiding ${plan.suppressed.join(', ')} until it clears`
                          : ''
                      }.`
                    : plan.suppressed.length > 0
                      ? `${plan.suppressed.join(', ')} ${
                          plan.suppressed.length === 1 ? 'is' : 'are'
                        } outranked on every LED they claim.`
                      : 'Each alert holds its own LEDs.'}
              </p>
            </div>

            {barAlert && <PriorityBadge priority={barAlert.effective_priority} className="mt-1" />}
          </div>

          {/* LED output */}
          <div className="mt-5">
            <div className="eyebrow mb-2.5">LED output</div>

            <div className="flex flex-wrap items-center gap-6 rounded-xl border border-line bg-panel2 p-5">
              {plan && <InovelliSwitch mode={plan.mode} leds={plan.leds} size="md" />}
              <div className="min-w-[150px] flex-1">
                {plan && <LedLegend mode={plan.mode} leds={plan.leds} />}
              </div>
            </div>

            {heroConfig && !plan?.is_all_clear && (
              <div className="mt-3.5 flex flex-wrap gap-x-7 gap-y-3">
                {[
                  { k: 'Color', v: getColorByValue(heroConfig.led_color)?.label ?? 'Not set' },
                  {
                    k: 'Effect',
                    v: getEffectByValue(heroConfig.led_effect)?.label ?? 'Not set',
                  },
                  {
                    k: 'Brightness',
                    v:
                      heroConfig.led_brightness !== null
                        ? `${heroConfig.led_brightness}%`
                        : 'Not set',
                  },
                  { k: 'Duration', v: formatDuration(heroConfig.led_duration) },
                ].map(({ k, v }) => (
                  <div key={k} className="text-[12px] text-tx2">
                    {k}
                    <b className="mt-0.5 block text-[13.5px] font-semibold text-tx">{v}</b>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Active alerts */}
        <Card>
          <CardTitle>
            <span>Active alerts</span>
            <span className="font-bold text-tx2">{activeAlerts.length}</span>
          </CardTitle>

          {isLoading ? (
            <p className="py-10 text-center text-[13px] text-tx2">Loading…</p>
          ) : activeAlerts.length === 0 ? (
            <div className="flex flex-col items-center gap-1 py-12 text-center">
              <span className="text-[22px] opacity-60">✓</span>
              <p className="m-0 text-[13.5px] font-semibold text-tx">All clear</p>
              <p className="m-0 text-[12.5px] text-tx2">Alerts you trigger will appear here.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-0.5">
              {activeAlerts.map((alert) => (
                <div
                  key={alert.alert_key}
                  className="flex items-center gap-3 rounded-xl px-2.5 py-3 transition-colors hover:bg-panel2"
                >
                  <span
                    className="w-1 shrink-0 self-stretch rounded"
                    style={{ background: priorityColor(alert.effective_priority) }}
                  />
                  <button
                    type="button"
                    onClick={() => setSelectedAlert(alert)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <b className="block truncate font-mono text-[13px] font-semibold text-tx">
                      {alert.alert_key}
                    </b>
                    <small className="block truncate text-[12px] text-tx2">
                      {shown.has(alert.alert_key) ? 'displaying now' : 'not shown'} ·{' '}
                      {formatTime(alert.last_triggered_at)}
                    </small>
                  </button>
                  <PriorityBadge priority={alert.effective_priority} variant="compact" />
                  <button
                    type="button"
                    aria-label={`Clear ${alert.alert_key}`}
                    onClick={() => clearMutation.mutate(alert.alert_key)}
                    disabled={clearMutation.isPending}
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-line2 text-[13px] text-tx2 transition-colors hover:border-p1 hover:text-p1 disabled:opacity-45"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Alert details */}
      <Modal
        isOpen={!!selectedAlert}
        onClose={() => setSelectedAlert(null)}
        title={selectedAlert?.alert_key ?? ''}
        description={selectedAlert?.config?.description ?? undefined}
      >
        {selectedAlert && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center gap-2.5">
              <PriorityBadge priority={selectedAlert.effective_priority} />
              <span
                className="rounded-full px-2.5 py-1 text-[11px] font-bold"
                style={{ background: priorityTint(4), color: priorityColor(4) }}
              >
                Active
              </span>
              {shown.has(selectedAlert.alert_key) && (
                <span
                  className="rounded-full px-2.5 py-1 text-[11px] font-bold"
                  style={{
                    background: 'color-mix(in srgb, var(--accent) 14%, transparent)',
                    color: 'var(--accent)',
                  }}
                >
                  On the switch
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-line bg-panel2 p-4">
                <p className="eyebrow m-0">Last triggered</p>
                <p className="m-0 mt-1.5 text-[13px] font-semibold text-tx">
                  {formatDate(selectedAlert.last_triggered_at)}
                </p>
              </div>
              <div className="rounded-xl border border-line bg-panel2 p-4">
                <p className="eyebrow m-0">Total triggers</p>
                <p className="m-0 mt-1.5 text-[13px] font-semibold text-tx">
                  {selectedAlert.config?.trigger_count ?? 0}
                </p>
              </div>
            </div>

            <div>
              <p className="eyebrow m-0 mb-2">Recent history</p>
              <div className="overflow-hidden rounded-xl border border-line">
                {alertHistory && alertHistory.length > 0 ? (
                  alertHistory.map((entry: AlertHistory, idx: number) => (
                    <div
                      key={entry.id}
                      className={`flex items-center justify-between px-4 py-2.5 ${
                        idx < alertHistory.length - 1 ? 'border-b border-line' : ''
                      }`}
                    >
                      <span className="font-mono text-[12px] text-tx2">
                        {formatDate(entry.created_at)}
                      </span>
                      <span
                        className="rounded-full px-2 py-0.5 text-[10.5px] font-bold capitalize"
                        style={{
                          background: priorityTint(entry.action === 'triggered' ? 2 : 4),
                          color: priorityColor(entry.action === 'triggered' ? 2 : 4),
                        }}
                      >
                        {entry.action}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="m-0 p-4 text-center text-[13px] text-tx2">No history yet</p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="default" onClick={() => setSelectedAlert(null)}>
                Close
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  clearMutation.mutate(selectedAlert.alert_key)
                  setSelectedAlert(null)
                }}
              >
                Clear alert
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

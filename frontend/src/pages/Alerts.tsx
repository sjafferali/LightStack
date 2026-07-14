import { ReactNode, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import { Button, Card, Modal, PriorityBadge, StatusIndicator } from '../components/ui'
import { PageHeader } from '../components/Layout'
import { InovelliSwitch } from '../components/InovelliSwitch'
import { LedPicker } from '../components/LedPicker'
import { alertsApi, alertConfigsApi } from '../services/api'
import { slotsForAlert } from '../constants/ledAnimations'
import {
  LED_COLORS,
  LED_DURATIONS,
  effectsForScope,
  getColorByValue,
  isEffectValidForScope,
} from '../constants/inovelli'
import { PRIORITIES, priorityColor, priorityLabel, priorityTint } from '../constants/priority'
import { AlertConfig, AlertConfigUpdate, LedScope } from '../types/alert'

function formatDate(timestamp: string | null): string {
  if (!timestamp) return 'Never'
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const inputClass =
  'w-full rounded-[10px] border border-line2 bg-panel2 px-3.5 py-2.5 text-[13px] text-tx ' +
  'placeholder:text-tx3 focus:border-accent focus:outline-none'

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: ReactNode
  children: ReactNode
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[12.5px] font-semibold text-tx">{label}</label>
      {children}
      {hint && <p className="m-0 mt-1.5 text-[11.5px] leading-relaxed text-tx2">{hint}</p>}
    </div>
  )
}

function Select({
  value,
  onChange,
  children,
}: {
  value: string | number
  onChange: (v: string) => void
  children: ReactNode
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={clsx(inputClass, 'cursor-pointer appearance-none pr-9')}
      >
        {children}
      </select>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-tx2">
        ▾
      </span>
    </div>
  )
}

function PriorityPicker({ value, onChange }: { value: number; onChange: (p: number) => void }) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {PRIORITIES.map((p) => {
        const on = value === p
        return (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            aria-pressed={on}
            className={clsx(
              'rounded-[10px] border px-2 py-2.5 text-center font-bold transition-colors',
              on ? 'border-transparent' : 'border-line2 hover:border-line2',
            )}
            style={
              on
                ? { background: priorityTint(p, 18), color: priorityColor(p) }
                : { color: 'var(--tx2)' }
            }
          >
            <span className="block text-[13px]">P{p}</span>
            <span className="mt-0.5 block text-[10px] font-semibold opacity-80">
              {priorityLabel(p)}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export function Alerts() {
  const queryClient = useQueryClient()

  const [configAlert, setConfigAlert] = useState<AlertConfig | null>(null)
  const [triggerModal, setTriggerModal] = useState(false)
  const [newAlertKey, setNewAlertKey] = useState('')
  const [newAlertPriority, setNewAlertPriority] = useState<number>(3)
  const [newAlertNote, setNewAlertNote] = useState('')

  const [editPriority, setEditPriority] = useState<number>(3)
  const [editLedScope, setEditLedScope] = useState<LedScope>('bar')
  const [editLedPositions, setEditLedPositions] = useState<number[]>([])
  const [editLedColor, setEditLedColor] = useState<number | null>(null)
  const [editLedEffect, setEditLedEffect] = useState<string | null>(null)
  const [editLedBrightness, setEditLedBrightness] = useState<number>(100)
  const [editLedDuration, setEditLedDuration] = useState<number>(255)

  const availableEffects = effectsForScope(editLedScope)
  // Bar-only effects have no per-LED equivalent, so switching scope can leave
  // the chosen effect unusable.
  const effectUnavailable = !isEffectValidForScope(editLedEffect, editLedScope)
  const missingPositions = editLedScope === 'individual' && editLedPositions.length === 0
  const configInvalid = effectUnavailable || missingPositions

  const { data: summary = [], isLoading } = useQuery({
    queryKey: ['alert-configs', 'summary'],
    queryFn: alertConfigsApi.getSummary,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['alerts'] })
    queryClient.invalidateQueries({ queryKey: ['alert-configs'] })
    queryClient.invalidateQueries({ queryKey: ['stats'] })
  }

  const triggerMutation = useMutation({
    mutationFn: ({
      alertKey,
      priority,
      note,
    }: {
      alertKey: string
      priority?: number
      note?: string
    }) => alertsApi.trigger(alertKey, { priority, note }),
    onSuccess: () => {
      invalidate()
      toast.success('Alert triggered')
      setTriggerModal(false)
      setNewAlertKey('')
      setNewAlertPriority(3)
      setNewAlertNote('')
    },
    onError: () => toast.error("Couldn't trigger the alert"),
  })

  const clearMutation = useMutation({
    mutationFn: (alertKey: string) => alertsApi.clear(alertKey),
    onSuccess: () => {
      invalidate()
      toast.success('Alert cleared')
    },
    onError: () => toast.error("Couldn't clear the alert"),
  })

  const updateConfigMutation = useMutation({
    mutationFn: ({ alertKey, config }: { alertKey: string; config: AlertConfigUpdate }) =>
      alertConfigsApi.update(alertKey, config),
    onSuccess: () => {
      invalidate()
      toast.success('Configuration saved')
      setConfigAlert(null)
    },
    onError: () => toast.error("Couldn't save the configuration"),
  })

  const deleteConfigMutation = useMutation({
    mutationFn: (alertKey: string) => alertConfigsApi.delete(alertKey),
    onSuccess: () => {
      invalidate()
      toast.success('Alert deleted')
      setConfigAlert(null)
    },
    onError: () => toast.error("Couldn't delete the alert"),
  })

  const openConfig = (alert: AlertConfig) => {
    setConfigAlert(alert)
    setEditPriority(alert.default_priority)
    setEditLedScope(alert.led_scope ?? 'bar')
    setEditLedPositions(alert.led_positions ?? [])
    setEditLedColor(alert.led_color)
    setEditLedEffect(alert.led_effect)
    setEditLedBrightness(alert.led_brightness ?? 100)
    setEditLedDuration(alert.led_duration ?? 255)
  }

  return (
    <div>
      <PageHeader
        title="Alerts"
        subtitle="Set what each alert looks like on the switch, and where it shows."
        action={
          <Button variant="primary" onClick={() => setTriggerModal(true)}>
            Trigger alert
          </Button>
        }
      />

      <Card noPadding className="overflow-hidden">
        {isLoading ? (
          <p className="m-0 p-10 text-center text-[13px] text-tx2">Loading…</p>
        ) : summary.length === 0 ? (
          <div className="flex flex-col items-center gap-1.5 p-12 text-center">
            <p className="m-0 text-[14px] font-semibold text-tx">No alerts yet</p>
            <p className="m-0 max-w-sm text-[13px] text-tx2">
              Trigger an alert to register it. It will appear here, ready to configure.
            </p>
            <Button variant="primary" className="mt-3" onClick={() => setTriggerModal(true)}>
              Trigger alert
            </Button>
          </div>
        ) : (
          <ul className="m-0 list-none p-0">
            {summary.map((alert) => (
              <li
                key={alert.alert_key}
                className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-line px-5 py-4 last:border-b-0"
              >
                <StatusIndicator active={alert.is_active} />

                <div className="min-w-[180px] flex-1">
                  <div className="flex items-center gap-2">
                    <b className="truncate font-mono text-[13.5px] font-semibold text-tx">
                      {alert.alert_key}
                    </b>
                    {alert.is_active && (
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                        style={{ background: priorityTint(4), color: priorityColor(4) }}
                      >
                        Active
                      </span>
                    )}
                  </div>
                  <small className="mt-0.5 block text-[12px] text-tx2">
                    {alert.led_scope === 'bar'
                      ? 'Whole bar'
                      : `LEDs ${(alert.led_positions ?? []).join(', ') || '—'}`}
                    {alert.led_effect ? ` · ${alert.led_effect.replace(/_/g, ' ')}` : ''} ·{' '}
                    {alert.trigger_count} triggers · {formatDate(alert.last_triggered_at)}
                  </small>
                </div>

                <PriorityBadge priority={alert.default_priority} />

                <div className="flex gap-2">
                  <Button
                    size="small"
                    variant="ghost"
                    onClick={() =>
                      openConfig({
                        id: 0,
                        alert_key: alert.alert_key,
                        name: alert.name,
                        description: null,
                        default_priority: alert.default_priority,
                        led_scope: alert.led_scope,
                        led_positions: alert.led_positions,
                        led_color: alert.led_color,
                        led_effect: alert.led_effect,
                        led_brightness: alert.led_brightness,
                        led_duration: alert.led_duration,
                        created_at: '',
                        updated_at: '',
                        trigger_count: alert.trigger_count,
                      })
                    }
                  >
                    Configure
                  </Button>
                  {alert.is_active ? (
                    <Button
                      size="small"
                      variant="danger"
                      onClick={() => clearMutation.mutate(alert.alert_key)}
                      disabled={clearMutation.isPending}
                    >
                      Clear
                    </Button>
                  ) : (
                    <Button
                      size="small"
                      variant="default"
                      onClick={() => triggerMutation.mutate({ alertKey: alert.alert_key })}
                      disabled={triggerMutation.isPending}
                    >
                      Trigger
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Configure */}
      <Modal
        isOpen={!!configAlert}
        onClose={() => setConfigAlert(null)}
        title={configAlert?.alert_key ?? ''}
        description="Choose where this alert shows on the switch and what it looks like."
        size="wide"
      >
        {configAlert && (
          <div className="flex flex-col gap-6">
            <Field label="Default priority">
              <PriorityPicker value={editPriority} onChange={setEditPriority} />
            </Field>

            <div className="grid gap-6 md:grid-cols-[1fr_220px]">
              <div className="flex flex-col gap-5">
                <Field
                  label="Shows on"
                  hint="A whole-bar alert covers the entire switch, hiding any per-LED alerts while it is active — whatever their priority."
                >
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        { scope: 'bar', title: 'Whole bar', blurb: 'Takes over the switch' },
                        {
                          scope: 'individual',
                          title: 'Specific LEDs',
                          blurb: 'Shares with other alerts',
                        },
                      ] as { scope: LedScope; title: string; blurb: string }[]
                    ).map((opt) => (
                      <button
                        key={opt.scope}
                        type="button"
                        onClick={() => setEditLedScope(opt.scope)}
                        aria-pressed={editLedScope === opt.scope}
                        className={clsx(
                          'rounded-[10px] border px-3 py-2.5 text-left transition-colors',
                          editLedScope === opt.scope
                            ? 'border-accent'
                            : 'border-line2 bg-panel2 hover:border-line2',
                        )}
                        style={
                          editLedScope === opt.scope
                            ? {
                                background: 'color-mix(in srgb, var(--accent) 10%, transparent)',
                              }
                            : undefined
                        }
                      >
                        <span className="block text-[13px] font-semibold text-tx">{opt.title}</span>
                        <span className="mt-0.5 block text-[11px] text-tx2">{opt.blurb}</span>
                      </button>
                    ))}
                  </div>
                </Field>

                {editLedScope === 'individual' && (
                  <Field
                    label="LEDs"
                    hint={
                      missingPositions ? (
                        <span className="text-p2">
                          Pick at least one LED to show this alert on.
                        </span>
                      ) : (
                        'LED 1 is the bottom of the switch, LED 7 the top.'
                      )
                    }
                  >
                    <LedPicker
                      selected={editLedPositions}
                      onChange={setEditLedPositions}
                      color={editLedColor ?? 0}
                    />
                  </Field>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Color">
                    <div className="relative">
                      <Select
                        value={editLedColor ?? ''}
                        onChange={(v) => setEditLedColor(v === '' ? null : Number(v))}
                      >
                        <option value="">Not set</option>
                        {LED_COLORS.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </Select>
                      {editLedColor !== null && (
                        <span
                          className="pointer-events-none absolute right-8 top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full border border-line2"
                          style={{ background: getColorByValue(editLedColor)?.hex }}
                        />
                      )}
                    </div>
                  </Field>

                  <Field
                    label="Effect"
                    hint={
                      effectUnavailable ? (
                        <span className="text-p2">
                          A single LED cannot run “{editLedEffect?.replace(/_/g, ' ')}”. Choose one
                          of the effects listed.
                        </span>
                      ) : undefined
                    }
                  >
                    <Select
                      value={editLedEffect ?? ''}
                      onChange={(v) => setEditLedEffect(v === '' ? null : v)}
                    >
                      <option value="">Not set</option>
                      {availableEffects.map((e) => (
                        <option key={e.value} value={e.value}>
                          {e.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={`Brightness — ${editLedBrightness}%`}>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={editLedBrightness}
                      onChange={(e) => setEditLedBrightness(Number(e.target.value))}
                      className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-line2 accent-[var(--accent)]"
                    />
                  </Field>

                  <Field label="Duration">
                    <Select value={editLedDuration} onChange={(v) => setEditLedDuration(Number(v))}>
                      {LED_DURATIONS.map((d) => (
                        <option key={d.value} value={d.value}>
                          {d.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
              </div>

              {/* Preview */}
              <div className="flex flex-col items-center gap-3 self-start rounded-2xl border border-line bg-panel2 p-5">
                <span className="eyebrow">Preview</span>
                <InovelliSwitch
                  mode={editLedScope}
                  size="md"
                  leds={slotsForAlert({
                    scope: editLedScope,
                    positions: editLedPositions,
                    color: editLedColor ?? 0,
                    effect: effectUnavailable ? 'solid' : (editLedEffect ?? 'solid'),
                    level: editLedBrightness,
                    alertKey: configAlert.alert_key,
                  })}
                />
                <span className="text-center text-[11.5px] leading-relaxed text-tx3">
                  This alert on its own, with no others active.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-line pt-5">
              <Button
                variant="danger"
                onClick={() => deleteConfigMutation.mutate(configAlert.alert_key)}
                disabled={deleteConfigMutation.isPending}
              >
                Delete
              </Button>
              <div className="flex gap-3">
                <Button variant="default" onClick={() => setConfigAlert(null)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  disabled={updateConfigMutation.isPending || configInvalid}
                  onClick={() =>
                    updateConfigMutation.mutate({
                      alertKey: configAlert.alert_key,
                      config: {
                        default_priority: editPriority,
                        led_scope: editLedScope,
                        led_positions: editLedScope === 'individual' ? editLedPositions : null,
                        led_color: editLedColor ?? undefined,
                        led_effect: editLedEffect ?? undefined,
                        led_brightness: editLedBrightness,
                        led_duration: editLedDuration,
                      },
                    })
                  }
                >
                  Save changes
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Trigger */}
      <Modal
        isOpen={triggerModal}
        onClose={() => setTriggerModal(false)}
        title="Trigger alert"
        description="Triggering an unknown key registers it automatically."
      >
        <div className="flex flex-col gap-5">
          <Field label="Alert key">
            <input
              autoFocus
              value={newAlertKey}
              onChange={(e) => setNewAlertKey(e.target.value)}
              placeholder="water_leak_detected"
              className={clsx(inputClass, 'font-mono')}
            />
          </Field>

          <Field label="Priority">
            <PriorityPicker value={newAlertPriority} onChange={setNewAlertPriority} />
          </Field>

          <Field label="Note (optional)">
            <input
              value={newAlertNote}
              onChange={(e) => setNewAlertNote(e.target.value)}
              placeholder="Why this fired"
              className={inputClass}
            />
          </Field>

          <div className="flex justify-end gap-3">
            <Button variant="default" onClick={() => setTriggerModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!newAlertKey.trim() || triggerMutation.isPending}
              onClick={() =>
                triggerMutation.mutate({
                  alertKey: newAlertKey.trim(),
                  priority: newAlertPriority,
                  note: newAlertNote || undefined,
                })
              }
            >
              Trigger
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

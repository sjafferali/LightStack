import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Card, Button, PriorityBadge, StatusIndicator, Modal } from '../components/ui'
import { alertsApi, alertConfigsApi } from '../services/api'
import { AlertConfig, AlertConfigUpdate, PRIORITY_CONFIG } from '../types/alert'
import { LED_COLORS, LED_EFFECTS, LED_DURATIONS, getColorByValue } from '../constants/inovelli'

function formatDate(timestamp: string | null): string {
  if (!timestamp) return 'Never'
  const date = new Date(timestamp)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function Alerts() {
  const queryClient = useQueryClient()
  const [configAlert, setConfigAlert] = useState<AlertConfig | null>(null)
  const [triggerModal, setTriggerModal] = useState(false)
  const [newAlertKey, setNewAlertKey] = useState('')
  const [newAlertPriority, setNewAlertPriority] = useState<number | null>(null)
  const [newAlertNote, setNewAlertNote] = useState('')
  const [editPriority, setEditPriority] = useState<number>(3)
  // LED effect configuration state
  const [editLedColor, setEditLedColor] = useState<number | null>(null)
  const [editLedEffect, setEditLedEffect] = useState<string | null>(null)
  const [editLedBrightness, setEditLedBrightness] = useState<number>(100)
  const [editLedDuration, setEditLedDuration] = useState<number>(255)

  // Queries
  const { data: summary = [], isLoading } = useQuery({
    queryKey: ['alert-configs', 'summary'],
    queryFn: alertConfigsApi.getSummary,
  })

  // Mutations
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
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
      queryClient.invalidateQueries({ queryKey: ['alert-configs'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      toast.success('Alert triggered')
      setTriggerModal(false)
      setNewAlertKey('')
      setNewAlertPriority(null)
      setNewAlertNote('')
    },
    onError: () => toast.error('Failed to trigger alert'),
  })

  const clearMutation = useMutation({
    mutationFn: (alertKey: string) => alertsApi.clear(alertKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
      queryClient.invalidateQueries({ queryKey: ['alert-configs'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      toast.success('Alert cleared')
    },
    onError: () => toast.error('Failed to clear alert'),
  })

  const updateConfigMutation = useMutation({
    mutationFn: ({ alertKey, config }: { alertKey: string; config: AlertConfigUpdate }) =>
      alertConfigsApi.update(alertKey, config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-configs'] })
      toast.success('Configuration updated')
      setConfigAlert(null)
    },
    onError: () => toast.error('Failed to update configuration'),
  })

  const deleteConfigMutation = useMutation({
    mutationFn: (alertKey: string) => alertConfigsApi.delete(alertKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-configs'] })
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
      toast.success('Alert deleted')
      setConfigAlert(null)
    },
    onError: () => toast.error('Failed to delete alert'),
  })

  const handleOpenConfig = (alert: AlertConfig) => {
    setConfigAlert(alert)
    setEditPriority(alert.default_priority)
    // Initialize LED settings
    setEditLedColor(alert.led_color)
    setEditLedEffect(alert.led_effect)
    setEditLedBrightness(alert.led_brightness ?? 100)
    setEditLedDuration(alert.led_duration ?? 255)
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="m-0 mb-1 text-xl font-bold">All Alert Keys</h2>
          <p className="m-0 text-[13px] text-[#8e8e93]">
            Configure priorities and manage all registered alerts
          </p>
        </div>
        <Button variant="primary" onClick={() => setTriggerModal(true)}>
          + Trigger Alert
        </Button>
      </div>

      <Card noPadding className="overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#2c2c2e]">
              {[
                'Status',
                'Alert Key',
                'Default Priority',
                'Last Triggered',
                'Total Triggers',
                'Actions',
              ].map((header) => (
                <th
                  key={header}
                  className="border-b border-[#3a3a3c] px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide text-[#8e8e93]"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-[#8e8e93]">
                  Loading...
                </td>
              </tr>
            ) : summary.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-[#8e8e93]">
                  No alerts registered yet. Trigger an alert to get started.
                </td>
              </tr>
            ) : (
              summary.map((alert, idx) => (
                <tr
                  key={alert.alert_key}
                  className={`${
                    idx < summary.length - 1 ? 'border-b border-[#2c2c2e]' : ''
                  } ${alert.is_active ? 'bg-[rgba(255,59,48,0.05)]' : ''}`}
                >
                  <td className="px-5 py-4">
                    <StatusIndicator active={alert.is_active} />
                  </td>
                  <td className="px-5 py-4">
                    <span className="font-mono font-medium">{alert.alert_key}</span>
                  </td>
                  <td className="px-5 py-4">
                    <PriorityBadge priority={alert.default_priority} size="small" />
                  </td>
                  <td className="px-5 py-4 text-[13px] text-[#8e8e93]">
                    {formatDate(alert.last_triggered_at)}
                  </td>
                  <td className="px-5 py-4 font-mono font-semibold">{alert.trigger_count}</td>
                  <td className="px-5 py-4">
                    <div className="flex gap-2">
                      <Button
                        size="small"
                        variant="ghost"
                        onClick={() =>
                          handleOpenConfig({
                            id: 0,
                            alert_key: alert.alert_key,
                            name: alert.name,
                            description: null,
                            default_priority: alert.default_priority,
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
                      <Button
                        size="small"
                        variant="success"
                        onClick={() => triggerMutation.mutate({ alertKey: alert.alert_key })}
                        disabled={triggerMutation.isPending}
                      >
                        Trigger
                      </Button>
                      {alert.is_active && (
                        <Button
                          size="small"
                          variant="danger"
                          onClick={() => clearMutation.mutate(alert.alert_key)}
                          disabled={clearMutation.isPending}
                        >
                          Clear
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      {/* Configure Alert Modal */}
      <Modal
        isOpen={!!configAlert}
        onClose={() => setConfigAlert(null)}
        title={`Configure: ${configAlert?.alert_key || ''}`}
      >
        {configAlert && (
          <div className="flex flex-col gap-6">
            <div>
              <label className="mb-2 block text-[13px] font-semibold">Default Priority</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((p) => (
                  <button
                    key={p}
                    className={`flex-1 cursor-pointer rounded-lg border-2 p-3 font-mono font-bold transition-all ${
                      editPriority === p
                        ? `border-[${PRIORITY_CONFIG[p].color}]`
                        : 'border-[#3a3a3c]'
                    }`}
                    style={{
                      background: editPriority === p ? PRIORITY_CONFIG[p].bg : '#2c2c2e',
                      borderColor: editPriority === p ? PRIORITY_CONFIG[p].color : '#3a3a3c',
                      color: PRIORITY_CONFIG[p].color,
                    }}
                    onClick={() => setEditPriority(p)}
                  >
                    P{p}
                    <div className="mt-1 text-[10px] opacity-80">{PRIORITY_CONFIG[p].label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* LED Effect Configuration */}
            <div className="border-t border-[#3a3a3c] pt-6">
              <h3 className="mb-4 text-[15px] font-semibold">Inovelli LED Effect</h3>

              {/* Color Selection */}
              <div className="mb-4">
                <label className="mb-2 block text-[13px] font-semibold">Color</label>
                <div className="relative">
                  <select
                    value={editLedColor ?? ''}
                    onChange={(e) =>
                      setEditLedColor(e.target.value === '' ? null : Number(e.target.value))
                    }
                    className="w-full appearance-none rounded-lg border border-[#3a3a3c] bg-[#2c2c2e] px-4 py-3 pr-10 text-sm text-white focus:border-[#0a84ff] focus:outline-none"
                  >
                    <option value="">Not configured</option>
                    {LED_COLORS.map((color) => (
                      <option key={color.value} value={color.value}>
                        {color.label}
                      </option>
                    ))}
                  </select>
                  {editLedColor !== null && (
                    <div
                      className="pointer-events-none absolute right-10 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border border-[#3a3a3c]"
                      style={{
                        backgroundColor: getColorByValue(editLedColor)?.hex || '#000',
                      }}
                    />
                  )}
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#8e8e93]">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Effect Selection */}
              <div className="mb-4">
                <label className="mb-2 block text-[13px] font-semibold">Effect</label>
                <div className="relative">
                  <select
                    value={editLedEffect ?? ''}
                    onChange={(e) =>
                      setEditLedEffect(e.target.value === '' ? null : e.target.value)
                    }
                    className="w-full appearance-none rounded-lg border border-[#3a3a3c] bg-[#2c2c2e] px-4 py-3 pr-10 text-sm text-white focus:border-[#0a84ff] focus:outline-none"
                  >
                    <option value="">Not configured</option>
                    {LED_EFFECTS.map((effect) => (
                      <option key={effect.value} value={effect.value}>
                        {effect.label}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#8e8e93]">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Brightness Slider */}
              <div className="mb-4">
                <label className="mb-2 flex items-center justify-between text-[13px] font-semibold">
                  <span>Brightness</span>
                  <span className="font-mono text-[#8e8e93]">{editLedBrightness}%</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={editLedBrightness}
                  onChange={(e) => setEditLedBrightness(Number(e.target.value))}
                  className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-[#3a3a3c] accent-[#0a84ff]"
                />
                <div className="mt-1 flex justify-between text-[10px] text-[#8e8e93]">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Duration Selection */}
              <div className="mb-2">
                <label className="mb-2 block text-[13px] font-semibold">Duration</label>
                <div className="relative">
                  <select
                    value={editLedDuration}
                    onChange={(e) => setEditLedDuration(Number(e.target.value))}
                    className="w-full appearance-none rounded-lg border border-[#3a3a3c] bg-[#2c2c2e] px-4 py-3 pr-10 text-sm text-white focus:border-[#0a84ff] focus:outline-none"
                  >
                    {LED_DURATIONS.map((duration) => (
                      <option key={duration.value} value={duration.value}>
                        {duration.label}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#8e8e93]">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between border-t border-[#3a3a3c] pt-6">
              <Button
                variant="danger"
                onClick={() => deleteConfigMutation.mutate(configAlert.alert_key)}
                disabled={deleteConfigMutation.isPending}
              >
                Delete Alert Key
              </Button>
              <div className="flex gap-3">
                <Button variant="default" onClick={() => setConfigAlert(null)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={() =>
                    updateConfigMutation.mutate({
                      alertKey: configAlert.alert_key,
                      config: {
                        default_priority: editPriority,
                        led_color: editLedColor ?? undefined,
                        led_effect: editLedEffect ?? undefined,
                        led_brightness: editLedBrightness,
                        led_duration: editLedDuration,
                      },
                    })
                  }
                  disabled={updateConfigMutation.isPending}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Trigger Alert Modal */}
      <Modal isOpen={triggerModal} onClose={() => setTriggerModal(false)} title="Trigger Alert">
        <div className="flex flex-col gap-6">
          <div>
            <label className="mb-2 block text-[13px] font-semibold">Alert Key</label>
            <input
              type="text"
              placeholder="e.g., garage_door_open"
              value={newAlertKey}
              onChange={(e) => setNewAlertKey(e.target.value)}
              className="w-full rounded-lg border border-[#3a3a3c] bg-[#2c2c2e] px-4 py-3 font-mono text-sm text-white focus:border-[#0a84ff] focus:outline-none"
            />
            <p className="m-0 mt-2 text-xs text-[#8e8e93]">
              New keys will be automatically registered
            </p>
          </div>

          <div>
            <label className="mb-2 block text-[13px] font-semibold">
              Priority Override (optional)
            </label>
            <div className="flex gap-2">
              <button
                className={`flex-1 cursor-pointer rounded-lg border-2 p-2.5 text-xs font-semibold ${
                  newAlertPriority === null
                    ? 'border-[#0a84ff] text-[#0a84ff]'
                    : 'border-[#3a3a3c] text-[#8e8e93]'
                } bg-[#2c2c2e]`}
                onClick={() => setNewAlertPriority(null)}
              >
                Use Default
              </button>
              {[1, 2, 3, 4, 5].map((p) => (
                <button
                  key={p}
                  className={`cursor-pointer rounded-lg border-2 px-3.5 py-2.5 font-mono font-bold ${
                    newAlertPriority === p ? 'border-current' : 'border-[#3a3a3c]'
                  } bg-[#2c2c2e]`}
                  style={{ color: PRIORITY_CONFIG[p].color }}
                  onClick={() => setNewAlertPriority(p)}
                >
                  P{p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-[13px] font-semibold">Note (optional)</label>
            <textarea
              placeholder="Additional context for this alert..."
              rows={3}
              value={newAlertNote}
              onChange={(e) => setNewAlertNote(e.target.value)}
              className="w-full resize-y rounded-lg border border-[#3a3a3c] bg-[#2c2c2e] px-4 py-3 text-sm text-white focus:border-[#0a84ff] focus:outline-none"
            />
          </div>

          <div className="mt-2 flex justify-end gap-3">
            <Button variant="default" onClick={() => setTriggerModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() =>
                triggerMutation.mutate({
                  alertKey: newAlertKey,
                  priority: newAlertPriority ?? undefined,
                  note: newAlertNote || undefined,
                })
              }
              disabled={!newAlertKey.trim() || triggerMutation.isPending}
            >
              Trigger Alert
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

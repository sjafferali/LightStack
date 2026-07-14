/**
 * Type definitions for alerts
 */

export type LedScope = 'bar' | 'individual'

export interface AlertConfig {
  id: number
  alert_key: string
  name: string | null
  description: string | null
  default_priority: number
  led_scope: LedScope
  led_positions: number[] | null
  led_color: number | null
  led_effect: string | null
  led_brightness: number | null
  led_duration: number | null
  created_at: string
  updated_at: string
  trigger_count: number
}

export interface Alert {
  id: number
  alert_key: string
  is_active: boolean
  priority: number | null
  effective_priority: number
  last_triggered_at: string | null
  created_at: string
  updated_at: string
  config: AlertConfig | null
}

export interface AlertHistory {
  id: number
  alert_key: string
  action: string
  note: string | null
  created_at: string
}

export interface PaginatedAlertHistory {
  items: AlertHistory[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface CurrentDisplay {
  is_all_clear: boolean
  alert: Alert | null
  active_count: number
}

export interface DashboardStats {
  total_alerts_today: number
  critical_today: number
  auto_cleared: number
  active_count: number
  total_alert_keys: number
}

export interface AlertKeySummary {
  alert_key: string
  name: string | null
  default_priority: number
  is_active: boolean
  last_triggered_at: string | null
  trigger_count: number
  led_scope: LedScope
  led_positions: number[] | null
  led_color: number | null
  led_effect: string | null
  led_brightness: number | null
  led_duration: number | null
}

export interface LedSlot {
  led: number
  alert_key: string | null
  effect: string
  color: number
  level: number
  duration: number
}

export interface RenderPlan {
  mode: 'bar' | 'individual' | 'idle'
  is_all_clear: boolean
  bar_alert_key: string | null
  leds: LedSlot[]
  suppressed: string[]
  commands: Record<string, unknown>[]
}

export interface BulkClearResponse {
  cleared_count: number
  alert_keys: string[]
}

export interface AlertTriggerRequest {
  priority?: number
  note?: string
}

export interface AlertConfigCreate {
  alert_key: string
  name?: string
  description?: string
  default_priority?: number
  led_scope?: LedScope
  led_positions?: number[] | null
  led_color?: number
  led_effect?: string
  led_brightness?: number
  led_duration?: number
}

export interface AlertConfigUpdate {
  name?: string
  description?: string
  default_priority?: number
  led_scope?: LedScope
  led_positions?: number[] | null
  led_color?: number
  led_effect?: string
  led_brightness?: number
  led_duration?: number
}

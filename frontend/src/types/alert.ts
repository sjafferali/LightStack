/**
 * Type definitions for alerts
 */

export interface AlertConfig {
  id: number
  alert_key: string
  name: string | null
  description: string | null
  default_priority: number
  led_color: number | null
  led_effect: string | null
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
  led_color?: number
  led_effect?: string
}

export interface AlertConfigUpdate {
  name?: string
  description?: string
  default_priority?: number
  led_color?: number
  led_effect?: string
}

// Priority configuration
export const PRIORITY_CONFIG: Record<
  number,
  { label: string; color: string; bg: string; glow: string }
> = {
  1: {
    label: 'Critical',
    color: '#ff3b30',
    bg: 'rgba(255, 59, 48, 0.15)',
    glow: '0 0 20px rgba(255, 59, 48, 0.5)',
  },
  2: {
    label: 'High',
    color: '#ff9500',
    bg: 'rgba(255, 149, 0, 0.15)',
    glow: '0 0 20px rgba(255, 149, 0, 0.5)',
  },
  3: {
    label: 'Medium',
    color: '#ffcc00',
    bg: 'rgba(255, 204, 0, 0.15)',
    glow: '0 0 20px rgba(255, 204, 0, 0.5)',
  },
  4: {
    label: 'Low',
    color: '#34c759',
    bg: 'rgba(52, 199, 89, 0.15)',
    glow: '0 0 20px rgba(52, 199, 89, 0.5)',
  },
  5: {
    label: 'Info',
    color: '#5ac8fa',
    bg: 'rgba(90, 200, 250, 0.15)',
    glow: '0 0 20px rgba(90, 200, 250, 0.5)',
  },
}

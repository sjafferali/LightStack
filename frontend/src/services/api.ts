/**
 * API service for LightStack
 */

import axios from 'axios';
import type {
  Alert,
  AlertConfig,
  AlertConfigCreate,
  AlertConfigUpdate,
  AlertKeySummary,
  AlertTriggerRequest,
  BulkClearResponse,
  CurrentDisplay,
  DashboardStats,
  PaginatedAlertHistory,
  AlertHistory,
} from '../types/alert';

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// =============================================================================
// Alerts API
// =============================================================================

export const alertsApi = {
  /** Get all alerts */
  getAll: async (activeOnly = false): Promise<Alert[]> => {
    const { data } = await api.get<Alert[]>('/alerts', {
      params: { active_only: activeOnly },
    });
    return data;
  },

  /** Get active alerts sorted by priority */
  getActive: async (): Promise<Alert[]> => {
    const { data } = await api.get<Alert[]>('/alerts/active');
    return data;
  },

  /** Get currently displayed alert */
  getCurrent: async (): Promise<CurrentDisplay> => {
    const { data } = await api.get<CurrentDisplay>('/alerts/current');
    return data;
  },

  /** Get specific alert by key */
  getByKey: async (alertKey: string): Promise<Alert> => {
    const { data } = await api.get<Alert>(`/alerts/${alertKey}`);
    return data;
  },

  /** Trigger an alert */
  trigger: async (alertKey: string, request?: AlertTriggerRequest): Promise<Alert> => {
    const { data } = await api.post<Alert>(`/alerts/${alertKey}/trigger`, request);
    return data;
  },

  /** Clear an alert */
  clear: async (alertKey: string, note?: string): Promise<Alert> => {
    const { data } = await api.post<Alert>(`/alerts/${alertKey}/clear`, { note });
    return data;
  },

  /** Clear all alerts */
  clearAll: async (note?: string): Promise<BulkClearResponse> => {
    const { data } = await api.post<BulkClearResponse>('/alerts/clear-all', { note });
    return data;
  },
};

// =============================================================================
// Alert Configs API
// =============================================================================

export const alertConfigsApi = {
  /** Get all alert configurations */
  getAll: async (): Promise<AlertConfig[]> => {
    const { data } = await api.get<AlertConfig[]>('/alert-configs');
    return data;
  },

  /** Get summary of all alert keys */
  getSummary: async (): Promise<AlertKeySummary[]> => {
    const { data } = await api.get<AlertKeySummary[]>('/alert-configs/summary');
    return data;
  },

  /** Get specific alert configuration */
  getByKey: async (alertKey: string): Promise<AlertConfig> => {
    const { data } = await api.get<AlertConfig>(`/alert-configs/${alertKey}`);
    return data;
  },

  /** Create new alert configuration */
  create: async (config: AlertConfigCreate): Promise<AlertConfig> => {
    const { data } = await api.post<AlertConfig>('/alert-configs', config);
    return data;
  },

  /** Update alert configuration */
  update: async (alertKey: string, config: AlertConfigUpdate): Promise<AlertConfig> => {
    const { data } = await api.put<AlertConfig>(`/alert-configs/${alertKey}`, config);
    return data;
  },

  /** Delete alert configuration */
  delete: async (alertKey: string): Promise<void> => {
    await api.delete(`/alert-configs/${alertKey}`);
  },
};

// =============================================================================
// History API
// =============================================================================

export const historyApi = {
  /** Get paginated alert history */
  getAll: async (params?: {
    alert_key?: string;
    action?: string;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedAlertHistory> => {
    const { data } = await api.get<PaginatedAlertHistory>('/history', { params });
    return data;
  },

  /** Get history for specific alert */
  getByKey: async (alertKey: string, limit = 50): Promise<AlertHistory[]> => {
    const { data } = await api.get<AlertHistory[]>(`/history/${alertKey}`, {
      params: { limit },
    });
    return data;
  },
};

// =============================================================================
// Stats API
// =============================================================================

export const statsApi = {
  /** Get dashboard statistics */
  getDashboard: async (): Promise<DashboardStats> => {
    const { data } = await api.get<DashboardStats>('/stats');
    return data;
  },
};

// =============================================================================
// Health API
// =============================================================================

export const healthApi = {
  /** Check backend health */
  check: async (): Promise<{ status: string; environment: string; version: string }> => {
    const { data } = await api.get('/health');
    return data;
  },
};

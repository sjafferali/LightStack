import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Card, Button, PriorityBadge, Modal } from '../components/ui';
import { alertsApi, statsApi, historyApi } from '../services/api';
import { Alert, AlertHistory, PRIORITY_CONFIG } from '../types/alert';

function formatTime(timestamp: string | null): string {
  if (!timestamp) return '-';
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(timestamp: string | null): string {
  if (!timestamp) return '-';
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function Dashboard() {
  const queryClient = useQueryClient();
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);

  // Queries
  const { data: currentDisplay, isLoading: loadingCurrent } = useQuery({
    queryKey: ['alerts', 'current'],
    queryFn: alertsApi.getCurrent,
    refetchInterval: 5000,
  });

  const { data: activeAlerts = [], isLoading: loadingActive } = useQuery({
    queryKey: ['alerts', 'active'],
    queryFn: alertsApi.getActive,
    refetchInterval: 5000,
  });

  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn: statsApi.getDashboard,
    refetchInterval: 30000,
  });

  const { data: alertHistory } = useQuery({
    queryKey: ['history', selectedAlert?.alert_key],
    queryFn: () =>
      selectedAlert ? historyApi.getByKey(selectedAlert.alert_key, 5) : Promise.resolve([]),
    enabled: !!selectedAlert,
  });

  // Mutations
  const clearMutation = useMutation({
    mutationFn: (alertKey: string) => alertsApi.clear(alertKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      toast.success('Alert cleared');
    },
    onError: () => toast.error('Failed to clear alert'),
  });

  const clearAllMutation = useMutation({
    mutationFn: () => alertsApi.clearAll(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      toast.success(`Cleared ${data.cleared_count} alerts`);
    },
    onError: () => toast.error('Failed to clear alerts'),
  });

  const currentDisplayed = currentDisplay?.alert;
  const isLoading = loadingCurrent || loadingActive;

  return (
    <div className="flex flex-col gap-6">
      {/* Current Display Status */}
      <Card
        className={`bg-gradient-to-br from-[rgba(28,28,30,0.9)] to-[rgba(44,44,46,0.5)] ${
          currentDisplayed ? `border-[${PRIORITY_CONFIG[currentDisplayed.effective_priority]?.color}]` : ''
        }`}
        glow={currentDisplayed ? PRIORITY_CONFIG[currentDisplayed.effective_priority]?.glow : null}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="m-0 mb-2 text-[11px] uppercase tracking-wider text-[#8e8e93] font-mono">
              Currently Displaying on Switches
            </p>
            {isLoading ? (
              <p className="text-lg text-[#8e8e93]">Loading...</p>
            ) : currentDisplayed ? (
              <>
                <h2
                  className="m-0 mb-3 text-[28px] font-bold font-mono"
                  style={{ color: PRIORITY_CONFIG[currentDisplayed.effective_priority]?.color }}
                >
                  {currentDisplayed.alert_key}
                </h2>
                <PriorityBadge priority={currentDisplayed.effective_priority} />
              </>
            ) : (
              <h2 className="m-0 text-[28px] font-bold text-[#34c759]">All Clear &#10003;</h2>
            )}
          </div>
          <div
            className={`flex h-20 w-20 items-center justify-center rounded-xl text-4xl ${
              currentDisplayed ? 'animate-glow' : ''
            }`}
            style={{
              background: currentDisplayed
                ? `linear-gradient(135deg, ${PRIORITY_CONFIG[currentDisplayed.effective_priority]?.color}40 0%, ${PRIORITY_CONFIG[currentDisplayed.effective_priority]?.color}10 100%)`
                : 'linear-gradient(135deg, #34c75940 0%, #34c75910 100%)',
            }}
          >
            {currentDisplayed ? '💡' : '✨'}
          </div>
        </div>
      </Card>

      {/* Active Alerts */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="m-0 flex items-center text-lg font-bold">
            Active Alerts
            <span
              className={`ml-3 rounded-xl px-2.5 py-1 text-xs font-bold font-mono ${
                activeAlerts.length > 0
                  ? 'bg-[rgba(255,59,48,0.2)] text-[#ff3b30]'
                  : 'bg-[rgba(52,199,89,0.2)] text-[#34c759]'
              }`}
            >
              {activeAlerts.length}
            </span>
          </h2>
          <Button
            variant="danger"
            size="small"
            onClick={() => clearAllMutation.mutate()}
            disabled={activeAlerts.length === 0 || clearAllMutation.isPending}
          >
            Clear All
          </Button>
        </div>

        {activeAlerts.length === 0 ? (
          <Card className="py-12 text-center">
            <p className="text-sm text-[#8e8e93]">No active alerts</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {activeAlerts.map((alert, idx) => (
              <Card
                key={alert.alert_key}
                className="grid grid-cols-[1fr_auto_auto] items-center gap-5 animate-slide-up"
                style={{
                  borderLeft: `4px solid ${PRIORITY_CONFIG[alert.effective_priority]?.color}`,
                  animationDelay: `${idx * 0.1}s`,
                }}
              >
                <div>
                  <div className="mb-2 flex items-center gap-3">
                    <h3 className="m-0 text-base font-semibold font-mono">{alert.alert_key}</h3>
                    <PriorityBadge priority={alert.effective_priority} size="small" />
                    {currentDisplayed?.alert_key === alert.alert_key && (
                      <span className="rounded bg-[rgba(10,132,255,0.2)] px-2 py-0.5 text-[10px] font-semibold text-[#0a84ff] font-mono">
                        DISPLAYING
                      </span>
                    )}
                  </div>
                  <p className="m-0 text-[13px] text-[#8e8e93]">
                    {alert.config?.name || alert.config?.description || 'No description'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="m-0 text-xs text-[#8e8e93] font-mono">Triggered</p>
                  <p className="m-0 mt-1 text-sm font-semibold">
                    {formatTime(alert.last_triggered_at)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="small" variant="ghost" onClick={() => setSelectedAlert(alert)}>
                    Details
                  </Button>
                  <Button
                    size="small"
                    variant="danger"
                    onClick={() => clearMutation.mutate(alert.alert_key)}
                    disabled={clearMutation.isPending}
                  >
                    Clear
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Alerts Today', value: stats?.total_alerts_today ?? '-', color: '#0a84ff' },
          { label: 'Active Now', value: stats?.active_count ?? '-', color: '#34c759' },
          { label: 'Critical Today', value: stats?.critical_today ?? '-', color: '#ff3b30' },
          { label: 'Auto-Cleared', value: stats?.auto_cleared ?? '-', color: '#8e8e93' },
        ].map((stat) => (
          <Card key={stat.label} className="text-center">
            <p className="m-0 mb-2 text-[11px] uppercase tracking-wide text-[#8e8e93]">
              {stat.label}
            </p>
            <p className="m-0 text-[32px] font-bold font-mono" style={{ color: stat.color }}>
              {stat.value}
            </p>
          </Card>
        ))}
      </div>

      {/* Alert Details Modal */}
      <Modal
        isOpen={!!selectedAlert}
        onClose={() => setSelectedAlert(null)}
        title={selectedAlert?.alert_key || ''}
      >
        {selectedAlert && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <PriorityBadge priority={selectedAlert.effective_priority} />
              <span className="rounded bg-[rgba(52,199,89,0.2)] px-2.5 py-1 text-[11px] font-semibold uppercase text-[#34c759] font-mono">
                ACTIVE
              </span>
            </div>

            {selectedAlert.config?.description && (
              <div className="rounded-lg bg-[#2c2c2e] p-4">
                <p className="m-0 mb-2 text-[11px] uppercase tracking-wide text-[#8e8e93]">
                  Description
                </p>
                <p className="m-0 text-sm">{selectedAlert.config.description}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-[#2c2c2e] p-4">
                <p className="m-0 mb-1 text-[11px] uppercase text-[#8e8e93]">Last Triggered</p>
                <p className="m-0 text-sm font-mono">
                  {formatDate(selectedAlert.last_triggered_at)}
                </p>
              </div>
              <div className="rounded-lg bg-[#2c2c2e] p-4">
                <p className="m-0 mb-1 text-[11px] uppercase text-[#8e8e93]">Trigger Count</p>
                <p className="m-0 text-sm font-mono">{selectedAlert.config?.trigger_count ?? 0}</p>
              </div>
            </div>

            <div>
              <p className="m-0 mb-3 text-[13px] font-semibold">Recent History</p>
              <div className="overflow-hidden rounded-lg bg-[#2c2c2e]">
                {alertHistory && alertHistory.length > 0 ? (
                  alertHistory.map((entry: AlertHistory, idx: number) => (
                    <div
                      key={entry.id}
                      className={`flex items-center justify-between px-4 py-3 ${
                        idx < alertHistory.length - 1 ? 'border-b border-[#3a3a3c]' : ''
                      }`}
                    >
                      <span className="text-xs text-[#8e8e93] font-mono">
                        {formatDate(entry.created_at)}
                      </span>
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${
                          entry.action === 'triggered'
                            ? 'bg-[rgba(255,149,0,0.2)] text-[#ff9500]'
                            : 'bg-[rgba(52,199,89,0.2)] text-[#34c759]'
                        }`}
                      >
                        {entry.action}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="p-4 text-center text-sm text-[#8e8e93]">No history</p>
                )}
              </div>
            </div>

            <div className="mt-2 flex justify-end gap-3">
              <Button variant="default" onClick={() => setSelectedAlert(null)}>
                Close
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  clearMutation.mutate(selectedAlert.alert_key);
                  setSelectedAlert(null);
                }}
              >
                Clear Alert
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

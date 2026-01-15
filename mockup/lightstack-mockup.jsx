import { useState } from 'react';

// Mock data
const mockActiveAlerts = [
  { alert_key: 'front_door_open', priority: 1, last_triggered: '2025-01-15T14:32:00', note: 'Front door left open' },
  { alert_key: 'garage_motion', priority: 2, last_triggered: '2025-01-15T14:28:00', note: 'Motion detected in garage' },
  { alert_key: 'washer_done', priority: 4, last_triggered: '2025-01-15T13:45:00', note: 'Washing machine cycle complete' },
];

const mockAllAlerts = [
  { alert_key: 'front_door_open', default_priority: 1, last_triggered: '2025-01-15T14:32:00', trigger_count: 47 },
  { alert_key: 'garage_motion', default_priority: 2, last_triggered: '2025-01-15T14:28:00', trigger_count: 156 },
  { alert_key: 'washer_done', default_priority: 4, last_triggered: '2025-01-15T13:45:00', trigger_count: 23 },
  { alert_key: 'dryer_done', default_priority: 4, last_triggered: '2025-01-14T18:20:00', trigger_count: 19 },
  { alert_key: 'back_door_open', default_priority: 1, last_triggered: '2025-01-13T09:15:00', trigger_count: 31 },
  { alert_key: 'mailbox_opened', default_priority: 3, last_triggered: '2025-01-15T11:02:00', trigger_count: 89 },
  { alert_key: 'smoke_detected', default_priority: 1, last_triggered: '2024-12-01T07:30:00', trigger_count: 2 },
  { alert_key: 'water_leak', default_priority: 1, last_triggered: '2024-11-15T22:45:00', trigger_count: 1 },
];

const mockHistory = [
  { timestamp: '2025-01-15T14:32:00', alert_key: 'front_door_open', action: 'triggered', note: 'Front door sensor activated' },
  { timestamp: '2025-01-15T14:28:00', alert_key: 'garage_motion', action: 'triggered', note: 'PIR sensor zone 2' },
  { timestamp: '2025-01-15T14:15:00', alert_key: 'mailbox_opened', action: 'cleared', note: 'Auto-cleared after 30 min' },
  { timestamp: '2025-01-15T13:45:00', alert_key: 'washer_done', action: 'triggered', note: 'Cycle: Heavy Duty' },
  { timestamp: '2025-01-15T11:45:00', alert_key: 'mailbox_opened', action: 'triggered', note: 'Mailbox door opened' },
  { timestamp: '2025-01-15T09:30:00', alert_key: 'front_door_open', action: 'cleared', note: 'Manual clear' },
  { timestamp: '2025-01-15T09:12:00', alert_key: 'front_door_open', action: 'triggered', note: 'Front door sensor activated' },
];

const priorityConfig = {
  1: { label: 'Critical', color: '#ff3b30', bg: 'rgba(255, 59, 48, 0.15)', glow: '0 0 20px rgba(255, 59, 48, 0.5)' },
  2: { label: 'High', color: '#ff9500', bg: 'rgba(255, 149, 0, 0.15)', glow: '0 0 20px rgba(255, 149, 0, 0.5)' },
  3: { label: 'Medium', color: '#ffcc00', bg: 'rgba(255, 204, 0, 0.15)', glow: '0 0 20px rgba(255, 204, 0, 0.5)' },
  4: { label: 'Low', color: '#34c759', bg: 'rgba(52, 199, 89, 0.15)', glow: '0 0 20px rgba(52, 199, 89, 0.5)' },
  5: { label: 'Info', color: '#5ac8fa', bg: 'rgba(90, 200, 250, 0.15)', glow: '0 0 20px rgba(90, 200, 250, 0.5)' },
};

const PriorityBadge = ({ priority, size = 'normal' }) => {
  const config = priorityConfig[priority];
  const sizeStyles = size === 'small'
    ? { padding: '2px 8px', fontSize: '10px' }
    : { padding: '4px 12px', fontSize: '11px' };

  return (
    <span style={{
      ...sizeStyles,
      background: config.bg,
      color: config.color,
      border: `1px solid ${config.color}`,
      borderRadius: '4px',
      fontWeight: 700,
      letterSpacing: '0.5px',
      textTransform: 'uppercase',
      fontFamily: "'JetBrains Mono', monospace",
    }}>
      P{priority} · {config.label}
    </span>
  );
};

const StatusIndicator = ({ active }) => (
  <div style={{
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    background: active ? '#34c759' : '#48484a',
    boxShadow: active ? '0 0 10px #34c759, 0 0 20px rgba(52, 199, 89, 0.5)' : 'none',
    animation: active ? 'pulse 2s ease-in-out infinite' : 'none',
  }} />
);

const Button = ({ children, variant = 'default', size = 'normal', onClick, style = {} }) => {
  const baseStyles = {
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontFamily: "'JetBrains Mono', monospace",
    fontWeight: 600,
    letterSpacing: '0.3px',
    transition: 'all 0.2s ease',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
  };

  const sizeStyles = size === 'small'
    ? { padding: '6px 12px', fontSize: '11px' }
    : { padding: '10px 18px', fontSize: '12px' };

  const variantStyles = {
    default: { background: '#2c2c2e', color: '#fff', border: '1px solid #3a3a3c' },
    primary: { background: '#0a84ff', color: '#fff' },
    danger: { background: 'rgba(255, 59, 48, 0.2)', color: '#ff3b30', border: '1px solid rgba(255, 59, 48, 0.3)' },
    success: { background: 'rgba(52, 199, 89, 0.2)', color: '#34c759', border: '1px solid rgba(52, 199, 89, 0.3)' },
    ghost: { background: 'transparent', color: '#8e8e93', border: '1px solid transparent' },
  };

  return (
    <button
      onClick={onClick}
      style={{ ...baseStyles, ...sizeStyles, ...variantStyles[variant], ...style }}
      onMouseEnter={(e) => e.target.style.opacity = '0.8'}
      onMouseLeave={(e) => e.target.style.opacity = '1'}
    >
      {children}
    </button>
  );
};

const Card = ({ children, style = {}, glow = null }) => (
  <div style={{
    background: '#1c1c1e',
    borderRadius: '12px',
    border: '1px solid #2c2c2e',
    padding: '20px',
    boxShadow: glow || 'none',
    ...style,
  }}>
    {children}
  </div>
);

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      animation: 'fadeIn 0.2s ease',
    }} onClick={onClose}>
      <div style={{
        background: '#1c1c1e',
        borderRadius: '16px',
        border: '1px solid #2c2c2e',
        width: '90%',
        maxWidth: '600px',
        maxHeight: '80vh',
        overflow: 'hidden',
        animation: 'slideUp 0.3s ease',
      }} onClick={e => e.stopPropagation()}>
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #2c2c2e',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>{title}</h2>
          <button onClick={onClose} style={{
            background: 'none',
            border: 'none',
            color: '#8e8e93',
            fontSize: '24px',
            cursor: 'pointer',
            padding: '0 8px',
          }}>×</button>
        </div>
        <div style={{ padding: '24px', overflowY: 'auto', maxHeight: 'calc(80vh - 70px)' }}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default function LightStackDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [configAlert, setConfigAlert] = useState(null);
  const [triggerModal, setTriggerModal] = useState(false);

  const currentDisplayed = mockActiveAlerts.length > 0
    ? mockActiveAlerts.reduce((a, b) => a.priority < b.priority ? a : b)
    : null;

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1c 50%, #0d0d0f 100%)',
      color: '#ffffff',
      fontFamily: "'Inter', -apple-system, sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap');

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        @keyframes glow {
          0%, 100% { box-shadow: 0 0 20px rgba(255, 59, 48, 0.3); }
          50% { box-shadow: 0 0 40px rgba(255, 59, 48, 0.6); }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        * { box-sizing: border-box; }

        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: #1c1c1e; }
        ::-webkit-scrollbar-thumb { background: #3a3a3c; border-radius: 4px; }
      `}</style>

      {/* Header */}
      <header style={{
        background: 'rgba(28, 28, 30, 0.8)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid #2c2c2e',
        padding: '16px 32px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: 'linear-gradient(135deg, #ff9500 0%, #ff3b30 100%)',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              boxShadow: '0 4px 20px rgba(255, 149, 0, 0.3)',
            }}>
              ⚡
            </div>
            <div>
              <h1 style={{
                margin: 0,
                fontSize: '22px',
                fontWeight: 700,
                letterSpacing: '-0.5px',
              }}>LightStack</h1>
              <p style={{
                margin: 0,
                fontSize: '11px',
                color: '#8e8e93',
                fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: '0.5px',
              }}>ALERT PRIORITY MANAGER</p>
            </div>
          </div>

          <nav style={{ display: 'flex', gap: '8px' }}>
            {['dashboard', 'alerts', 'history'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '10px 20px',
                  background: activeTab === tab ? '#2c2c2e' : 'transparent',
                  border: activeTab === tab ? '1px solid #3a3a3c' : '1px solid transparent',
                  borderRadius: '8px',
                  color: activeTab === tab ? '#fff' : '#8e8e93',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  transition: 'all 0.2s ease',
                }}
              >
                {tab}
              </button>
            ))}
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              background: '#2c2c2e',
              borderRadius: '8px',
              fontSize: '12px',
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              <StatusIndicator active={true} />
              <span style={{ color: '#8e8e93' }}>HA Connected</span>
            </div>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '32px' }}>
        {activeTab === 'dashboard' && (
          <div style={{ display: 'grid', gap: '24px' }}>
            {/* Current Display Status */}
            <Card style={{
              background: 'linear-gradient(135deg, rgba(28, 28, 30, 0.9) 0%, rgba(44, 44, 46, 0.5) 100%)',
              border: currentDisplayed ? `1px solid ${priorityConfig[currentDisplayed.priority].color}` : '1px solid #2c2c2e',
            }} glow={currentDisplayed ? priorityConfig[currentDisplayed.priority].glow : null}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{
                    margin: '0 0 8px 0',
                    fontSize: '11px',
                    color: '#8e8e93',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    fontFamily: "'JetBrains Mono', monospace",
                  }}>Currently Displaying on Switches</p>
                  {currentDisplayed ? (
                    <>
                      <h2 style={{
                        margin: '0 0 12px 0',
                        fontSize: '28px',
                        fontWeight: 700,
                        color: priorityConfig[currentDisplayed.priority].color,
                        fontFamily: "'JetBrains Mono', monospace",
                      }}>{currentDisplayed.alert_key}</h2>
                      <PriorityBadge priority={currentDisplayed.priority} />
                    </>
                  ) : (
                    <h2 style={{
                      margin: 0,
                      fontSize: '28px',
                      fontWeight: 700,
                      color: '#34c759',
                    }}>All Clear ✓</h2>
                  )}
                </div>
                <div style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '12px',
                  background: currentDisplayed
                    ? `linear-gradient(135deg, ${priorityConfig[currentDisplayed.priority].color}40 0%, ${priorityConfig[currentDisplayed.priority].color}10 100%)`
                    : 'linear-gradient(135deg, #34c75940 0%, #34c75910 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '36px',
                  animation: currentDisplayed ? 'glow 2s ease-in-out infinite' : 'none',
                }}>
                  {currentDisplayed ? '💡' : '✨'}
                </div>
              </div>
            </Card>

            {/* Active Alerts */}
            <div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
              }}>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>
                  Active Alerts
                  <span style={{
                    marginLeft: '12px',
                    padding: '4px 10px',
                    background: mockActiveAlerts.length > 0 ? 'rgba(255, 59, 48, 0.2)' : 'rgba(52, 199, 89, 0.2)',
                    color: mockActiveAlerts.length > 0 ? '#ff3b30' : '#34c759',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 700,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}>{mockActiveAlerts.length}</span>
                </h2>
                <Button variant="danger" size="small">Clear All</Button>
              </div>

              {mockActiveAlerts.length === 0 ? (
                <Card style={{ textAlign: 'center', padding: '48px' }}>
                  <p style={{ color: '#8e8e93', fontSize: '14px' }}>No active alerts</p>
                </Card>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {mockActiveAlerts.map((alert, idx) => (
                    <Card
                      key={alert.alert_key}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr auto auto',
                        alignItems: 'center',
                        gap: '20px',
                        borderLeft: `4px solid ${priorityConfig[alert.priority].color}`,
                        animation: idx === 0 ? 'slideUp 0.3s ease' : `slideUp 0.3s ease ${idx * 0.1}s both`,
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                          <h3 style={{
                            margin: 0,
                            fontSize: '16px',
                            fontWeight: 600,
                            fontFamily: "'JetBrains Mono', monospace",
                          }}>{alert.alert_key}</h3>
                          <PriorityBadge priority={alert.priority} size="small" />
                          {currentDisplayed?.alert_key === alert.alert_key && (
                            <span style={{
                              padding: '2px 8px',
                              background: 'rgba(10, 132, 255, 0.2)',
                              color: '#0a84ff',
                              borderRadius: '4px',
                              fontSize: '10px',
                              fontWeight: 600,
                              fontFamily: "'JetBrains Mono', monospace",
                            }}>DISPLAYING</span>
                          )}
                        </div>
                        <p style={{
                          margin: 0,
                          fontSize: '13px',
                          color: '#8e8e93',
                        }}>{alert.note}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{
                          margin: 0,
                          fontSize: '12px',
                          color: '#8e8e93',
                          fontFamily: "'JetBrains Mono', monospace",
                        }}>Triggered</p>
                        <p style={{
                          margin: '4px 0 0 0',
                          fontSize: '14px',
                          fontWeight: 600,
                        }}>{formatTime(alert.last_triggered)}</p>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <Button size="small" variant="ghost" onClick={() => setSelectedAlert(alert)}>
                          Details
                        </Button>
                        <Button size="small" variant="danger">
                          Clear
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              {[
                { label: 'Total Alerts Today', value: '12', color: '#0a84ff' },
                { label: 'Avg Response Time', value: '4.2m', color: '#34c759' },
                { label: 'Critical Today', value: '2', color: '#ff3b30' },
                { label: 'Auto-Cleared', value: '8', color: '#8e8e93' },
              ].map(stat => (
                <Card key={stat.label} style={{ textAlign: 'center' }}>
                  <p style={{
                    margin: '0 0 8px 0',
                    fontSize: '11px',
                    color: '#8e8e93',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}>{stat.label}</p>
                  <p style={{
                    margin: 0,
                    fontSize: '32px',
                    fontWeight: 700,
                    color: stat.color,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}>{stat.value}</p>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'alerts' && (
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
            }}>
              <div>
                <h2 style={{ margin: '0 0 4px 0', fontSize: '20px', fontWeight: 700 }}>All Alert Keys</h2>
                <p style={{ margin: 0, color: '#8e8e93', fontSize: '13px' }}>
                  Configure priorities and manage all registered alerts
                </p>
              </div>
              <Button variant="primary" onClick={() => setTriggerModal(true)}>
                + Trigger Alert
              </Button>
            </div>

            <Card style={{ padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#2c2c2e' }}>
                    {['Status', 'Alert Key', 'Default Priority', 'Last Triggered', 'Total Triggers', 'Actions'].map(header => (
                      <th key={header} style={{
                        padding: '14px 20px',
                        textAlign: 'left',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: '#8e8e93',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        borderBottom: '1px solid #3a3a3c',
                      }}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mockAllAlerts.map((alert, idx) => {
                    const isActive = mockActiveAlerts.some(a => a.alert_key === alert.alert_key);
                    return (
                      <tr
                        key={alert.alert_key}
                        style={{
                          borderBottom: idx < mockAllAlerts.length - 1 ? '1px solid #2c2c2e' : 'none',
                          background: isActive ? 'rgba(255, 59, 48, 0.05)' : 'transparent',
                        }}
                      >
                        <td style={{ padding: '16px 20px' }}>
                          <StatusIndicator active={isActive} />
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <span style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontWeight: 500,
                          }}>{alert.alert_key}</span>
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <PriorityBadge priority={alert.default_priority} size="small" />
                        </td>
                        <td style={{ padding: '16px 20px', color: '#8e8e93', fontSize: '13px' }}>
                          {formatDate(alert.last_triggered)}
                        </td>
                        <td style={{
                          padding: '16px 20px',
                          fontFamily: "'JetBrains Mono', monospace",
                          fontWeight: 600,
                        }}>{alert.trigger_count}</td>
                        <td style={{ padding: '16px 20px' }}>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <Button size="small" variant="ghost" onClick={() => setConfigAlert(alert)}>
                              Configure
                            </Button>
                            <Button size="small" variant="success">
                              Trigger
                            </Button>
                            {isActive && (
                              <Button size="small" variant="danger">
                                Clear
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          </div>
        )}

        {activeTab === 'history' && (
          <div>
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ margin: '0 0 4px 0', fontSize: '20px', fontWeight: 700 }}>Alert History</h2>
              <p style={{ margin: 0, color: '#8e8e93', fontSize: '13px' }}>
                Complete log of all alert triggers and clears
              </p>
            </div>

            <Card style={{ padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#2c2c2e' }}>
                    {['Timestamp', 'Alert Key', 'Action', 'Note'].map(header => (
                      <th key={header} style={{
                        padding: '14px 20px',
                        textAlign: 'left',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: '#8e8e93',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        borderBottom: '1px solid #3a3a3c',
                      }}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mockHistory.map((entry, idx) => (
                    <tr
                      key={idx}
                      style={{ borderBottom: idx < mockHistory.length - 1 ? '1px solid #2c2c2e' : 'none' }}
                    >
                      <td style={{
                        padding: '16px 20px',
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: '13px',
                        color: '#8e8e93',
                      }}>{formatDate(entry.timestamp)}</td>
                      <td style={{
                        padding: '16px 20px',
                        fontFamily: "'JetBrains Mono', monospace",
                        fontWeight: 500,
                      }}>{entry.alert_key}</td>
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{
                          padding: '4px 10px',
                          background: entry.action === 'triggered' ? 'rgba(255, 149, 0, 0.2)' : 'rgba(52, 199, 89, 0.2)',
                          color: entry.action === 'triggered' ? '#ff9500' : '#34c759',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          fontFamily: "'JetBrains Mono', monospace",
                        }}>{entry.action}</span>
                      </td>
                      <td style={{
                        padding: '16px 20px',
                        color: '#8e8e93',
                        fontSize: '13px',
                      }}>{entry.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        )}
      </main>

      {/* Alert Details Modal */}
      <Modal
        isOpen={!!selectedAlert}
        onClose={() => setSelectedAlert(null)}
        title={selectedAlert?.alert_key || ''}
      >
        {selectedAlert && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <PriorityBadge priority={selectedAlert.priority} />
              <span style={{
                padding: '4px 10px',
                background: 'rgba(52, 199, 89, 0.2)',
                color: '#34c759',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 600,
                fontFamily: "'JetBrains Mono', monospace",
              }}>ACTIVE</span>
            </div>

            <div style={{
              background: '#2c2c2e',
              borderRadius: '8px',
              padding: '16px',
            }}>
              <p style={{
                margin: '0 0 8px 0',
                fontSize: '11px',
                color: '#8e8e93',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>Current Note</p>
              <p style={{ margin: 0, fontSize: '14px' }}>{selectedAlert.note}</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{
                background: '#2c2c2e',
                borderRadius: '8px',
                padding: '16px',
              }}>
                <p style={{
                  margin: '0 0 4px 0',
                  fontSize: '11px',
                  color: '#8e8e93',
                  textTransform: 'uppercase',
                }}>Last Triggered</p>
                <p style={{
                  margin: 0,
                  fontSize: '14px',
                  fontFamily: "'JetBrains Mono', monospace",
                }}>{formatDate(selectedAlert.last_triggered)}</p>
              </div>
              <div style={{
                background: '#2c2c2e',
                borderRadius: '8px',
                padding: '16px',
              }}>
                <p style={{
                  margin: '0 0 4px 0',
                  fontSize: '11px',
                  color: '#8e8e93',
                  textTransform: 'uppercase',
                }}>Duration Active</p>
                <p style={{
                  margin: 0,
                  fontSize: '14px',
                  fontFamily: "'JetBrains Mono', monospace",
                }}>47 minutes</p>
              </div>
            </div>

            <div>
              <p style={{
                margin: '0 0 12px 0',
                fontSize: '13px',
                fontWeight: 600,
              }}>Recent History for this Alert</p>
              <div style={{
                background: '#2c2c2e',
                borderRadius: '8px',
                overflow: 'hidden',
              }}>
                {mockHistory.filter(h => h.alert_key === selectedAlert.alert_key).slice(0, 5).map((entry, idx) => (
                  <div key={idx} style={{
                    padding: '12px 16px',
                    borderBottom: idx < 4 ? '1px solid #3a3a3c' : 'none',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <span style={{
                      fontSize: '12px',
                      color: '#8e8e93',
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>{formatDate(entry.timestamp)}</span>
                    <span style={{
                      padding: '2px 8px',
                      background: entry.action === 'triggered' ? 'rgba(255, 149, 0, 0.2)' : 'rgba(52, 199, 89, 0.2)',
                      color: entry.action === 'triggered' ? '#ff9500' : '#34c759',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                    }}>{entry.action}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <Button variant="default" onClick={() => setSelectedAlert(null)}>Close</Button>
              <Button variant="danger">Clear Alert</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Configure Alert Modal */}
      <Modal
        isOpen={!!configAlert}
        onClose={() => setConfigAlert(null)}
        title={`Configure: ${configAlert?.alert_key || ''}`}
      >
        {configAlert && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '13px',
                fontWeight: 600,
              }}>Default Priority</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[1, 2, 3, 4, 5].map(p => (
                  <button
                    key={p}
                    style={{
                      flex: 1,
                      padding: '12px',
                      background: configAlert.default_priority === p ? priorityConfig[p].bg : '#2c2c2e',
                      border: configAlert.default_priority === p
                        ? `2px solid ${priorityConfig[p].color}`
                        : '2px solid #3a3a3c',
                      borderRadius: '8px',
                      color: priorityConfig[p].color,
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontFamily: "'JetBrains Mono', monospace",
                      transition: 'all 0.2s ease',
                    }}
                  >
                    P{p}
                    <div style={{ fontSize: '10px', marginTop: '4px', opacity: 0.8 }}>
                      {priorityConfig[p].label}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '13px',
                fontWeight: 600,
              }}>LED Color Override (optional)</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {['#ff3b30', '#ff9500', '#ffcc00', '#34c759', '#0a84ff', '#af52de', '#ff2d55'].map(color => (
                  <button
                    key={color}
                    style={{
                      width: '40px',
                      height: '40px',
                      background: color,
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      boxShadow: `0 4px 12px ${color}40`,
                    }}
                  />
                ))}
                <button style={{
                  width: '40px',
                  height: '40px',
                  background: '#2c2c2e',
                  border: '2px dashed #3a3a3c',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  color: '#8e8e93',
                  fontSize: '18px',
                }}>×</button>
              </div>
            </div>

            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '13px',
                fontWeight: 600,
              }}>Auto-Clear After (minutes)</label>
              <input
                type="number"
                placeholder="Leave empty for manual clear only"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: '#2c2c2e',
                  border: '1px solid #3a3a3c',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '14px',
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between', marginTop: '8px' }}>
              <Button variant="danger">Delete Alert Key</Button>
              <div style={{ display: 'flex', gap: '12px' }}>
                <Button variant="default" onClick={() => setConfigAlert(null)}>Cancel</Button>
                <Button variant="primary">Save Changes</Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Trigger Alert Modal */}
      <Modal
        isOpen={triggerModal}
        onClose={() => setTriggerModal(false)}
        title="Trigger Alert"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '13px',
              fontWeight: 600,
            }}>Alert Key</label>
            <input
              type="text"
              placeholder="e.g., garage_door_open"
              style={{
                width: '100%',
                padding: '12px 16px',
                background: '#2c2c2e',
                border: '1px solid #3a3a3c',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '14px',
                fontFamily: "'JetBrains Mono', monospace",
              }}
            />
            <p style={{
              margin: '8px 0 0 0',
              fontSize: '12px',
              color: '#8e8e93',
            }}>New keys will be automatically registered</p>
          </div>

          <div>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '13px',
              fontWeight: 600,
            }}>Priority Override (optional)</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button style={{
                flex: 1,
                padding: '10px',
                background: '#2c2c2e',
                border: '2px solid #0a84ff',
                borderRadius: '8px',
                color: '#0a84ff',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '12px',
              }}>Use Default</button>
              {[1, 2, 3, 4, 5].map(p => (
                <button
                  key={p}
                  style={{
                    padding: '10px 14px',
                    background: '#2c2c2e',
                    border: '2px solid #3a3a3c',
                    borderRadius: '8px',
                    color: priorityConfig[p].color,
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >P{p}</button>
              ))}
            </div>
          </div>

          <div>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '13px',
              fontWeight: 600,
            }}>Note (optional)</label>
            <textarea
              placeholder="Additional context for this alert..."
              rows={3}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: '#2c2c2e',
                border: '1px solid #3a3a3c',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '14px',
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
            <Button variant="default" onClick={() => setTriggerModal(false)}>Cancel</Button>
            <Button variant="primary">Trigger Alert</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

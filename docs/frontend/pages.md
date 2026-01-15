# Frontend Pages

This document describes each page in the LightStack frontend application.

## Dashboard (`/`)

The main dashboard page showing current alert status and active alerts.

**Location**: `pages/Dashboard.tsx`

### Sections

#### Current Display

Shows the alert currently being displayed on switches.

- Large alert key with priority color
- Priority badge
- Animated glow effect based on priority
- "All Clear" state when no alerts active

#### Active Alerts List

Lists all currently active alerts sorted by priority.

Features:
- Color-coded left border by priority
- "DISPLAYING" badge on current alert
- Details button to open modal
- Clear button for individual alerts
- Clear All button in header

#### Quick Stats

Four stat cards showing:
- Total Alerts Today
- Active Now
- Critical Today
- Auto-Cleared

### Data Fetching

```typescript
// Current display - polls every 5 seconds
const { data: currentDisplay } = useQuery({
  queryKey: ['alerts', 'current'],
  queryFn: alertsApi.getCurrent,
  refetchInterval: 5000,
});

// Active alerts - polls every 5 seconds
const { data: activeAlerts } = useQuery({
  queryKey: ['alerts', 'active'],
  queryFn: alertsApi.getActive,
  refetchInterval: 5000,
});

// Stats - polls every 30 seconds
const { data: stats } = useQuery({
  queryKey: ['stats'],
  queryFn: statsApi.getDashboard,
  refetchInterval: 30000,
});
```

### Modals

#### Alert Details Modal

Opened by clicking "Details" on an alert.

Shows:
- Priority badge and active status
- Description (if available)
- Last triggered timestamp
- Trigger count
- Recent history entries (last 5)
- Close and Clear buttons

---

## Alerts (`/alerts`)

Alert management page showing all registered alert keys.

**Location**: `pages/Alerts.tsx`

### Sections

#### Header

- Title and description
- "Trigger Alert" button

#### Alerts Table

Columns:
- Status (green/gray indicator)
- Alert Key
- Default Priority (badge)
- Last Triggered (timestamp)
- Total Triggers (count)
- Actions (Configure, Trigger, Clear)

Features:
- Active rows have subtle red background
- Click Configure to edit settings
- Click Trigger to manually trigger
- Click Clear (if active) to clear

### Modals

#### Configure Modal

Edit alert configuration:

- Priority selector (P1-P5 buttons)
- Visual feedback on selection
- Delete Alert Key button
- Cancel and Save buttons

```typescript
const updateConfigMutation = useMutation({
  mutationFn: ({ alertKey, config }) =>
    alertConfigsApi.update(alertKey, config),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['alert-configs'] });
    toast.success('Configuration updated');
  },
});
```

#### Trigger Alert Modal

Manually trigger an alert:

- Alert Key input (required)
- Priority Override buttons (optional)
- Note textarea (optional)
- Auto-registers new alert keys

```typescript
const triggerMutation = useMutation({
  mutationFn: ({ alertKey, priority, note }) =>
    alertsApi.trigger(alertKey, { priority, note }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['alerts'] });
    queryClient.invalidateQueries({ queryKey: ['alert-configs'] });
    toast.success('Alert triggered');
  },
});
```

---

## History (`/history`)

Alert history page with filtering and pagination.

**Location**: `pages/History.tsx`

### Sections

#### Filters

- Alert key text input
- Action dropdown (All/Triggered/Cleared)

#### History Table

Columns:
- Timestamp (formatted)
- Alert Key
- Action (colored badge)
- Note

Features:
- Paginated (50 items per page)
- Filters reset pagination to page 1
- Newest entries first

#### Pagination

- Previous/Next buttons
- "Page X of Y" indicator
- Disabled states at boundaries

### Data Fetching

```typescript
const { data, isLoading } = useQuery({
  queryKey: ['history', page, filterKey, filterAction],
  queryFn: () =>
    historyApi.getAll({
      page,
      page_size: 50,
      alert_key: filterKey || undefined,
      action: filterAction || undefined,
    }),
});
```

---

## Routing

Routes are defined in `App.tsx`:

```typescript
<BrowserRouter>
  <Layout>
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/alerts" element={<Alerts />} />
      <Route path="/history" element={<History />} />
    </Routes>
  </Layout>
</BrowserRouter>
```

---

## Common Patterns

### Date Formatting

```typescript
function formatTime(timestamp: string | null): string {
  if (!timestamp) return '-';
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
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
```

### Mutation Handlers

```typescript
const clearMutation = useMutation({
  mutationFn: (alertKey: string) => alertsApi.clear(alertKey),
  onSuccess: () => {
    // Invalidate all related queries
    queryClient.invalidateQueries({ queryKey: ['alerts'] });
    queryClient.invalidateQueries({ queryKey: ['stats'] });
    toast.success('Alert cleared');
  },
  onError: () => toast.error('Failed to clear alert'),
});
```

### Button Disabled States

```typescript
<Button
  onClick={() => clearMutation.mutate(alertKey)}
  disabled={clearMutation.isPending}
>
  {clearMutation.isPending ? 'Clearing...' : 'Clear'}
</Button>
```

---

## Responsive Design

The UI is designed for:
- Desktop browsers (primary)
- Tablets (secondary)
- Wall-mounted displays

Key breakpoints:
- Stats grid: 4 columns on desktop, stacks on mobile
- Tables: Horizontal scroll on small screens
- Modals: 90% width with max-width constraint

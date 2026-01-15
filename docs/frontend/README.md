# Frontend Overview

LightStack's frontend is a modern React application built with TypeScript, providing a real-time dashboard for monitoring and managing alerts.

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.3 | UI framework |
| TypeScript | 5.7 | Type safety |
| Vite | 6.0 | Build tool |
| Tailwind CSS | 3.4 | Styling |
| React Query | 5.62 | Data fetching & caching |
| React Router | 7.0 | Navigation |
| Axios | 1.7 | HTTP client |
| React Hot Toast | 2.5 | Notifications |

## Architecture

```
frontend/src/
├── components/           # Reusable UI components
│   ├── ui/              # Base UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Modal.tsx
│   │   ├── PriorityBadge.tsx
│   │   ├── StatusIndicator.tsx
│   │   └── index.ts
│   └── Layout.tsx       # Main layout wrapper
├── pages/               # Page components
│   ├── Dashboard.tsx    # Main dashboard
│   ├── Alerts.tsx       # Alert management
│   ├── History.tsx      # History viewer
│   └── index.ts
├── services/            # API services
│   └── api.ts          # API client
├── types/               # TypeScript types
│   └── alert.ts        # Alert type definitions
├── hooks/               # Custom React hooks
├── App.tsx             # Root component
├── main.tsx            # Entry point
└── index.css           # Global styles
```

## Key Features

### Real-time Updates

The dashboard automatically refreshes data:
- Current display: Every 5 seconds
- Active alerts: Every 5 seconds
- Stats: Every 30 seconds
- Health check: Every 30 seconds

### Dark Theme

The UI uses a dark theme optimized for:
- Ambient lighting displays
- Wall-mounted tablets
- Reduced eye strain

### Priority Visualization

Alerts are color-coded by priority:

| Priority | Color | Hex |
|----------|-------|-----|
| 1 (Critical) | Red | `#ff3b30` |
| 2 (High) | Orange | `#ff9500` |
| 3 (Medium) | Yellow | `#ffcc00` |
| 4 (Low) | Green | `#34c759` |
| 5 (Info) | Cyan | `#5ac8fa` |

## Pages

### Dashboard (`/`)

The main view showing:
- Currently displayed alert (with glow effect)
- List of all active alerts sorted by priority
- Quick stats (alerts today, critical, auto-cleared)

### Alerts (`/alerts`)

Alert management view with:
- Table of all registered alert keys
- Status indicators (active/inactive)
- Configure modal for editing priority
- Trigger modal for manual triggering

### History (`/history`)

Audit log view with:
- Paginated history table
- Filter by alert key
- Filter by action (triggered/cleared)

## State Management

### React Query

Used for server state management:

```typescript
// Queries are cached and automatically refetched
const { data: alerts } = useQuery({
  queryKey: ['alerts', 'active'],
  queryFn: alertsApi.getActive,
  refetchInterval: 5000,
});

// Mutations invalidate related queries
const clearMutation = useMutation({
  mutationFn: alertsApi.clear,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['alerts'] });
  },
});
```

### Query Keys

| Key | Description |
|-----|-------------|
| `['alerts']` | All alerts queries |
| `['alerts', 'active']` | Active alerts |
| `['alerts', 'current']` | Current display |
| `['alert-configs']` | Configurations |
| `['history']` | History entries |
| `['stats']` | Dashboard stats |
| `['health']` | Health check |

## Styling

### Tailwind CSS

Custom colors and utilities are defined in `index.css`:

```css
/* Dark theme colors */
--bg-primary: #1c1c1e;
--bg-secondary: #2c2c2e;
--border: #3a3a3c;
--text-muted: #8e8e93;

/* Animations */
.animate-pulse-glow { ... }
.animate-glow { ... }
.animate-slide-up { ... }
```

### Component Styling

Components use a combination of:
- Tailwind utility classes
- Inline styles for dynamic colors (priority-based)
- CSS-in-JS for complex animations

## Development

### Start Development Server

```bash
cd frontend
npm install
npm run dev
```

### Type Checking

```bash
npm run type-check
```

### Linting

```bash
npm run lint
```

### Building

```bash
npm run build
```

## See Also

- [Components](components.md) - Detailed component documentation
- [Pages](pages.md) - Page-specific documentation
- [Frontend Development](../development/frontend.md) - Development guide

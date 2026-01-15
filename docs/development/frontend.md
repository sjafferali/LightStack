# Frontend Development

This guide covers the frontend architecture, development patterns, and best practices.

## Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Framework | React 18 | UI library |
| Language | TypeScript 5.7 | Type safety |
| Build Tool | Vite 6.0 | Development server & bundler |
| Styling | Tailwind CSS 3.4 | Utility-first CSS |
| Data Fetching | TanStack React Query 5 | Server state management |
| Routing | React Router 7 | Client-side routing |
| HTTP Client | Axios | API requests |
| Notifications | React Hot Toast | Toast messages |

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── ui/                 # Base UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── PriorityBadge.tsx
│   │   │   ├── StatusIndicator.tsx
│   │   │   └── index.ts
│   │   └── Layout.tsx          # Main layout wrapper
│   ├── pages/
│   │   ├── Dashboard.tsx       # Main dashboard
│   │   ├── Alerts.tsx          # Alert management
│   │   ├── History.tsx         # History viewer
│   │   └── index.ts
│   ├── services/
│   │   └── api.ts             # API client
│   ├── types/
│   │   └── alert.ts           # TypeScript types
│   ├── hooks/                  # Custom React hooks
│   ├── App.tsx                # Root component
│   ├── main.tsx               # Entry point
│   └── index.css              # Global styles
├── public/                     # Static assets
├── index.html
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

## Development Setup

### Install Dependencies

```bash
cd frontend
npm install
```

### Start Development Server

```bash
npm run dev
```

The development server runs on `http://localhost:5173` with hot module replacement.

### Environment Variables

Create `.env.local` for local development:

```env
VITE_API_URL=http://localhost:8080
```

## Core Patterns

### Type Definitions (`types/alert.ts`)

```typescript
export interface AlertConfig {
  id: number;
  alert_key: string;
  name: string | null;
  description: string | null;
  default_priority: number;
  led_color: number;
  led_effect: number;
  created_at: string;
  updated_at: string | null;
}

export interface Alert {
  id: number;
  alert_key: string;
  is_active: boolean;
  priority: number | null;
  last_triggered_at: string | null;
  config: AlertConfig;
}

export interface CurrentDisplay {
  alert_key: string;
  priority: number;
  led_color: number;
  led_effect: number;
  is_active: boolean;
}

// Priority configuration for consistent styling
export const PRIORITY_CONFIG: Record<number, {
  label: string;
  color: string;
  bg: string;
  glow: string;
}> = {
  1: {
    label: 'Critical',
    color: '#ff3b30',
    bg: 'rgba(255, 59, 48, 0.15)',
    glow: '0 0 30px rgba(255, 59, 48, 0.6)',
  },
  2: {
    label: 'High',
    color: '#ff9500',
    bg: 'rgba(255, 149, 0, 0.15)',
    glow: '0 0 30px rgba(255, 149, 0, 0.6)',
  },
  // ... etc
};
```

### API Service (`services/api.ts`)

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080',
});

export const alertsApi = {
  getAll: () => api.get('/api/v1/alerts').then(r => r.data),

  getActive: () => api.get('/api/v1/alerts/active').then(r => r.data),

  getCurrent: () => api.get('/api/v1/alerts/current').then(r => r.data),

  trigger: (alertKey: string, data?: { priority?: number; note?: string }) =>
    api.post(`/api/v1/alerts/${alertKey}/trigger`, data).then(r => r.data),

  clear: (alertKey: string, note?: string) =>
    api.post(`/api/v1/alerts/${alertKey}/clear`, { note }).then(r => r.data),
};

export const alertConfigsApi = {
  getAll: () => api.get('/api/v1/alert-configs').then(r => r.data),

  update: (alertKey: string, data: Partial<AlertConfig>) =>
    api.patch(`/api/v1/alert-configs/${alertKey}`, data).then(r => r.data),

  delete: (alertKey: string) =>
    api.delete(`/api/v1/alert-configs/${alertKey}`).then(r => r.data),
};
```

### Data Fetching with React Query

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { alertsApi } from '../services/api';

// Query with automatic refetching
const { data: currentDisplay, isLoading } = useQuery({
  queryKey: ['alerts', 'current'],
  queryFn: alertsApi.getCurrent,
  refetchInterval: 5000, // Poll every 5 seconds
});

// Mutation with cache invalidation
const queryClient = useQueryClient();

const clearMutation = useMutation({
  mutationFn: (alertKey: string) => alertsApi.clear(alertKey),
  onSuccess: () => {
    // Invalidate related queries to trigger refetch
    queryClient.invalidateQueries({ queryKey: ['alerts'] });
    queryClient.invalidateQueries({ queryKey: ['stats'] });
    toast.success('Alert cleared');
  },
  onError: () => {
    toast.error('Failed to clear alert');
  },
});
```

### Query Keys Convention

| Query Key | Description | Refetch Interval |
|-----------|-------------|------------------|
| `['alerts']` | All alerts | - |
| `['alerts', 'active']` | Active alerts | 5s |
| `['alerts', 'current']` | Current display | 5s |
| `['alert-configs']` | All configurations | - |
| `['history', page, filters]` | Paginated history | - |
| `['stats']` | Dashboard stats | 30s |
| `['health']` | Health check | 30s |

## Component Patterns

### Button Component

```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'danger' | 'success' | 'ghost';
  size?: 'small' | 'normal';
}

export function Button({
  variant = 'default',
  size = 'normal',
  className,
  children,
  ...props
}: ButtonProps) {
  const baseStyles = 'rounded-lg font-medium transition-colors';

  const variantStyles = {
    default: 'bg-[#3a3a3c] hover:bg-[#48484a] text-white',
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    danger: 'bg-red-600/20 hover:bg-red-600/30 text-red-500',
    success: 'bg-green-600/20 hover:bg-green-600/30 text-green-500',
    ghost: 'bg-transparent hover:bg-[#3a3a3c] text-[#8e8e93]',
  };

  const sizeStyles = {
    small: 'px-3 py-1.5 text-sm',
    normal: 'px-4 py-2',
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
```

### Modal Component

```typescript
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-[#2c2c2e] rounded-xl p-6 w-full max-w-md animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-semibold mb-4">{title}</h2>
        {children}
      </div>
    </div>
  );
}
```

### Loading & Empty States

```typescript
// Loading state
{isLoading ? (
  <div className="text-center py-8">
    <p className="text-[#8e8e93]">Loading...</p>
  </div>
) : (
  <DataList data={data} />
)}

// Empty state
{data.length === 0 ? (
  <Card className="py-12 text-center">
    <p className="text-[#8e8e93]">No alerts found</p>
  </Card>
) : (
  <AlertList alerts={data} />
)}
```

## Styling

### Tailwind Configuration

```javascript
// tailwind.config.js
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Custom colors can be added here
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'slide-up': 'slide-up 0.2s ease-out',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
};
```

### Global Styles (`index.css`)

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg-primary: #1c1c1e;
  --bg-secondary: #2c2c2e;
  --border: #3a3a3c;
  --text-muted: #8e8e93;
}

body {
  @apply bg-[#1c1c1e] text-white;
  font-family: 'Inter', system-ui, sans-serif;
}

/* Monospace font for alert keys */
.font-mono {
  font-family: 'JetBrains Mono', monospace;
}

/* Glow animation */
.animate-glow {
  animation: glow 2s ease-in-out infinite;
}

@keyframes glow {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
```

### Dynamic Styling with Priority

```typescript
import { PRIORITY_CONFIG } from '../types/alert';

function AlertCard({ alert }: { alert: Alert }) {
  const config = PRIORITY_CONFIG[alert.priority || 3];

  return (
    <Card
      style={{
        borderLeftColor: config.color,
        boxShadow: alert.is_active ? config.glow : 'none',
      }}
    >
      <PriorityBadge priority={alert.priority} />
      <span style={{ color: config.color }}>{alert.alert_key}</span>
    </Card>
  );
}
```

## State Management

### Local State

For component-specific state, use `useState`:

```typescript
const [isModalOpen, setIsModalOpen] = useState(false);
const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
```

### Server State

For server data, use React Query. It handles caching, refetching, and synchronization:

```typescript
// All active alerts from server
const { data: alerts } = useQuery({
  queryKey: ['alerts', 'active'],
  queryFn: alertsApi.getActive,
});

// Filtered locally
const criticalAlerts = alerts?.filter(a => a.priority === 1);
```

### URL State

For pagination and filters, sync with URL:

```typescript
import { useSearchParams } from 'react-router-dom';

function History() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parseInt(searchParams.get('page') || '1');
  const filterKey = searchParams.get('alert_key') || '';

  const { data } = useQuery({
    queryKey: ['history', page, filterKey],
    queryFn: () => historyApi.getAll({ page, alert_key: filterKey }),
  });

  const setPage = (newPage: number) => {
    setSearchParams({ ...Object.fromEntries(searchParams), page: String(newPage) });
  };
}
```

## Testing

### Component Tests

```typescript
import { render, screen } from '@testing-library/react';
import { Button } from './Button';

test('renders button with text', () => {
  render(<Button>Click me</Button>);
  expect(screen.getByText('Click me')).toBeInTheDocument();
});

test('applies variant styles', () => {
  render(<Button variant="primary">Primary</Button>);
  expect(screen.getByRole('button')).toHaveClass('bg-blue-600');
});
```

### Integration Tests

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Dashboard from './Dashboard';

const queryClient = new QueryClient();

test('displays current alert', async () => {
  render(
    <QueryClientProvider client={queryClient}>
      <Dashboard />
    </QueryClientProvider>
  );

  await waitFor(() => {
    expect(screen.getByText('garage_door_open')).toBeInTheDocument();
  });
});
```

## Build & Deployment

### Type Checking

```bash
npm run type-check
```

### Linting

```bash
npm run lint
```

### Production Build

```bash
npm run build
```

The build output is in `dist/` and is served by the backend.

### Build Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
```

## Debugging

### React DevTools

Install the React DevTools browser extension for component inspection.

### React Query DevTools

```typescript
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* App components */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

### Network Inspection

Use browser DevTools Network tab to inspect API requests.

## See Also

- [Components Reference](../frontend/components.md)
- [Pages Reference](../frontend/pages.md)
- [API Reference](../api/README.md)

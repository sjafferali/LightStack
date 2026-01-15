# Frontend Components

This document describes the reusable UI components in LightStack's frontend.

## UI Components

All base UI components are in `frontend/src/components/ui/`.

### Button

A styled button component with multiple variants.

**Location**: `components/ui/Button.tsx`

**Props**:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'default' \| 'primary' \| 'danger' \| 'success' \| 'ghost'` | `'default'` | Button style variant |
| `size` | `'small' \| 'normal'` | `'normal'` | Button size |
| `disabled` | `boolean` | `false` | Disabled state |
| `children` | `ReactNode` | - | Button content |

**Variants**:

| Variant | Use Case | Appearance |
|---------|----------|------------|
| `default` | Secondary actions | Dark background, white text |
| `primary` | Primary actions | Blue background |
| `danger` | Destructive actions | Red tinted |
| `success` | Positive actions | Green tinted |
| `ghost` | Tertiary actions | Transparent |

**Usage**:

```tsx
import { Button } from '../components/ui';

<Button variant="primary" onClick={handleSave}>
  Save Changes
</Button>

<Button variant="danger" size="small" onClick={handleClear}>
  Clear
</Button>

<Button variant="ghost" disabled={isLoading}>
  Cancel
</Button>
```

---

### Card

A container component with optional glow effect.

**Location**: `components/ui/Card.tsx`

**Props**:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | - | Card content |
| `className` | `string` | - | Additional CSS classes |
| `glow` | `string \| null` | `null` | Box shadow for glow effect |
| `noPadding` | `boolean` | `false` | Remove default padding |

**Usage**:

```tsx
import { Card } from '../components/ui';

// Basic card
<Card>
  <p>Card content</p>
</Card>

// Card with glow effect
<Card glow="0 0 20px rgba(255, 59, 48, 0.5)">
  <p>Alert card</p>
</Card>

// Card without padding (for tables)
<Card noPadding>
  <table>...</table>
</Card>
```

---

### Modal

An animated modal dialog component.

**Location**: `components/ui/Modal.tsx`

**Props**:

| Prop | Type | Description |
|------|------|-------------|
| `isOpen` | `boolean` | Whether modal is visible |
| `onClose` | `() => void` | Close handler |
| `title` | `string` | Modal title |
| `children` | `ReactNode` | Modal content |

**Features**:
- Click outside to close
- Animated fade-in/slide-up
- Scrollable content area
- Maximum height constraint

**Usage**:

```tsx
import { Modal } from '../components/ui';

const [isOpen, setIsOpen] = useState(false);

<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Configure Alert"
>
  <form>
    {/* Modal content */}
  </form>
</Modal>
```

---

### PriorityBadge

Displays a priority level badge with color coding.

**Location**: `components/ui/PriorityBadge.tsx`

**Props**:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `priority` | `number` | - | Priority level (1-5) |
| `size` | `'small' \| 'normal'` | `'normal'` | Badge size |

**Appearance**:

| Priority | Label | Color |
|----------|-------|-------|
| 1 | Critical | Red |
| 2 | High | Orange |
| 3 | Medium | Yellow |
| 4 | Low | Green |
| 5 | Info | Cyan |

**Usage**:

```tsx
import { PriorityBadge } from '../components/ui';

<PriorityBadge priority={1} />
// Renders: "P1 · Critical" in red

<PriorityBadge priority={4} size="small" />
// Renders: "P4 · Low" in green (smaller)
```

---

### StatusIndicator

A circular indicator showing active/inactive status.

**Location**: `components/ui/StatusIndicator.tsx`

**Props**:

| Prop | Type | Description |
|------|------|-------------|
| `active` | `boolean` | Whether to show active state |

**States**:

| State | Appearance |
|-------|------------|
| Active | Green dot with glow and pulse animation |
| Inactive | Gray dot, no animation |

**Usage**:

```tsx
import { StatusIndicator } from '../components/ui';

<StatusIndicator active={true} />  // Green, glowing
<StatusIndicator active={false} /> // Gray
```

---

## Layout Component

### Layout

Main layout wrapper with header navigation.

**Location**: `components/Layout.tsx`

**Features**:
- Sticky header with blur effect
- Navigation tabs (Dashboard, Alerts, History)
- Health status indicator
- LightStack branding

**Usage**:

```tsx
import { Layout } from '../components/Layout';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          {/* ... */}
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
```

---

## Styling Conventions

### Colors

Use the priority config for consistent colors:

```tsx
import { PRIORITY_CONFIG } from '../types/alert';

const config = PRIORITY_CONFIG[priority];
// config.color - text color
// config.bg - background color
// config.glow - box shadow for glow
```

### Fonts

- **Body text**: Inter (system font fallback)
- **Monospace**: JetBrains Mono (for alert keys, timestamps)

```tsx
// Use font-mono class for monospace
<span className="font-mono">{alertKey}</span>
```

### Spacing

Tailwind spacing scale:
- `gap-2` = 8px
- `gap-3` = 12px
- `gap-4` = 16px
- `gap-5` = 20px
- `gap-6` = 24px

---

## Component Patterns

### Loading States

```tsx
{isLoading ? (
  <p className="text-[#8e8e93]">Loading...</p>
) : (
  <DataComponent data={data} />
)}
```

### Empty States

```tsx
{items.length === 0 ? (
  <Card className="py-12 text-center">
    <p className="text-sm text-[#8e8e93]">No items found</p>
  </Card>
) : (
  <ItemList items={items} />
)}
```

### Mutations with Feedback

```tsx
const mutation = useMutation({
  mutationFn: api.doSomething,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['data'] });
    toast.success('Action completed');
  },
  onError: () => toast.error('Action failed'),
});

<Button
  onClick={() => mutation.mutate()}
  disabled={mutation.isPending}
>
  {mutation.isPending ? 'Processing...' : 'Do Action'}
</Button>
```

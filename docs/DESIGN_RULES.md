# Depo-Pro Design Rules

> **Non-negotiable design standards for all contributors**

---

## 1. Source of Truth

| What | Location |
|------|----------|
| Colors | `app/globals.css` CSS variables |
| Tokens | `tailwind.config.ts` |
| Components | `components/ui/*` (shadcn/ui) |
| Status Colors | `lib/status-colors.ts` |

**No page may introduce new colors, fonts, or spacing systems.**

---

## 2. Typography

- **Font:** Inter (defined in `app/layout.tsx`)
- **No custom fonts in pages**

### Heading Scale

| Element | Class |
|---------|-------|
| h1 (Page title) | `text-2xl font-semibold` |
| h2 (Section) | `text-xl font-semibold` |
| h3 (Card title) | `text-lg font-medium` |

### Body Text

| Type | Class |
|------|-------|
| Default | `text-sm` or `text-base` |
| Muted | `text-muted-foreground` |

---

## 3. Layout

### Standard Page Wrapper

```tsx
<div className="container max-w-7xl space-y-6 py-6">
  <h1 className="text-2xl font-semibold">Page Title</h1>
  {/* content */}
</div>
```

### Spacing

| Element | Standard |
|---------|----------|
| Section gap | `space-y-6` |
| Card padding | `p-6` |
| Grid gap | `gap-4` or `gap-6` |

---

## 4. Colors

### ❌ NEVER Use

```tsx
// Hardcoded hex colors
'#3b82f6'
style={{ backgroundColor: '#ef4444' }}

// Raw Tailwind colors
bg-blue-600
text-gray-500
```

### ✅ ALWAYS Use

```tsx
// Semantic tokens
bg-primary
text-foreground
text-muted-foreground
border-border
bg-destructive

// Status colors utility
import { getStatusClasses, getChartColor } from '@/lib/status-colors';

const { bg, text } = getStatusClasses('CONFIRMED');
const chartColor = getChartColor('CONFIRMED');
```

---

## 5. UI Components

### ❌ NEVER Use Raw HTML

```tsx
<button className="...">Save</button>
<input className="..." />
<select>...</select>
```

### ✅ ALWAYS Use shadcn/ui

```tsx
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

<Button>Save</Button>
<Input placeholder="..." />
<Select>...</Select>
```

---

## 6. Status Colors

For job/transcript status, use the centralized utility:

```tsx
import { 
  getStatusClasses,    // Tailwind classes
  getChartColor,       // HSL for charts
  getStatusBadgeClasses // Complete badge
} from '@/lib/status-colors';

// For UI elements
const { bg, text, border, dot } = getStatusClasses('CONFIRMED');
<div className={`${bg} ${text}`}>Confirmed</div>

// For charts (FullCalendar, Recharts)
backgroundColor: getChartColor('CONFIRMED')

// Quick badge
<span className={getStatusBadgeClasses('CONFIRMED')}>
  Confirmed
</span>
```

---

## 7. Enforcement

### Before Every PR

```bash
npm run audit:design    # Check for violations
npm run check:permissions  # Verify route access
npm run typecheck       # TypeScript
npm run lint           # ESLint
```

### Code Review Checklist

- [ ] No hex colors
- [ ] No inline styles with colors
- [ ] Uses shadcn/ui components
- [ ] Uses semantic color tokens
- [ ] Dark mode works

---

## 8. Quick Reference

### Do This ✅

```tsx
<div className="container max-w-7xl space-y-6 py-6">
<div className="bg-background text-foreground">
<Button variant="destructive">Delete</Button>

import { getStatusClasses } from '@/lib/status-colors';
const { bg, text } = getStatusClasses(status);
```

### Never Do This ❌

```tsx
<div style={{ backgroundColor: '#ef4444' }}>
<button className="bg-blue-600">Save</button>
backgroundColor: '#3b82f6'
```

---

*Last updated: January 2026*

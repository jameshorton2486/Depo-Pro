# 🎨 Depo-Pro Visual Design Audit

> Generated: January 2026
> Status: **Comprehensive UI/UX Review**

---

## 📊 Overall Assessment

| Area | Grade | Notes |
|------|-------|-------|
| Structure | B+ | Good foundation, needs consistency |
| Consistency | B | Some patterns vary page-to-page |
| Clarity | B | Generally clear, hierarchy can improve |
| Polish | B- | Close, needs refinement pass |
| **Potential** | **A** | One cleanup pass from professional SaaS |

**Verdict**: One focused cleanup pass away from mature, professional SaaS quality.

---

## 🔴 Global Issues (Apply Everywhere)

These patterns appear across almost all pages:

### 1. Inconsistent Page Width
- **Problem**: Some pages are full-width, others are constrained
- **Fix**: Standardize all dashboard pages with `container max-w-7xl space-y-6 py-6`
- **Impact**: High - affects all dashboard pages

### 2. Heading Hierarchy Inconsistency
- **Problem**: Some pages use large bold headings, others use smaller/lighter ones
- **Fix**: Standardize heading scale:
  - `h1` → `text-2xl font-semibold`
  - `h2` → `text-xl font-semibold`
  - Page titles → `text-2xl font-semibold` with `mb-4`
- **Impact**: High - affects scanning and hierarchy

### 3. Card Padding & Spacing Variance
- **Problem**: Some cards feel cramped, others overly airy
- **Fix**: Standardize:
  - Card padding: `p-6`
  - Section gap: `space-y-6`
  - Grid gap: `gap-4` or `gap-6`
- **Impact**: High - affects visual rhythm

### 4. Muted Text Not Always Muted
- **Problem**: Metadata looks as prominent as primary content
- **Fix**: Ensure metadata uses `text-muted-foreground`
- **Impact**: Medium - affects content scanning

### 5. Sidebar + Content Alignment
- **Problem**: Sidebars and content don't always align vertically
- **Fix**: Ensure consistent vertical spacing in sidebar sections
- **Impact**: Medium - affects layout polish

---

## 🌐 Marketing / Public Pages

### `/` (Homepage)
**Issues:**
- Hero section feels visually disconnected
- CTA buttons don't dominate visual hierarchy
- Sections stack without strong rhythm

**Fixes:**
```tsx
// Wrap sections in consistent rhythm
<section className="py-24 bg-background">
<section className="py-24 bg-muted/50">

// Make primary CTA visually dominant
<Button size="lg" className="text-lg px-8">
```

**Priority**: Medium

---

### `/features`
**Issues:**
- Feature cards feel uneven
- Icon + text spacing inconsistent
- Too much equal visual weight

**Fixes:**
```tsx
// 3-column grid with uniform padding
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
  <Card className="p-6">
    {/* Primary features get stronger headings */}
  </Card>
</div>
```

**Priority**: Low

---

### `/pricing`
**Issues:**
- Pricing tiers feel visually similar
- No clear "recommended" plan
- Vertical alignment off

**Fixes:**
```tsx
// Add accent border to primary plan
<Card className={cn("p-6", primary && "border-2 border-primary")}>

// Increase spacing between price and features
<div className="space-y-6">
```

**Priority**: Low

---

### `/security`
**Issues:**
- Very text-heavy
- Lacks visual anchors
- Reads like documentation

**Fixes:**
```tsx
// Break into sections with icons
<div className="max-w-prose space-y-8">
  <Card className="p-6">
    <Icon className="h-8 w-8" />
    {/* Content */}
  </Card>
</div>
```

**Priority**: Low

---

### `/contact`
**Issues:**
- Form feels isolated
- Spacing around inputs varies

**Fixes:**
```tsx
<Card className="p-6">
  <p className="text-muted-foreground mb-6">
    {/* Explanatory text */}
  </p>
  <form className="space-y-4">
    {/* Normalized input spacing */}
  </form>
</Card>
```

**Priority**: Low

---

## 🔐 Auth Pages

### `/login`, `/register`, `/forgot-password`, `/reset-password`
**Issues:**
- Form width varies page-to-page
- Titles not visually consistent
- Error/help text sometimes too prominent

**Fixes:**
```tsx
// Standardize form container
<div className="container max-w-sm space-y-6 py-6">
  <h1 className="text-2xl font-semibold">Title</h1>
  <p className="text-muted-foreground">Helper text</p>
  <form className="space-y-4">
    {/* Form fields */}
  </form>
</div>
```

**Priority**: High (affects user first impression)

---

## 🧭 Dashboard – Shared Layout

### Sidebar (All Roles)
**Issues:**
- Active item highlight is subtle
- Section headers blend into items
- Vertical spacing varies

**Fixes:**
```tsx
// Increase contrast for active item
className={cn(
  isActive && "bg-primary text-primary-foreground font-medium"
)}

// Increase spacing between sections
<div className="space-y-6">
```

**Priority**: Medium

---

### Breadcrumbs
**Issues:**
- Feel optional/invisible
- Spacing from page title inconsistent

**Fixes:**
```tsx
// Always above page title with consistent margin
<div className="space-y-4">
  <Breadcrumbs className="mb-4" />
  <h1 className="text-2xl font-semibold">Page Title</h1>
</div>
```

**Priority**: Medium

---

## 👩‍⚖️ Reporter Dashboard

### `/dashboard/reporter`
**Issues:**
- "Jobs" and "Calendar" sections compete visually
- Empty states feel abrupt
- Data density slightly high

**Fixes:**
```tsx
// Clearly separate sections with cards
<div className="space-y-6">
  <Card className="p-6">
    <h2 className="text-xl font-semibold mb-4">Jobs</h2>
    {/* Jobs content */}
  </Card>
  <Card className="p-6">
    <h2 className="text-xl font-semibold mb-4">Calendar</h2>
    {/* Calendar content */}
  </Card>
</div>
```

**Priority**: High

---

### `/dashboard/reporter/jobs`
**Issues:**
- Table/grid alignment inconsistent
- Status indicators not standardized
- Action buttons blend into content

**Fixes:**
```tsx
// Use status-colors.ts utility
import { getStatusClasses } from '@/lib/status-colors';

// Standardize row height
<tr className="h-12">

// Move actions to consistent column
<td className="text-right">
  <Button variant="ghost" size="sm">Action</Button>
</td>
```

**Priority**: High

---

### `/dashboard/reporter/calendar`
**Issues:**
- Calendar dominates page visually
- Controls feel cramped
- No clear "current week" emphasis

**Fixes:**
```tsx
// Wrap calendar in card
<Card className="p-6">
  <div className="mb-4 flex items-center justify-between">
    {/* Controls with padding */}
  </div>
  {/* Calendar component */}
</Card>
```

**Priority**: Medium

---

## ✍️ Scopist Dashboard

### `/dashboard/scopist`
**Issues:**
- Too similar to reporter dashboard
- Role-specific context not clear

**Fixes:**
```tsx
<div className="space-y-6">
  <div>
    <h1 className="text-2xl font-semibold">Scopist Dashboard</h1>
    <p className="text-muted-foreground">Review and edit assigned transcripts</p>
  </div>
  <Card className="p-6 border-primary/20">
    <h2 className="text-xl font-semibold mb-4">Assigned Work</h2>
  </Card>
</div>
```

**Priority**: Medium

---

## 🛠️ Admin Dashboard

### `/dashboard/admin`
**Issues:**
- High information density
- Many equal-weight sections
- Hard to know where to look first

**Fixes:**
```tsx
// Establish primary focus
<Card className="p-6 border-primary/20">
  <h2 className="text-xl font-semibold mb-4">System Health</h2>
  {/* Primary metrics */}
</Card>

// Demote secondary metrics
<Card className="p-6 bg-muted/50">
  <h3 className="text-lg font-medium mb-4">Secondary Metrics</h3>
  {/* Secondary content */}
</Card>
```

**Priority**: High

---

### `/dashboard/admin/jobs`
**Issues:**
- Dense table
- Status colors inconsistent
- Filters not visually separated

**Fixes:**
```tsx
// Wrap filters in muted card
<Card className="p-4 bg-muted/50 mb-6">
  {/* Filters */}
</Card>

// Normalize status colors (use status-colors.ts)
// Increase row spacing
<tbody className="space-y-2">
```

**Priority**: High

---

### `/dashboard/admin/calendar`
**Issues:**
- Similar to reporter calendar but heavier
- Needs clearer admin affordances

**Fixes:**
```tsx
// Add admin-only control area
<Card className="p-6 border-destructive/20 mb-6">
  <h3 className="text-lg font-semibold mb-4">Admin Controls</h3>
  {/* Admin actions */}
</Card>

// Separate "manage" vs "view"
```

**Priority**: Medium

---

## 🚫 `/unauthorized`
**Issues:**
- Page feels abrupt
- No guidance on what to do next

**Fixes:**
```tsx
<div className="container max-w-2xl space-y-6 py-12 text-center">
  <h1 className="text-2xl font-semibold">Access Denied</h1>
  <p className="text-muted-foreground">
    You don't have permission to access this page.
  </p>
  <Button asChild>
    <Link href="/dashboard">Go to Dashboard</Link>
  </Button>
</div>
```

**Priority**: Medium

---

## 🎯 Priority Action Plan

### Phase 1: Global Standards (High Impact)
1. ✅ Enforce page container (`container max-w-7xl space-y-6 py-6`)
2. ✅ Standardize heading hierarchy
3. ✅ Normalize card padding (`p-6`)
4. ✅ Centralize status colors (use `lib/status-colors.ts`)
5. ✅ Ensure muted text uses `text-muted-foreground`

### Phase 2: Auth Pages (First Impression)
1. Standardize form container width
2. Consistent heading styles
3. Normalized input spacing

### Phase 3: Dashboard Pages (User Experience)
1. Reporter dashboard section separation
2. Admin dashboard hierarchy
3. Breadcrumb consistency
4. Sidebar improvements

### Phase 4: Polish (Nice to Have)
1. Marketing page improvements
2. Empty state messaging
3. Visual rhythm refinements

---

## 🧩 What Will Improve Automatically

Once global standards are enforced:

✅ **Better Rhythm** - Consistent spacing creates flow
✅ **Cleaner Scanning** - Clear hierarchy guides the eye
✅ **Fewer "Off" Moments** - Consistency feels intentional
✅ **Stronger Polish** - Details matter

---

## 📋 Implementation Checklist

### Global Standards
- [ ] All dashboard pages use standard container
- [ ] Heading hierarchy standardized
- [ ] Card padding normalized (`p-6`)
- [ ] Status colors use `lib/status-colors.ts`
- [ ] Muted text uses semantic tokens

### Auth Pages
- [ ] Form width standardized
- [ ] Heading consistency
- [ ] Input spacing normalized

### Dashboard Improvements
- [ ] Reporter dashboard sections separated
- [ ] Admin dashboard hierarchy established
- [ ] Breadcrumbs consistent
- [ ] Sidebar spacing improved

### Polish Pass
- [ ] Empty states added
- [ ] Visual rhythm refined
- [ ] Marketing pages improved

---

## 🏁 Expected Outcome

After implementing these fixes:

- **Consistency**: B → A
- **Clarity**: B → A-
- **Polish**: B- → A
- **Overall**: Professional SaaS quality achieved

---

*This audit serves as a roadmap for systematic visual improvements. Focus on Phase 1 (Global Standards) first for maximum impact.*

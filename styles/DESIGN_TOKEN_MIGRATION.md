# 🔄 Design Token Migration Guide

**Status:** ✅ Compatibility Layer Added  
**Date:** 2025-01-05

## Overview

Depo-Pro uses a **normalized HSL token system** compatible with shadcn/ui. A compatibility layer has been added to support legacy token names from `design-tokens.css`.

## Token System Architecture

### Primary System (Active)
- **Location:** `app/globals.css` → `@layer base :root`
- **Format:** HSL values without `hsl()` wrapper
- **Usage:** `hsl(var(--primary))`

### Legacy System (Deprecated but Compatible)
- **Location:** `styles/design-tokens.css`
- **Status:** ⚠️ Deprecated - Do not use in new code
- **Compatibility:** Mapped to primary system via compatibility tokens

## Compatibility Tokens

The following legacy tokens are automatically mapped to the new system:

| Legacy Token | New Token | Notes |
|-------------|-----------|-------|
| `--color-primary` | `--primary` | Mapped |
| `--color-accent` | `--accent` | Mapped |
| `--color-bg` | `--background` | Mapped |
| `--color-surface` | `--card` | Mapped |
| `--color-text` | `--foreground` | Mapped |
| `--color-text-secondary` | `--muted-foreground` | Mapped |
| `--color-text-muted` | `--muted-foreground` | Mapped |
| `--color-text-inverse` | `0 0% 100%` | White |
| `--color-border` | `--border` | Mapped |
| `--radius-card` | `--radius` | Mapped |
| `--radius-button` | `--radius` | Mapped |
| `--shadow-soft` | Defined inline | Soft shadow |

## Migration Path

### ✅ Files Using Legacy Tokens (Still Work)

These files use legacy tokens but will continue to work via compatibility layer:
- `components/layouts/navbar.tsx`
- `app/about/page.tsx`

### 🔄 Recommended Migration

**Before (Legacy):**
```tsx
<div className="bg-[var(--color-bg)] text-[var(--color-text)]">
  Content
</div>
```

**After (New System):**
```tsx
// Option 1: Use Tailwind utilities (Recommended)
<div className="bg-background text-foreground">
  Content
</div>

// Option 2: Use new tokens directly
<div className="bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
  Content
</div>
```

## Token Validation

✅ **No invalid token patterns found:**
- No function calls in token names: `--spacing(8)` ❌
- No nested var() with functions: `var(--spacing(8))` ❌
- All tokens use valid CSS custom property syntax ✅

## Best Practices

1. **Use Tailwind utilities** when possible (better performance)
2. **Use new HSL tokens** for custom CSS
3. **Legacy tokens work** but are deprecated
4. **Always wrap color tokens** in `hsl()`: `hsl(var(--primary))`

## Files to Update (Optional)

These files can be migrated to new tokens when convenient:
- `components/layouts/navbar.tsx` - Uses `--color-*` tokens
- `app/about/page.tsx` - Uses `--color-*` tokens

**Note:** Migration is optional - compatibility layer ensures they work correctly.

# Depo-Pro Design Token System

## Purpose
Depo-Pro uses a layered design token system to ensure:
- Build-time safety
- Runtime flexibility
- Semantic clarity
- Zero CSS parser failures

---

## Token Layers

### 1. Tailwind Tokens (Compile-Time)
Defined in `tailwind.config.ts`.

Examples:
- `spacing.8` → `2rem`
- `colors.indigo.600`
- `borderRadius.lg`

⚠️ **These tokens cannot be referenced directly in CSS.**

**Usage:**
```tsx
// ✅ CORRECT - In JSX/TSX
<div className="p-8 rounded-lg bg-indigo-600">
  Content
</div>

// ✅ CORRECT - In tailwind.config.ts
theme: {
  extend: {
    spacing: {
      '8': '2rem',
    }
  }
}
```

---

### 2. Generated CSS Variables (Bridge Layer)

Tailwind emits CSS variables such as:
- `--tw-spacing-8`
- `--tw-color-indigo-600`

These are **safe to use at runtime**.

**Example:**
```css
/* ✅ CORRECT */
padding: var(--tw-spacing-8);
color: var(--tw-color-indigo-600);
```

**Note:** Tailwind generates these automatically. You don't need to define them manually.

---

### 3. Semantic App Tokens (Runtime)

These represent **meaning**, not values.

Examples:
- `--cell-size` - Grid cell dimensions
- `--focus-ring-width` - Focus indicator width
- `--control-height` - Form control height

They should always reference:
- Tailwind CSS variables (`--tw-*`), or
- Hardcoded values

**Example:**
```css
:root {
  /* ✅ CORRECT - References Tailwind variable */
  --cell-size: var(--tw-spacing-8);
  
  /* ✅ CORRECT - Hardcoded value */
  --focus-ring-width: 2px;
  
  /* ✅ CORRECT - References another semantic token */
  --control-height: var(--cell-size);
}

.grid {
  grid-auto-rows: var(--cell-size);
}
```

---

## ❌ Disallowed Patterns

The following will break builds and must **never** be used:

```css
/* ❌ INVALID - Function call in token name */
--spacing(8): 2rem;

/* ❌ INVALID - Function call in var() */
var(--spacing(8))

/* ❌ INVALID - theme() in CSS (compile-time only) */
var(--theme(spacing.8))

/* ❌ INVALID - Nested function calls */
var(--color(primary))
```

---

## Naming Rules

| Token Type | Prefix | Example |
|-----------|--------|---------|
| Tailwind Generated | `--tw-*` | `--tw-spacing-8` |
| App Semantic | `--app-*` or meaningful | `--cell-size`, `--focus-ring-width` |
| Component | `--component-*` | `--button-height`, `--card-padding` |
| shadcn/ui | No prefix | `--primary`, `--background` |

---

## Example (Correct)

```css
/* Semantic token definition */
.cell-size-md {
  --cell-size: var(--tw-spacing-8); /* 2rem */
}

.cell-size-lg {
  --cell-size: var(--tw-spacing-12); /* 3rem */
}

/* Usage */
.grid {
  grid-auto-rows: var(--cell-size);
}
```

---

## Guarantees

This system guarantees:
- ✅ Turbopack compatibility
- ✅ No CSS parse errors
- ✅ Stable refactors
- ✅ Clear intent

---

## Migration from Invalid Patterns

### Before (Invalid)
```css
.\[--cell-size\:--spacing\(8\)\] {
  --cell-size: var(--spacing(8)); /* ❌ INVALID */
}
```

### After (Valid)
```css
.cell-size-md {
  --cell-size: var(--tw-spacing-8); /* ✅ VALID */
}

/* Or with hardcoded value */
.cell-size-md {
  --cell-size: 2rem; /* ✅ VALID */
}
```

---

## Token Reference

### Spacing (via Tailwind)
Use Tailwind utilities: `p-8`, `m-4`, `gap-6`

For CSS variables, use: `var(--tw-spacing-8)`

### Colors (HSL Format)
```css
/* ✅ CORRECT */
color: hsl(var(--primary));
background: hsl(var(--primary) / 0.1);

/* ❌ INCORRECT */
color: var(--primary); /* Missing hsl() wrapper */
```

### Typography
```css
h1 { font-size: var(--text-h1); }
code { font-family: var(--font-mono); }
```

---

## Best Practices

1. **Prefer Tailwind utilities** in JSX/TSX
2. **Use semantic tokens** for component-specific values
3. **Reference Tailwind variables** (`--tw-*`) in CSS
4. **Never use function calls** in token names or values
5. **Document semantic tokens** with comments

---

## Validation

Run this to check for invalid patterns:

```bash
# Check for invalid token patterns
grep -r "spacing(" app/globals.css styles/*.css && echo "❌ Invalid token usage found"
grep -r "var(--.*(" app/globals.css styles/*.css && echo "❌ Invalid var() usage found"
```

---

**Questions?** See `app/globals.css` for the complete token definitions.

# 🎨 Design Token Reference

**Quick reference for Depo-Pro design tokens**

## Color Tokens (HSL Format)

All color tokens use HSL format **without** the `hsl()` wrapper:

```css
/* ✅ CORRECT */
color: hsl(var(--primary));
background: hsl(var(--primary) / 0.1); /* 10% opacity */

/* ❌ INCORRECT */
color: var(--primary); /* Missing hsl() wrapper */
```

### Semantic Colors

- `--background` - Page background
- `--foreground` - Primary text
- `--card` - Card backgrounds
- `--card-foreground` - Card text
- `--primary` - Primary actions
- `--primary-foreground` - Text on primary
- `--secondary` - Secondary elements
- `--muted` - Muted backgrounds
- `--muted-foreground` - Muted text
- `--accent` - Accent elements
- `--accent-foreground` - Text on accent
- `--destructive` - Error states
- `--destructive-foreground` - Text on destructive
- `--border` - Borders
- `--input` - Input borders
- `--ring` - Focus rings

### Status Colors

- `--success` - Success states
- `--warning` - Warning states
- `--info` - Info states
- `--error` - Error states

## Typography Tokens

- `--text-h1` - 2.5rem (40px)
- `--text-h2` - 2rem (32px)
- `--text-h3` - 1.5rem (24px)
- `--text-h4` - 1.25rem (20px)
- `--text-h5` - 1.125rem (18px)
- `--text-body` - 1rem (16px)
- `--text-body-sm` - 0.875rem (14px)
- `--text-caption` - 0.8125rem (13px)
- `--text-tiny` - 0.75rem (12px)

### Font Families

- `--font-sans` - Inter, system fonts
- `--font-mono` - JetBrains Mono, code fonts
- `--font-legal` - Courier New, transcripts

## Usage Examples

```css
/* Colors */
.my-component {
  background-color: hsl(var(--card));
  color: hsl(var(--foreground));
  border: 1px solid hsl(var(--border));
}

/* Typography */
h1 { font-size: var(--text-h1); }
code { font-family: var(--font-mono); }
```

## Tailwind Usage

```tsx
<div className="bg-primary text-primary-foreground">
  Content
</div>
```

## Dark Mode

All tokens automatically switch in dark mode when `.dark` class is present.

# Depo-Pro Design Rules

This document defines the **non-negotiable design standards** for Depo-Pro.

## 1. Source of Truth

- **Colors**: `globals.css` CSS variables
- **Tokens**: `tailwind.config.ts`
- **Components**: `components/ui` (shadcn/ui)

No page may introduce new colors, fonts, or spacing systems.

---

## 2. Typography

- **Font**: Inter (global)
- **Headings**:
  - `h1` → `text-2xl font-semibold`
  - `h2` → `text-xl font-semibold`
  - `h3` → `text-lg font-semibold`
- **Body text** → `text-sm`
- **Muted text** → `text-muted-foreground`

No custom fonts in pages.

---

## 3. Layout

### Page Container

Every page MUST start with:

```tsx
<div className="container max-w-7xl space-y-6 py-6">
  {/* page content */}
</div>
```

### Standard Spacing

- Section gap → `space-y-6`
- Card padding → `p-6`
- Grid gap → `gap-4` or `gap-6`
- Button padding → Use `<Button>` component (auto-padded)

---

## 4. Colors

❌ **FORBIDDEN:**
- Hex colors: `bg-[#2563eb]`, `text-[#111827]`
- Raw Tailwind colors: `bg-blue-600`, `text-gray-500`, `border-gray-200`

✅ **REQUIRED:**
- Semantic tokens only:
  - `bg-background` / `bg-card`
  - `bg-primary`
  - `text-foreground`
  - `text-muted-foreground`
  - `border-border`
  - `bg-destructive` (for errors)
  - `bg-success` (if available)

---

## 5. UI Components

❌ **FORBIDDEN:**
- Raw HTML elements: `<button>`, `<input>`, `<select>`, `<textarea>`

✅ **REQUIRED:**
- Always use shadcn/ui components from `components/ui`:
  - `<Button />`
  - `<Input />`
  - `<Select />`
  - `<Textarea />`
  - `<Dialog />`
  - `<Card />`
  - `<Badge />`

---

## 6. Inline Styles

❌ **FORBIDDEN:**
- `style={{ padding: 12 }}`
- `style={{ color: '#fff' }}`

✅ **REQUIRED:**
- All styling must use Tailwind utility classes

---

## 7. Dark Mode

All pages must render correctly in dark mode.

**Rule**: If it breaks in dark mode, the implementation is wrong.

Test checklist:
- [ ] Page readable in dark mode
- [ ] No contrast issues
- [ ] No invisible borders or text
- [ ] Colors use semantic tokens (automatically supports dark mode)

---

## 8. Button Standards

❌ **BAD:**
```tsx
<button className="bg-blue-600 px-4 py-2 text-white rounded">
  Save
</button>
```

✅ **GOOD:**
```tsx
<Button>Save</Button>
<Button variant="outline">Cancel</Button>
<Button variant="destructive">Delete</Button>
```

---

## 9. Form Standards

❌ **BAD:**
```tsx
<input className="border p-2" />
<select className="border p-2">
  <option>Option 1</option>
</select>
```

✅ **GOOD:**
```tsx
<Input placeholder="Enter text" />
<Select>
  <SelectTrigger>
    <SelectValue placeholder="Select option" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
  </SelectContent>
</Select>
```

---

## 10. Card/Container Standards

❌ **BAD:**
```tsx
<div className="bg-white border rounded-lg p-4">
  Content
</div>
```

✅ **GOOD:**
```tsx
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>
    Content
  </CardContent>
</Card>
```

---

## Enforcement

### Pre-Commit Checks

Run before committing:
```bash
npm run audit:design
```

This will flag:
- Hex colors
- Inline styles
- Raw HTML form elements
- Missing page containers

### Visual Regression Checklist

See `VISUAL_REGRESSION_CHECKLIST.md` for manual testing checklist before merge.

---

## Exceptions

The only acceptable exceptions:
1. Third-party library overrides (must be documented)
2. Dynamic inline styles for animations (use `cn()` utility)
3. CSS variables in `globals.css` (must follow naming convention)

---

**Remember**: Consistency is more important than creativity in UI. Follow these rules to maintain a cohesive, professional appearance across the entire application.

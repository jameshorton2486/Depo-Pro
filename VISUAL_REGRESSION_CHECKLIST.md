# Visual Regression Checklist

Before merging UI changes, confirm all items below.

---

## Global Standards

- [ ] Page uses standard container (`container max-w-7xl space-y-6 py-6`)
- [ ] No hex colors (`bg-[#...]`, `text-[#...]`)
- [ ] No raw Tailwind colors (`bg-blue-600`, `text-gray-500`)
- [ ] No inline styles (`style={{}}`)
- [ ] shadcn/ui components used (`<Button>`, `<Input>`, `<Card>`, etc.)
- [ ] No raw HTML form elements (`<button>`, `<input>`, `<select>`)

---

## Typography

- [ ] Headings match scale:
  - `h1` uses `text-2xl font-semibold`
  - `h2` uses `text-xl font-semibold`
  - `h3` uses `text-lg font-semibold`
- [ ] Body text uses `text-sm`
- [ ] Muted text uses `text-muted-foreground`
- [ ] No custom font declarations in components

---

## Spacing

- [ ] Sections spaced with `space-y-6`
- [ ] Cards use `p-6` padding
- [ ] Grids use `gap-4` or `gap-6`
- [ ] Consistent spacing between related elements
- [ ] No arbitrary spacing values (prefer standard Tailwind scale)

---

## Colors

- [ ] All colors use semantic tokens:
  - `bg-background`, `bg-card`, `bg-primary`
  - `text-foreground`, `text-muted-foreground`
  - `border-border`
- [ ] No hardcoded hex colors
- [ ] No raw color names (`blue-600`, `gray-500`, etc.)

---

## Components

- [ ] Buttons use `<Button>` component (not `<button>`)
- [ ] Inputs use `<Input>` component (not `<input>`)
- [ ] Selects use `<Select>` component (not `<select>`)
- [ ] Cards use `<Card>` component structure
- [ ] All UI elements from `components/ui`

---

## Dark Mode

- [ ] Page readable in dark mode
- [ ] No contrast issues (text readable on backgrounds)
- [ ] No invisible borders or text
- [ ] Colors adapt correctly (using semantic tokens)
- [ ] Interactive elements visible and accessible

---

## Layout Consistency

- [ ] Page width consistent with other pages
- [ ] Headings aligned with other pages
- [ ] Content padding matches standard (`p-6` in cards)
- [ ] Page doesn't feel "cramped" or "spacious" compared to others

---

## Navigation

- [ ] Sidebar appears consistent (if applicable)
- [ ] Breadcrumbs aligned and styled correctly
- [ ] Command palette (⌘K) usable and styled
- [ ] Active state indicators work correctly
- [ ] Navigation colors use semantic tokens

---

## Forms

- [ ] All inputs use `<Input>` component
- [ ] All selects use `<Select>` component
- [ ] Labels properly associated (use `<Label>`)
- [ ] Error states styled correctly (use `text-destructive`)
- [ ] Form spacing consistent

---

## Responsive Design

- [ ] Mobile layout doesn't break
- [ ] Tablet layout acceptable
- [ ] Desktop layout optimal
- [ ] No horizontal scrolling
- [ ] Touch targets adequate on mobile (min 44x44px)

---

## Accessibility

- [ ] Sufficient color contrast (WCAG AA minimum)
- [ ] Focus states visible
- [ ] Keyboard navigation works
- [ ] Screen reader labels where needed
- [ ] Interactive elements keyboard accessible

---

## Performance

- [ ] No layout shift on load
- [ ] Images have proper dimensions
- [ ] No excessive re-renders visible
- [ ] Smooth interactions (no jank)

---

## Browser Testing

- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest, if available)

---

## Quick Check Commands

Before marking checklist complete, run:

```bash
# Check for design violations
npm run audit:design

# Type check
npm run typecheck

# Lint
npm run lint
```

---

## If Issues Found

**DO NOT MERGE** if any item fails.

Fix the issue and re-check before submitting for review.

**Exceptions**: Document any legitimate exceptions in PR description.

---

**Last Updated**: 2025-01-XX  
**Maintained By**: Design System Team

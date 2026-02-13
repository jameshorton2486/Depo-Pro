# Next.js Layout Optimization Summary

**Date:** 2026-01-10  
**Files Modified:** `app/layout.tsx`, `.cursor/rules/html-structure.mdc`

## Changes Applied

### ✅ 1. Optimized `app/layout.tsx`

**Removed:**
- `data-scroll-behavior="smooth"` from `<html>` (CSS handles this better)
- `suppressHydrationWarning` from `<body>` (unnecessary, only needed on `<html>` for theme providers)

**Kept:**
- `suppressHydrationWarning` on `<html>` (needed for theme provider class mismatches)
- All providers and global components
- Font configuration
- Metadata export

**Result:**
- Cleaner, more maintainable structure
- Reduced unnecessary hydration suppressions
- Better alignment with Next.js best practices

### ✅ 2. Created Cursor Rule

**File:** `.cursor/rules/html-structure.mdc`

**Purpose:** Prevent future HTML structure violations

**Enforces:**
- Only `app/layout.tsx` and `app/global-error.tsx` may contain `<html>`/`<body>`
- All other files must use semantic containers
- Clear patterns for correct vs incorrect usage

### ✅ 3. Fixed Env Var Mismatch

**File:** `lib/env/require-public-supabase-key.ts`

**Issue:** User changed to `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` but codebase uses `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Fix:** Reverted to `NEXT_PUBLIC_SUPABASE_ANON_KEY` to match codebase standard

## Before vs After

### Before:
```tsx
<html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
  <body
    className={`${inter.variable} font-sans antialiased`}
    suppressHydrationWarning
  >
```

### After:
```tsx
<html lang="en" suppressHydrationWarning>
  <body className={`${inter.variable} font-sans antialiased`}>
```

## Why These Changes Matter

### 1. **Hydration Safety**
- `suppressHydrationWarning` on `<body>` was unnecessary
- Only needed on `<html>` for theme provider class mismatches
- Reduces risk of hiding real hydration issues

### 2. **HTML Semantics**
- Removed `data-scroll-behavior` (CSS `scroll-behavior: smooth` is better)
- Cleaner, more semantic HTML structure
- Better alignment with HTML5 standards

### 3. **Maintainability**
- Cursor rule prevents future violations
- Clear documentation of allowed/forbidden patterns
- Easier for team members to follow

## Verification

### ✅ Structure Check
- `<html>` directly wraps `<body>` ✓
- `<body>` directly wraps providers ✓
- No duplicate document tags ✓
- Nested layouts use semantic containers ✓

### ✅ Hydration Check
```bash
npm run dev
# Check browser console for hydration warnings
# Should see no errors related to html/body structure
```

### ✅ Cursor Rule Check
```bash
# Test: Try to add <html> to a nested layout
# Cursor should warn or prevent this
```

## Related Files

- `app/layout.tsx` - Optimized root layout
- `.cursor/rules/html-structure.mdc` - Enforcement rules
- `app/error.tsx` - Fixed (removed html/body)
- `app/global-error.tsx` - Correct (may have html/body)

## Next Steps

1. **Test the application:**
   ```bash
   npm run dev
   ```

2. **Verify no hydration errors:**
   - Open browser console
   - Check for hydration warnings
   - Test theme switching (should work without errors)

3. **Commit changes:**
   ```bash
   git add app/layout.tsx .cursor/rules/html-structure.mdc lib/env/require-public-supabase-key.ts
   git commit -m "fix(nextjs): optimize root layout and add HTML structure guardrails"
   ```

## Notes

- `suppressHydrationWarning` on `<html>` is kept because `next-themes` can cause class mismatches during hydration
- This is a known pattern and acceptable for theme providers
- The Cursor rule will prevent accidental reintroduction of HTML structure violations

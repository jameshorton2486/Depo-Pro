# Phase 1: Global Foundation Implementation Guide

**Date:** 2025-11-25  
**Priority:** CRITICAL  
**Estimated Time:** 2-3 hours  
**Impact:** Affects entire site

---

## Overview

This phase establishes the visual foundation for the entire site. Every subsequent page and component will build on these changes.

### Files to Modify (in order):
1. `src/app/globals.css` - Color palette refinement
2. `src/components/ui/button.tsx` - Button variants
3. `src/components/Header.tsx` - Dark luxury header
4. `src/components/Footer.tsx` - Dark luxury footer (optional)

---

## Before You Start

### 1. Create a backup:
```powershell
.\scripts\backup-design-files.ps1 -Files "src/app/globals.css","src/components/ui/button.tsx","src/components/Header.tsx"
```

### 2. Create a design branch:
```bash
git checkout -b design/phase-1-global-foundation
```

### 3. Verify your starting point:
```bash
npm run dev
# Visit http://localhost:3000 and take screenshots for before/after
```

---

## Change 1: globals.css - Color Palette Refinement

**File:** `src/app/globals.css`  
**Lines to modify:** ~65-72 (CTA colors), ~140-146 (Aesop colors)  
**Goal:** Remove navy blue, strengthen black/charcoal/gold palette

### Current Code (lines 65-72):
```css
/* CTA - Navy Blue (Full Scale) */
--cta-400: 212 52% 35%;  /* #2D4E79 - Light navy */
--cta-500: 212 52% 30%;  /* #24426C - Medium */
--cta-600: 212 52% 25%;  /* #1E3A5F - Primary CTA */
--cta-700: 212 52% 20%;  /* #1A3050 - Hover state */
--cta-800: 212 52% 15%;  /* #15263D - Active state */
```

### New Code (REPLACE WITH):
```css
/* CTA - Deep Charcoal (Full Scale) - Replacing Navy */
/* Note: Keeping 'cta' name for compatibility, but now using charcoal tones */
--cta-400: 0 0% 35%;     /* #595959 - Light charcoal */
--cta-500: 0 0% 25%;     /* #404040 - Medium charcoal */
--cta-600: 0 0% 18%;     /* #2D2D2D - Primary CTA (matches lux-charcoal) */
--cta-700: 0 0% 12%;     /* #1E1E1E - Hover state */
--cta-800: 0 0% 8%;      /* #141414 - Active state */
```

### Current Code (lines 140-146):
```css
/* Aesop-Inspired Earthy Palette (Legacy) */
--aesop-cream: 40 29% 96%;   /* soft parchment */
--aesop-sand: 37 23% 90%;    /* warm sand */
--aesop-olive: 81 14% 30%;   /* deep olive green */
--aesop-charcoal: 0 0% 14%;  /* dark charcoal */
--aesop-olive-foreground: 40 29% 96%;
--aesop-charcoal-foreground: 96 14% 92%;
```

### New Code (COMMENT OUT - Deprecate but don't delete yet):
```css
/* Aesop-Inspired Earthy Palette (DEPRECATED - Use lux palette instead) */
/* MIGRATION NOTE: These colors are being phased out in favor of lux-* equivalents:
   - aesop-cream → lux-cream
   - aesop-sand → lux-pearl
   - aesop-olive → lux-sage (or remove - avoid greens in new design)
   - aesop-charcoal → lux-charcoal
   Keep these commented for now to avoid breaking changes, remove in Phase 6.
*/
/*
--aesop-cream: 40 29% 96%;
--aesop-sand: 37 23% 90%;
--aesop-olive: 81 14% 30%;
--aesop-charcoal: 0 0% 14%;
--aesop-olive-foreground: 40 29% 96%;
--aesop-charcoal-foreground: 96 14% 92%;
*/
```

### Testing:
1. Save the file
2. Check dev server - it should reload automatically
3. Look for any visual breaks (there shouldn't be any major ones since we kept CTA naming)
4. Run: `npm run build` to verify no TypeScript errors

---

## Change 2: button.tsx - Luxury Button Variants

**File:** `src/components/ui/button.tsx`  
**Goal:** Create elegant button variants with black/gold aesthetic

### Current Button Variants (Simplified View):
The file currently has standard shadcn/ui button variants. We need to customize them.

### Strategy:
1. Keep the existing shadcn structure
2. Modify the `buttonVariants` object to use lux colors
3. Focus on `default`, `outline`, and `ghost` variants

### New Code for buttonVariants:

Find the `buttonVariants` definition (around line 10-40) and replace it with:

```typescript
const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lux-gold focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-lux-black text-lux-white border border-lux-black hover:bg-lux-charcoal hover:border-lux-gold shadow-sm hover:shadow-md",
        
        destructive:
          "bg-semantic-error-500 text-lux-white hover:bg-semantic-error-500/90 shadow-sm",
        
        outline:
          "border-2 border-lux-gold bg-transparent text-lux-black hover:bg-lux-gold hover:text-lux-black shadow-sm hover:shadow-md",
        
        secondary:
          "bg-lux-pearl text-lux-black border border-lux-silver hover:bg-lux-silver hover:border-lux-gray-light",
        
        ghost:
          "text-lux-gray-dark hover:bg-lux-pearl hover:text-lux-black",
        
        link:
          "text-lux-black underline-offset-4 hover:underline hover:text-lux-gold",
      },
      size: {
        default: "h-11 px-6 py-2.5",
        sm: "h-9 rounded-md px-4 text-xs",
        lg: "h-13 rounded-lg px-8 text-base font-semibold",
        xl: "h-14 rounded-xl px-10 text-lg font-semibold",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)
```

### Key Changes Explained:
- **default**: Black button with gold border on hover (luxury primary)
- **outline**: Gold border, transparent background, becomes gold-filled on hover
- **secondary**: Soft grey button for secondary actions
- **ghost**: Minimal button for tertiary actions
- **link**: Text-only link with gold hover

### Testing:
1. Save the file
2. Navigate to any page with buttons (home, product pages, etc.)
3. Verify buttons look elegant and cohesive
4. Test hover states
5. Check mobile responsive sizing

---

## Change 3: Header.tsx - Dark Luxury Header

**File:** `src/components/Header.tsx`  
**Lines to modify:** ~29-100  
**Goal:** Create elegant dark header with gold accents

### Current Header Background (line ~29-35):
```typescript
<header
  className={`sticky top-0 z-50 transition-all duration-300 ${
    isScrolled
      ? "bg-lux-white/95 backdrop-blur-md shadow-sm"
      : "bg-lux-cream"
  }`}
>
```

### New Code (REPLACE WITH):
```typescript
<header
  className={`sticky top-0 z-50 transition-all duration-300 border-b ${
    isScrolled
      ? "bg-lux-black/98 backdrop-blur-md shadow-lg border-lux-charcoal"
      : "bg-lux-black border-lux-charcoal/50"
  }`}
>
```

### Current Navigation Links (line ~49-61):
```typescript
<nav className="hidden lg:flex items-center space-x-10">
  {navLinks.map((link) => (
    <Link
      key={link.href}
      href={link.href}
      className="relative text-sm font-medium text-lux-gray-dark hover:text-lux-black transition-colors tracking-wide group"
    >
      {link.label}
      {/* Underline animation on hover */}
      <span className="absolute bottom-0 left-0 w-0 h-px bg-lux-gold transition-all duration-300 group-hover:w-full" />
    </Link>
  ))}
</nav>
```

### New Code (REPLACE WITH):
```typescript
<nav className="hidden lg:flex items-center space-x-10">
  {navLinks.map((link) => (
    <Link
      key={link.href}
      href={link.href}
      className="relative text-sm font-light text-lux-silver hover:text-lux-white transition-colors tracking-[0.08em] uppercase group"
    >
      {link.label}
      {/* Gold underline animation on hover */}
      <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-lux-gold transition-all duration-300 group-hover:w-full" />
    </Link>
  ))}
</nav>
```

### Current Icon Buttons (line ~64-83):
```typescript
<div className="flex items-center space-x-4 md:space-x-6">
  {/* Search */}
  <button
    aria-label="Search"
    className="p-2 text-lux-gray hover:text-lux-black transition-colors"
  >
    <Search className="w-5 h-5" strokeWidth={1.5} />
  </button>

  {/* Account */}
  <Link
    href="/account"
    className="p-2 text-lux-gray hover:text-lux-black transition-colors hidden sm:block"
    aria-label="Account"
  >
    <User className="w-5 h-5" strokeWidth={1.5} />
  </Link>

  {/* Cart */}
  <CartIcon />
```

### New Code (REPLACE WITH):
```typescript
<div className="flex items-center space-x-4 md:space-x-6">
  {/* Search */}
  <button
    aria-label="Search"
    className="p-2 text-lux-silver hover:text-lux-white transition-all duration-200 hover:scale-110"
  >
    <Search className="w-5 h-5" strokeWidth={1.5} />
  </button>

  {/* Account */}
  <Link
    href="/account"
    className="p-2 text-lux-silver hover:text-lux-white transition-all duration-200 hover:scale-110 hidden sm:block"
    aria-label="Account"
  >
    <User className="w-5 h-5" strokeWidth={1.5} />
  </Link>

  {/* Cart */}
  <div className="text-lux-silver hover:text-lux-white transition-colors">
    <CartIcon />
  </div>
```

### Current CTA Button (line ~85-91):
```typescript
{/* Sell Button - Desktop */}
<Button
  asChild
  className="hidden md:inline-flex bg-lux-black hover:bg-lux-charcoal text-lux-white font-medium px-6"
>
  <Link href="/sell">Sell With Us</Link>
</Button>
```

### New Code (REPLACE WITH):
```typescript
{/* Consign Button - Desktop */}
<Button
  asChild
  variant="outline"
  size="default"
  className="hidden md:inline-flex font-normal tracking-wide"
>
  <Link href="/sell">Consign With Us</Link>
</Button>
```

### Logo Update (line ~39-46):
```typescript
<Link href="/" className="flex items-center group">
  <span className="font-logo text-xl md:text-2xl tracking-tight text-lux-black">
    Kollect
  </span>
  <span className="font-logo text-xl md:text-2xl tracking-tight text-lux-gold">
    -It
  </span>
</Link>
```

### New Code (REPLACE WITH):
```typescript
<Link href="/" className="flex items-center group">
  <span className="font-logo text-xl md:text-2xl tracking-tight text-lux-white group-hover:text-lux-silver transition-colors">
    Kollect
  </span>
  <span className="font-logo text-xl md:text-2xl tracking-tight text-lux-gold group-hover:text-lux-gold-light transition-colors">
    -It
  </span>
</Link>
```

### Testing:
1. Save the file
2. Refresh homepage - header should now be dark
3. Scroll down - verify sticky behavior and shadow
4. Test all navigation links
5. Verify logo, icons, and CTA button look good
6. Check mobile menu (burger icon should also be light colored)

**Note:** If CartIcon component has its own colors, you may need to update it separately to work with the dark header.

---

## Mobile Menu Updates

The mobile menu also needs updating. Find the mobile menu section (around line ~103-127) and update text colors:

### Current Mobile Menu Background:
Look for the mobile menu container and update:

```typescript
// Change this (if it exists):
className="lg:hidden ... bg-lux-cream"

// To this:
className="lg:hidden ... bg-lux-black border-t border-lux-charcoal"
```

### Mobile Menu Links:
```typescript
// Change this:
className="block py-3 text-base font-medium text-lux-gray-dark hover:text-lux-black"

// To this:
className="block py-3 text-base font-light text-lux-silver hover:text-lux-white tracking-wide transition-colors"
```

---

## Verification Checklist

After implementing all changes, verify:

- [ ] Color palette updated in globals.css (CTA = charcoal, Aesop = deprecated)
- [ ] Button variants updated and tested on multiple pages
- [ ] Header is dark with light text and gold accents
- [ ] Header logo is visible (white + gold)
- [ ] Navigation links have gold underline on hover
- [ ] Icons are visible (light colored)
- [ ] CTA button uses new outline variant
- [ ] Mobile menu also uses dark theme
- [ ] No console errors
- [ ] Site builds successfully: `npm run build`
- [ ] Screenshots captured for before/after comparison

---

## Common Issues & Fixes

### Issue: CartIcon not visible on dark background
**Fix:** Update `src/components/CartIcon.tsx` to use light colors:
```typescript
// Find text color classes and change to:
className="text-lux-silver hover:text-lux-white"
```

### Issue: Mobile menu toggle icon not visible
**Fix:** In Header.tsx, find the mobile menu toggle button and update:
```typescript
className="lg:hidden p-2 text-lux-silver hover:text-lux-white transition-colors"
```

### Issue: Buttons look too bold/heavy
**Fix:** In button.tsx, reduce font-weight:
```typescript
// Change "font-medium" to "font-normal" in base classes
```

---

## Next Steps

Once Phase 1 is complete:

1. Commit changes:
```bash
git add .
git commit -m "Phase 1: Global foundation - dark header, refined colors, luxury buttons"
```

2. Update design log:
- Mark Phase 1 tasks as complete in `design/DESIGN-REVIEW-LOG.md`
- Add completion date

3. Take "after" screenshots for documentation

4. Move to Phase 2: Homepage Sections

---

## Rollback Instructions

If something goes wrong:

1. Find your backup directory (created at the start)
2. Restore files:
```powershell
Copy-Item "design/backups/[timestamp]/[relative-path]" -Destination "src/[relative-path]" -Force
```

3. Or use git:
```bash
git checkout src/app/globals.css
git checkout src/components/ui/button.tsx
git checkout src/components/Header.tsx
```

---

**Estimated completion time:** 2-3 hours including testing  
**Next:** Phase 2 - Homepage Hero & Sections

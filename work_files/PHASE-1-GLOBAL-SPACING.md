# Phase 1: Global Spacing Corrections

**CRITICAL: Complete this BEFORE any page-specific work**

**Date:** 2025-11-25  
**Priority:** SYSTEM-LEVEL (Affects every page)  
**Estimated Time:** 1-2 hours  
**Impact:** Establishes consistent spacing rhythm across entire site

---

## 🎯 Overview

Before touching individual pages, we need to fix the spacing foundation. Currently, your site uses:
- Mixed horizontal padding (px-4, px-6, px-8)
- Inconsistent section spacing (py-12, py-16, py-20)
- Variable grid gaps (gap-4, gap-6, gap-8)
- Different card padding across components

**This phase fixes all of that at the system level.**

---

## 📋 Pre-Implementation Checklist

- [ ] Phase 1 (Global Foundation - Colors/Buttons/Header) is complete
- [ ] Git working tree is clean
- [ ] Dev server is running (`npm run dev`)
- [ ] "Before" screenshots captured

---

## 🔧 The Four Core Fixes

### Fix 1: Global Horizontal Padding
### Fix 2: Section Vertical Spacing
### Fix 3: Grid Gap Standardization
### Fix 4: Card Padding Consistency

---

## 🚀 Getting Started

### Step 1: Create Branch & Backup
```powershell
# Create branch
git checkout -b design/phase-1-global-spacing

# Backup files
.\scripts\backup-design-files.ps1 -Files "src/app/globals.css","src/components/AesopSection.tsx","tailwind.config.ts"
```

---

## 📝 Fix 1: Global Horizontal Padding (30 minutes)

**Goal:** Standardize horizontal padding across all pages

**Problem:**
```tsx
// Current: Mixed values everywhere
<div className="px-4">          // Some components
<div className="px-6">          // Other components  
<div className="px-8">          // More components
<div className="container">     // Sometimes this
<div className="max-w-7xl">    // Sometimes that
```

**Solution:** Define standard container padding in globals.css

---

### Change 1.1: Update globals.css

**File:** `src/app/globals.css`  
**Location:** After line ~250 (in the Container section)

**Current Code:**
```css
/* ============================================
   CONTAINER
   ============================================ */

.container {
  width: 100%;
  margin-left: auto;
  margin-right: auto;
  padding-left: 1rem;
  padding-right: 1rem;
}
```

**New Code (REPLACE WITH):**
```css
/* ============================================
   CONTAINER & PAGE LAYOUT
   ============================================ */

/* Standard container with responsive horizontal padding */
.container {
  width: 100%;
  margin-left: auto;
  margin-right: auto;
  /* Responsive horizontal padding - Luxury spacing */
  padding-left: 1rem;      /* 16px - Mobile */
  padding-right: 1rem;
}

@media (min-width: 768px) {
  .container {
    padding-left: 1.5rem;  /* 24px - Tablet */
    padding-right: 1.5rem;
  }
}

@media (min-width: 1024px) {
  .container {
    padding-left: 2rem;    /* 32px - Desktop */
    padding-right: 2rem;
    max-width: 1440px;     /* Maximum content width for luxury feel */
  }
}

/* Page wrapper utilities */
.page-padding {
  @apply px-4 md:px-6 lg:px-8;
}

.page-padding-narrow {
  @apply px-4 md:px-6;
}

.page-padding-wide {
  @apply px-6 md:px-8 lg:px-12;
}
```

**Testing:**
1. Save file
2. Check any page - horizontal spacing should feel more consistent
3. Verify mobile (375px), tablet (768px), desktop (1440px)

---

## 📝 Fix 2: Section Vertical Spacing (30 minutes)

**Goal:** Standardize vertical spacing for all page sections

**Problem:**
```tsx
// Current: Inconsistent vertical spacing
<section className="py-12">      // Tight
<section className="py-16">      // Medium
<section className="py-20">      // Loose
<div className="mt-8 mb-12">    // Custom
```

**Solution:** Define three section spacing levels

---

### Change 2.1: Add Section Spacing to globals.css

**File:** `src/app/globals.css`  
**Location:** After the container section you just updated

**Add This Code (NEW SECTION):**
```css
/* ============================================
   SECTION VERTICAL SPACING SYSTEM
   Luxury requires generous, consistent spacing
   ============================================ */

/* Section spacing utilities - Use these for ALL page sections */

/* Tight sections - For compact content, FAQs, simple lists */
.section-tight {
  padding-top: 3rem;      /* 48px */
  padding-bottom: 3rem;
}

@media (min-width: 768px) {
  .section-tight {
    padding-top: 4rem;    /* 64px */
    padding-bottom: 4rem;
  }
}

/* Normal sections - Default for most content blocks */
.section-normal {
  padding-top: 4rem;      /* 64px */
  padding-bottom: 4rem;
}

@media (min-width: 768px) {
  .section-normal {
    padding-top: 5rem;    /* 80px */
    padding-bottom: 5rem;
  }
}

@media (min-width: 1024px) {
  .section-normal {
    padding-top: 6rem;    /* 96px */
    padding-bottom: 6rem;
  }
}

/* Grand sections - For heroes, major content blocks */
.section-grand {
  padding-top: 5rem;      /* 80px */
  padding-bottom: 5rem;
}

@media (min-width: 768px) {
  .section-grand {
    padding-top: 7rem;    /* 112px */
    padding-bottom: 7rem;
  }
}

@media (min-width: 1024px) {
  .section-grand {
    padding-top: 9rem;    /* 144px */
    padding-bottom: 9rem;
  }
}

/* Tailwind utility class versions */
.py-section-tight {
  @apply section-tight;
}

.py-section-normal {
  @apply section-normal;
}

.py-section-grand {
  @apply section-grand;
}
```

---

### Change 2.2: Update tailwind.config.ts

**File:** `tailwind.config.ts`  
**Location:** Inside `theme.extend.spacing` (around line 195-206)

**Current Code:**
```typescript
spacing: {
  xs: "var(--spacing-xs)",
  sm: "var(--spacing-sm)",
  md: "var(--spacing-md)",
  lg: "var(--spacing-lg)",
  xl: "var(--spacing-xl)",
  "2xl": "var(--spacing-2xl)",
  "3xl": "var(--spacing-3xl)",
  "section-small": "2rem",
  "section": "4rem",
  "section-large": "6rem",
},
```

**New Code (REPLACE WITH):**
```typescript
spacing: {
  xs: "var(--spacing-xs)",
  sm: "var(--spacing-sm)",
  md: "var(--spacing-md)",
  lg: "var(--spacing-lg)",
  xl: "var(--spacing-xl)",
  "2xl": "var(--spacing-2xl)",
  "3xl": "var(--spacing-3xl)",
  
  // Section spacing tokens (use these for vertical section padding)
  "section-tight": "3rem",      // 48px mobile, 64px desktop
  "section-normal": "4rem",     // 64px mobile, 96px desktop
  "section-grand": "5rem",      // 80px mobile, 144px desktop
  
  // Legacy (kept for compatibility, prefer section-* above)
  "section-small": "2rem",
  "section": "4rem",
  "section-large": "6rem",
},
```

---

## 📝 Fix 3: Grid Gap Standardization (15 minutes)

**Goal:** Limit grid gaps to three consistent values

**Problem:**
```tsx
// Current: Too many gap values
gap-4    // 16px
gap-6    // 24px
gap-8    // 32px
gap-10   // 40px
gap-12   // 48px
gap-y-10 // 40px vertical only
```

**Solution:** Standardize to three values

---

### Change 3.1: Add Gap Standards to globals.css

**File:** `src/app/globals.css`  
**Location:** After the section spacing you just added

**Add This Code (NEW SECTION):**
```css
/* ============================================
   GRID & FLEX GAP SYSTEM
   Consistent spacing between elements
   ============================================ */

/* Standard gap utilities - Use only these three */

/* Standard gap - Use for most grids and flex layouts */
.gap-standard {
  gap: 1.5rem;  /* 24px */
}

@media (min-width: 768px) {
  .gap-standard {
    gap: 2rem;  /* 32px */
  }
}

/* Luxury gap - Use for hero sections, premium content */
.gap-luxury {
  gap: 2rem;    /* 32px */
}

@media (min-width: 768px) {
  .gap-luxury {
    gap: 2.5rem;  /* 40px */
  }
}

@media (min-width: 1024px) {
  .gap-luxury {
    gap: 3rem;    /* 48px */
  }
}

/* Hero gap - Only for hero sections */
.gap-hero {
  gap: 2.5rem;  /* 40px */
}

@media (min-width: 768px) {
  .gap-hero {
    gap: 3rem;    /* 48px */
  }
}

@media (min-width: 1024px) {
  .gap-hero {
    gap: 4rem;    /* 64px */
  }
}

/* Quick reference:
   - Most product grids: gap-standard (gap-6 md:gap-8)
   - Feature sections: gap-luxury (gap-8 md:gap-10 lg:gap-12)
   - Hero sections: gap-hero (gap-10 md:gap-12 lg:gap-16)
*/
```

---

### Change 3.2: Define Gap Token Mapping

**File:** `tailwind.config.ts`  
**Location:** Add new section in `theme.extend` after spacing

**Add This Code (NEW SECTION):**
```typescript
// Inside theme.extend, after spacing:

gap: {
  standard: "1.5rem",   // 24px mobile, 32px desktop
  luxury: "2rem",       // 32px mobile, 48px desktop  
  hero: "2.5rem",       // 40px mobile, 64px desktop
},
```

---

## 📝 Fix 4: Card Padding Consistency (15 minutes)

**Goal:** Standardize padding for all card-style components

**Problem:**
```tsx
// Current: Cards use different padding
<div className="p-4">     // Product cards
<div className="p-6">     // Testimonial cards
<div className="p-5">     // Category cards
<div className="px-6 py-4">  // Some other cards
```

**Solution:** Two standard card padding levels

---

### Change 4.1: Add Card Padding to globals.css

**File:** `src/app/globals.css`  
**Location:** After the gap system you just added

**Add This Code (NEW SECTION):**
```css
/* ============================================
   CARD PADDING SYSTEM
   Consistent internal spacing for all cards
   ============================================ */

/* Standard card padding - Use for most cards */
.card-padding {
  padding: 1.5rem;  /* 24px */
}

@media (min-width: 768px) {
  .card-padding {
    padding: 2rem;  /* 32px */
  }
}

/* Compact card padding - Use for dense layouts */
.card-padding-compact {
  padding: 1rem;    /* 16px */
}

@media (min-width: 768px) {
  .card-padding-compact {
    padding: 1.25rem;  /* 20px */
  }
}

/* Luxury card padding - Use for premium content */
.card-padding-luxury {
  padding: 2rem;    /* 32px */
}

@media (min-width: 768px) {
  .card-padding-luxury {
    padding: 2.5rem;  /* 40px */
  }
}

/* Quick reference for card padding:
   - Product cards: card-padding (p-6 md:p-8)
   - Testimonials: card-padding-luxury (p-8 md:p-10)
   - List items: card-padding-compact (p-4 md:p-5)
*/
```

---

### Change 4.2: Update tailwind.config.ts for Card Padding

**File:** `tailwind.config.ts`  
**Location:** Add to `theme.extend` after gap

**Add This Code:**
```typescript
// Inside theme.extend, after gap:

padding: {
  "card": "1.5rem",            // 24px mobile, 32px desktop
  "card-compact": "1rem",      // 16px mobile, 20px desktop
  "card-luxury": "2rem",       // 32px mobile, 40px desktop
},
```

---

## 📝 Fix 5: Update AesopSection Component (20 minutes)

**Goal:** Make AesopSection use the new spacing system

**File:** `src/components/AesopSection.tsx`

---

### Current AesopSection (Simplified):
```tsx
export function AesopSection({ 
  variant = "cream",
  children 
}: AesopSectionProps) {
  const variants = {
    cream: "bg-surface-50",
    charcoal: "bg-surface-900 text-surface-0",
    olive: "bg-aesop-olive text-aesop-olive-foreground",
    // etc...
  }
  
  return (
    <section className={`py-16 ${variants[variant]}`}>
      <div className="container mx-auto px-4">
        {children}
      </div>
    </section>
  )
}
```

---

### New AesopSection (REPLACE ENTIRE FILE):

**File:** `src/components/AesopSection.tsx`

```tsx
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AesopSectionProps {
  children: ReactNode;
  variant?: "light" | "mid" | "dark";
  spacing?: "tight" | "normal" | "grand";
  className?: string;
}

/**
 * AesopSection - Standardized section wrapper
 * 
 * Uses the new spacing system:
 * - Light/Mid/Dark backgrounds (no more olive/aesop colors)
 * - Tight/Normal/Grand vertical spacing
 * - Consistent horizontal padding via container
 * 
 * Usage:
 * <AesopSection variant="dark" spacing="grand">
 *   <h2>Section Title</h2>
 *   <p>Content</p>
 * </AesopSection>
 */
export function AesopSection({ 
  children,
  variant = "light",
  spacing = "normal",
  className = ""
}: AesopSectionProps) {
  // Background variants - simplified to 3 options
  const backgroundVariants = {
    light: "bg-lux-cream text-lux-black",
    mid: "bg-lux-pearl text-lux-black",
    dark: "bg-lux-charcoal text-lux-white",
  };
  
  // Spacing variants using new system
  const spacingVariants = {
    tight: "section-tight",
    normal: "section-normal", 
    grand: "section-grand",
  };
  
  return (
    <section 
      className={cn(
        backgroundVariants[variant],
        spacingVariants[spacing],
        className
      )}
    >
      <div className="container mx-auto">
        {children}
      </div>
    </section>
  );
}

export default AesopSection;
```

**Key Changes:**
1. Simplified variants to `light`, `mid`, `dark` (removed olive/aesop)
2. Uses new spacing system (`tight`, `normal`, `grand`)
3. Container handles horizontal padding automatically
4. Removed explicit `px-4` since container now handles it

---

## ✅ Verification Steps

### 1. Visual Check (10 minutes)
```bash
npm run dev
```

Visit these pages and verify spacing looks more consistent:
- Homepage (sections should have better rhythm)
- About page (consistent vertical spacing)
- Product pages (cards have uniform padding)

### 2. Build Check
```bash
npm run type-check
npm run build
```

Should complete with zero errors.

### 3. Responsive Check
Test at these breakpoints:
- 375px (mobile)
- 768px (tablet)
- 1024px (small desktop)
- 1440px (large desktop)

**What to look for:**
- Sections have generous breathing room
- Content doesn't touch edges on mobile
- Desktop feels spacious but not empty
- Grid gaps feel consistent across pages

---

## 📊 Before/After Comparison

### Before:
```tsx
// Mixed spacing everywhere
<section className="py-12">
  <div className="container px-4">
    <div className="grid gap-4">
      <div className="p-4">Card</div>
    </div>
  </div>
</section>
```

### After:
```tsx
// Consistent spacing system
<AesopSection variant="light" spacing="normal">
  <div className="grid gap-standard">
    <div className="card-padding">Card</div>
  </div>
</AesopSection>
```

---

## 🐛 Common Issues & Fixes

### Issue: Sections still look cramped
**Fix:** Make sure you're using `section-normal` not `py-16`. The responsive values are critical.

### Issue: Container padding not working
**Fix:** Verify container class is on elements, and that you updated globals.css correctly.

### Issue: Gaps look wrong
**Fix:** Use the new gap classes (`gap-standard`, `gap-luxury`, `gap-hero`) not arbitrary values.

### Issue: Cards still have inconsistent padding
**Fix:** Search for `p-4`, `p-5`, `p-6` in card components and replace with `card-padding` class.

---

## 🔄 Rollback Instructions

If something breaks:

```powershell
# Restore from backup
Copy-Item "design/backups/[timestamp]/app/globals.css" -Destination "src/app/globals.css" -Force
Copy-Item "design/backups/[timestamp]/components/AesopSection.tsx" -Destination "src/components/AesopSection.tsx" -Force

# Or use git
git checkout src/app/globals.css
git checkout tailwind.config.ts
git checkout src/components/AesopSection.tsx
```

---

## 📝 Summary of Changes

✅ **globals.css**
- Added responsive container padding
- Added section spacing system (tight/normal/grand)
- Added gap system (standard/luxury/hero)
- Added card padding system (compact/standard/luxury)

✅ **tailwind.config.ts**
- Added section spacing tokens
- Added gap tokens
- Added card padding tokens

✅ **AesopSection.tsx**
- Simplified to 3 background variants
- Uses new spacing system
- Container handles padding automatically

---

## ✅ Completion Checklist

- [ ] All changes made to globals.css
- [ ] tailwind.config.ts updated
- [ ] AesopSection.tsx updated
- [ ] Dev server tested (no visual breaks)
- [ ] Build succeeds (`npm run build`)
- [ ] Responsive tested (mobile, tablet, desktop)
- [ ] Screenshots captured (before/after)
- [ ] Changes committed with descriptive message
- [ ] DESIGN-REVIEW-LOG.md updated

---

## 🎯 What's Next?

Once this phase is complete, you have:
- ✅ Consistent horizontal padding across all pages
- ✅ Three clear section spacing levels
- ✅ Standardized grid gaps
- ✅ Uniform card padding

**Now you're ready for:** Phase 2 - Homepage Spacing (detailed page-by-page fixes)

---

## 📊 Commit Message Template

```bash
git add .
git commit -m "Phase 1: Global spacing system implementation

- Added responsive container padding (mobile: 16px, tablet: 24px, desktop: 32px)
- Defined section spacing system (tight/normal/grand with responsive scaling)
- Standardized grid gaps (standard/luxury/hero)
- Created card padding system (compact/standard/luxury)
- Updated AesopSection to use new spacing system
- Simplified background variants to light/mid/dark

All pages now inherit consistent spacing foundation.
Tested across mobile (375px), tablet (768px), desktop (1440px).
Build succeeds with zero errors."
```

---

**Estimated completion time:** 1-2 hours  
**Next:** Phase 2 - Homepage Spacing Audit & Fixes

/* ============================================================================
   NAVIGATION AUDIT
   Ensures nav ↔ permissions alignment and structural integrity
   Works with lib/navigation.ts single-file structure
============================================================================ */

import path from 'path';
import { NAVIGATION } from '../lib/navigation';
import { ROUTE_ACCESS } from '../lib/permissions/route-access';

type NavItem = {
  id: string;
  label: string;
  href: string;
  icon?: unknown;
  description?: string;
  badge?: string | number;
};

type NavSection = {
  section: string;
  icon?: unknown;
  items: NavItem[];
  collapsed?: boolean;
};

type NavigationSchema = NavSection[];

const seenIds = new Set<string>();
const seenRoutes = new Map<string, Array<{ role: string; label: string }>>();
let warnings = 0;
let passed = 0;
let failed = 0;

console.log(`
=======================================================================
               DEPO-PRO NAVIGATION AUDIT
=======================================================================
`);

// ============================================================================
// STEP 1: Load Navigation Schemas
// ============================================================================

console.log(`[STEP 1] Loading navigation from lib/navigation.ts...`);

const roleSchemas: Array<{ role: string; schema: NavigationSchema }> = [];

for (const [role, schema] of Object.entries(NAVIGATION)) {
  roleSchemas.push({ role: role.toUpperCase(), schema });
}

if (roleSchemas.length === 0) {
  console.error('[FAIL] No navigation schemas found');
  process.exit(1);
}

console.log(`[INFO] Found ${roleSchemas.length} navigation schemas\n`);

// ============================================================================
// STEP 2: Validate Structure and IDs
// ============================================================================

console.log(`[STEP 2] Validating navigation structure...\n`);

for (const { role, schema } of roleSchemas) {
  console.log(`[CHECK] Validating ${role} navigation...`);
  
  if (!Array.isArray(schema)) {
    console.error(`[FAIL] ${role} schema is not an array`);
    failed++;
    continue;
  }

  for (const section of schema) {
    if (!section.section || !Array.isArray(section.items)) {
      console.error(`[FAIL] ${role}: Invalid section structure`);
      failed++;
      continue;
    }

    for (const item of section.items) {
      // Check for required fields
      if (!item.label || !item.href) {
        console.error(`[FAIL] ${role}: Missing label or href in section "${section.section}"`);
        failed++;
        continue;
      }

      // Check for ID
      if (!item.id) {
        console.error(`[FAIL] ${role}: Missing id for "${item.label}" in section "${section.section}"`);
        failed++;
        continue;
      }

      // Check ID format (should be role-section-label)
      const expectedPrefix = `${role.toLowerCase()}-${section.section.toLowerCase().replace(/\s+/g, '-')}-`;
      if (!item.id.startsWith(expectedPrefix)) {
        console.warn(`[WARN] ${role}: ID "${item.id}" doesn't follow convention (expected prefix: "${expectedPrefix}")`);
        warnings++;
      }

      // Check for duplicate IDs
      if (seenIds.has(item.id)) {
        console.error(`[FAIL] Duplicate nav id detected: "${item.id}"`);
        failed++;
        continue;
      }
      seenIds.add(item.id);

      // Track routes
      if (!seenRoutes.has(item.href)) {
        seenRoutes.set(item.href, []);
      }
      seenRoutes.get(item.href)!.push({ role, label: item.label });

      passed++;
    }
  }

  console.log(`[PASS] ${role} navigation OK\n`);
}

// ============================================================================
// STEP 3: Cross-reference with Route Access
// ============================================================================

console.log(`[STEP 3] Cross-referencing with route permissions...\n`);

// Check each navigation route
for (const [href, navItems] of seenRoutes.entries()) {
  // Normalize href (remove query params)
  const normalizedHref = href.split('?')[0];
  
  // Check if route is registered
  const registeredRoles = ROUTE_ACCESS[normalizedHref];
  
  if (!registeredRoles) {
    // Check if it's a prefix match
    const prefixMatch = Object.keys(ROUTE_ACCESS).find(route => 
      normalizedHref.startsWith(route + '/') || normalizedHref === route
    );
    
    if (!prefixMatch) {
      console.warn(`[WARN] Route "${normalizedHref}" not found in ROUTE_ACCESS (used by: ${navItems.map(n => n.role).join(', ')})`);
      warnings++;
    }
  } else {
    // Verify roles match
    for (const navItem of navItems) {
      if (!registeredRoles.includes(navItem.role as any)) {
        console.warn(`[WARN] ${navItem.role} navigation includes "${normalizedHref}" but route access doesn't include ${navItem.role}`);
        warnings++;
      }
    }
  }
}

console.log(`[PASS] Route access cross-reference complete\n`);

// ============================================================================
// SUMMARY
// ============================================================================

console.log(`
=======================================================================
                       NAV AUDIT COMPLETE
=======================================================================

RESULTS SUMMARY:
-----------------
  Passed: ${passed}
  Warnings: ${warnings}
  Failed: ${failed}

STATUS: ${failed > 0 ? '❌ FAILED' : warnings > 0 ? '⚠️  WARNINGS' : '✅ PASSED'}
`);

if (failed > 0) {
  console.error('\n❌ Navigation audit failed. Please fix the issues above.');
  process.exit(1);
}

if (warnings > 0) {
  console.warn('\n⚠️  Navigation audit completed with warnings. Review above.');
  process.exit(0);
}

console.log('\n✅ Navigation is consistent and safe.\n');
process.exit(0);

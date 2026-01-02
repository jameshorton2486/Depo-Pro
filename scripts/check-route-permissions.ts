#!/usr/bin/env npx tsx
// ═══════════════════════════════════════════════════════════════════════════════
// CI CHECK: ROUTE PERMISSIONS
// scripts/check-route-permissions.ts
//
// Validates that navigation and route permissions are in sync
// Run in CI to prevent permission mismatches from reaching production
//
// Usage:
//   npx tsx scripts/check-route-permissions.ts
//   npm run check:permissions
// ═══════════════════════════════════════════════════════════════════════════════

import { NAVIGATION, type UserRole } from '../lib/navigation';
import { ROUTE_PERMISSIONS } from '../lib/auth/require-role';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface ValidationError {
  type: 'error' | 'warning';
  message: string;
  route?: string;
  details?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function getAllNavigationRoutes(): Map<string, UserRole[]> {
  const routeMap = new Map<string, UserRole[]>();

  for (const role of Object.keys(NAVIGATION) as UserRole[]) {
    NAVIGATION[role].forEach((section) => {
      section.items.forEach((item) => {
        if (item.href) {
          const existing = routeMap.get(item.href) || [];
          if (!existing.includes(role)) {
            routeMap.set(item.href, [...existing, role]);
          }
        }
      });
    });
  }

  return routeMap;
}

function validatePermissions(): ValidationError[] {
  const errors: ValidationError[] = [];
  const navRoutes = getAllNavigationRoutes();

  // Check 1: Every navigation route should have permission defined
  console.log('\n📋 Checking navigation routes have permissions...');
  
  for (const [route, navRoles] of navRoutes) {
    // Find matching permission (exact or prefix match)
    let permRoles: string[] | undefined;
    
    // Try exact match first
    if (ROUTE_PERMISSIONS[route]) {
      permRoles = ROUTE_PERMISSIONS[route];
    } else {
      // Try prefix match
      const sortedPerms = Object.keys(ROUTE_PERMISSIONS).sort((a, b) => b.length - a.length);
      for (const perm of sortedPerms) {
        if (route.startsWith(perm + '/') || route === perm) {
          permRoles = ROUTE_PERMISSIONS[perm];
          break;
        }
      }
    }

    if (!permRoles) {
      errors.push({
        type: 'warning',
        message: `Route "${route}" is in navigation but has no permission defined`,
        route,
        details: `Shown to: ${navRoles.join(', ')}`,
      });
      continue;
    }

    // Check 2: Roles in navigation should be subset of roles in permissions
    for (const navRole of navRoles) {
      if (navRole === 'ADMIN') continue; // Admin always has access
      
      if (!permRoles.includes(navRole)) {
        errors.push({
          type: 'error',
          message: `Role "${navRole}" can see route "${route}" in navigation but is NOT in ROUTE_PERMISSIONS`,
          route,
          details: `Nav roles: ${navRoles.join(', ')} | Perm roles: ${permRoles.join(', ')}`,
        });
      }
    }
  }

  // Check 3: Look for potential dead links (routes in permissions but not navigation)
  console.log('\n📋 Checking for orphaned permission definitions...');
  
  const navRouteSet = new Set(navRoutes.keys());
  for (const [permRoute] of Object.entries(ROUTE_PERMISSIONS)) {
    // Skip if any nav route starts with this permission route
    const hasNavChild = Array.from(navRouteSet).some(
      (navRoute) => navRoute === permRoute || navRoute.startsWith(permRoute + '/')
    );
    
    if (!hasNavChild) {
      // This is info only - some routes may be API-only or hidden intentionally
      console.log(`  ℹ️  Permission for "${permRoute}" exists but route is not in any navigation`);
    }
  }

  // Check 4: Validate navigation structure
  console.log('\n📋 Validating navigation structure...');
  
  for (const role of Object.keys(NAVIGATION) as UserRole[]) {
    const nav = NAVIGATION[role];
    
    if (!nav || nav.length === 0) {
      errors.push({
        type: 'warning',
        message: `Role "${role}" has no navigation defined`,
      });
      continue;
    }

    // Check for empty sections
    for (const section of nav) {
      if (!section.items || section.items.length === 0) {
        errors.push({
          type: 'warning',
          message: `Section "${section.section}" for role "${role}" has no items`,
        });
      }

      // Check for items without hrefs
      for (const item of section.items) {
        if (!item.href) {
          errors.push({
            type: 'warning',
            message: `Item "${item.label}" in section "${section.section}" for role "${role}" has no href`,
          });
        }
      }
    }
  }

  return errors;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

function main(): void {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🔐 ROUTE PERMISSIONS CHECK');
  console.log('═══════════════════════════════════════════════════════════════');

  const errors = validatePermissions();

  const criticalErrors = errors.filter((e) => e.type === 'error');
  const warnings = errors.filter((e) => e.type === 'warning');

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📊 RESULTS');
  console.log('═══════════════════════════════════════════════════════════════');

  if (criticalErrors.length > 0) {
    console.log(`\n❌ ERRORS (${criticalErrors.length}):`);
    criticalErrors.forEach((err, i) => {
      console.log(`\n  ${i + 1}. ${err.message}`);
      if (err.details) console.log(`     ${err.details}`);
    });
  }

  if (warnings.length > 0) {
    console.log(`\n⚠️  WARNINGS (${warnings.length}):`);
    warnings.forEach((err, i) => {
      console.log(`\n  ${i + 1}. ${err.message}`);
      if (err.details) console.log(`     ${err.details}`);
    });
  }

  if (errors.length === 0) {
    console.log('\n✅ All checks passed! Navigation and permissions are in sync.');
  }

  console.log('\n═══════════════════════════════════════════════════════════════');

  // Summary
  const navRoutes = getAllNavigationRoutes();
  console.log(`\n📈 Summary:`);
  console.log(`   Total navigation routes: ${navRoutes.size}`);
  console.log(`   Total permission rules: ${Object.keys(ROUTE_PERMISSIONS).length}`);
  console.log(`   Roles defined: ${Object.keys(NAVIGATION).join(', ')}`);
  console.log(`   Errors: ${criticalErrors.length}`);
  console.log(`   Warnings: ${warnings.length}`);

  // Exit with error code if there are critical errors
  if (criticalErrors.length > 0) {
    console.log('\n💥 CI CHECK FAILED - Fix errors before merging\n');
    process.exit(1);
  }

  console.log('\n✅ CI CHECK PASSED\n');
  process.exit(0);
}

// Run
main();

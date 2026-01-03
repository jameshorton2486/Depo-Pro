/* ============================================================================
   PERMISSION DRIFT DETECTION
   scripts/check-permission-drift.ts
   
   Phase 4A-2: Prevent silent security regressions
   Checks for routes without registry, nav items without permissions, etc.
============================================================================ */

import fs from 'fs';
import path from 'path';
import { ROUTE_ACCESS, API_ACCESS } from '../lib/permissions/route-access';
import { NAVIGATION } from '../lib/navigation';

interface RouteInfo {
  path: string;
  type: 'page' | 'api';
  registered: boolean;
  roles?: string[];
}

interface NavItemInfo {
  id: string;
  href: string;
  role: string;
  hasPermission: boolean;
}

const errors: string[] = [];
const warnings: string[] = [];

/**
 * Check 1: Routes without registry
 */
function checkUnregisteredRoutes(): RouteInfo[] {
  const unregistered: RouteInfo[] = [];
  
  // Scan app/ for page.tsx files
  const appDir = path.resolve('app');
  const pageFiles = findPageFiles(appDir);
  
  for (const file of pageFiles) {
    const route = fileToRoute(file);
    if (!route) continue;
    
    // Skip public routes
    if (route.startsWith('/api/auth') || route === '/') continue;
    
    // Check if registered
    const registered = route in ROUTE_ACCESS || route in API_ACCESS;
    
    if (!registered) {
      unregistered.push({
        path: route,
        type: file.includes('/api/') ? 'api' : 'page',
        registered: false,
      });
      errors.push(`[FAIL] Route not registered: ${route} (${file})`);
    }
  }
  
  return unregistered;
}

/**
 * Check 2: Nav items without permission
 */
function checkNavPermissions(): NavItemInfo[] {
  const orphaned: NavItemInfo[] = [];
  
  for (const [role, schema] of Object.entries(NAVIGATION)) {
    for (const section of schema) {
      for (const item of section.items) {
        if (!item.href) continue;
        
        // Check if href has matching ROUTE_ACCESS entry
        const hasPermission = item.href in ROUTE_ACCESS || item.href in API_ACCESS;
        
        if (!hasPermission) {
          orphaned.push({
            id: item.id || 'unknown',
            href: item.href,
            role: role.toUpperCase(),
            hasPermission: false,
          });
          warnings.push(`[WARN] Nav item without permission: ${item.href} (${role})`);
        }
      }
    }
  }
  
  return orphaned;
}

/**
 * Check 3: API routes without guards (warning only)
 */
function checkApiGuards(): string[] {
  const unguarded: string[] = [];
  
  const apiDir = path.resolve('app/api');
  if (!fs.existsSync(apiDir)) return unguarded;
  
  const apiFiles = findRouteFiles(apiDir);
  
  for (const file of apiFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    
    // Check for common guard patterns
    const hasGuard = 
      content.includes('hasApiAccess') ||
      content.includes('hasRouteAccess') ||
      content.includes('requireAuth') ||
      content.includes('auth()');
    
    if (!hasGuard) {
      const route = fileToRoute(file);
      if (route) {
        unguarded.push(route);
        warnings.push(`[WARN] API route may lack guard: ${route}`);
      }
    }
  }
  
  return unguarded;
}

/**
 * Helper: Find all page.tsx files
 */
function findPageFiles(dir: string): string[] {
  const files: string[] = [];
  
  function walk(current: string) {
    const entries = fs.readdirSync(current, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      
      if (entry.isDirectory()) {
        // Skip node_modules, .next, etc.
        if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
          walk(fullPath);
        }
      } else if (entry.name === 'page.tsx' || entry.name === 'route.ts') {
        files.push(fullPath);
      }
    }
  }
  
  walk(dir);
  return files;
}

/**
 * Helper: Find all route.ts files in API
 */
function findRouteFiles(dir: string): string[] {
  const files: string[] = [];
  
  function walk(current: string) {
    if (!fs.existsSync(current)) return;
    
    const entries = fs.readdirSync(current, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.name === 'route.ts') {
        files.push(fullPath);
      }
    }
  }
  
  walk(dir);
  return files;
}

/**
 * Helper: Convert file path to route
 */
function fileToRoute(file: string): string | null {
  const relative = path.relative(path.resolve('app'), file);
  
  if (relative.includes('page.tsx')) {
    // Page route
    let route = '/' + relative.replace(/\/page\.tsx$/, '').replace(/\\/g, '/');
    route = route.replace(/\/\([^)]+\)/g, ''); // Remove route groups
    route = route.replace(/\[([^\]]+)\]/g, '[$1]'); // Keep dynamic segments
    return route === '/' ? '/' : route.replace(/\/$/, '');
  }
  
  if (relative.includes('route.ts')) {
    // API route
    const parts = relative.split(path.sep);
    const apiIndex = parts.indexOf('api');
    if (apiIndex === -1) return null;
    
    const routeParts = parts.slice(apiIndex + 1, -1); // Remove 'route.ts'
    let route = '/api/' + routeParts.join('/');
    route = route.replace(/\[([^\]]+)\]/g, '[$1]'); // Keep dynamic segments
    return route;
  }
  
  return null;
}

/**
 * Main check function
 */
function runChecks() {
  console.log('=======================================================================');
  console.log('               PERMISSION DRIFT DETECTION');
  console.log('=======================================================================\n');

  console.log('[STEP 1] Checking for unregistered routes...');
  const unregistered = checkUnregisteredRoutes();
  console.log(`[INFO] Found ${unregistered.length} unregistered routes`);

  console.log('\n[STEP 2] Checking navigation permissions...');
  const orphaned = checkNavPermissions();
  console.log(`[INFO] Found ${orphaned.length} nav items without permissions`);

  console.log('\n[STEP 3] Checking API route guards...');
  const unguarded = checkApiGuards();
  console.log(`[INFO] Found ${unguarded.length} potentially unguarded API routes`);

  console.log('\n=======================================================================');
  console.log('               RESULTS SUMMARY');
  console.log('=======================================================================');
  console.log(`Errors: ${errors.length}`);
  console.log(`Warnings: ${warnings.length}`);
  console.log('');

  if (errors.length > 0) {
    console.log('ERRORS:');
    errors.forEach(err => console.log(`  ${err}`));
    console.log('');
  }

  if (warnings.length > 0) {
    console.log('WARNINGS:');
    warnings.forEach(warn => console.log(`  ${warn}`));
    console.log('');
  }

  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ All checks passed!');
    process.exit(0);
  } else if (errors.length > 0) {
    console.log('❌ Permission drift detected. Fix errors before merging.');
    process.exit(1);
  } else {
    console.log('⚠️  Warnings detected. Review before merging.');
    process.exit(0);
  }
}

// Run
try {
  runChecks();
} catch (error) {
  console.error('❌ Permission drift check failed:', error);
  process.exit(1);
}

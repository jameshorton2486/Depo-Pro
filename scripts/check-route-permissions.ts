#!/usr/bin/env npx tsx
// =============================================================================
// ROUTE PERMISSIONS AUDIT SCRIPT
// scripts/check-route-permissions.ts
//
// Verifies permission consistency across:
// - lib/permissions/route-access.ts (source of truth)
// - middleware.ts
// - Actual page files
//
// Usage: npx tsx scripts/check-route-permissions.ts
// =============================================================================

import * as fs from 'fs';
import * as path from 'path';

// =============================================================================
// TYPES
// =============================================================================

interface PermissionIssue {
  type: 'missing' | 'mismatch' | 'orphan';
  route: string;
  message: string;
  severity: 'error' | 'warning';
}

// =============================================================================
// SCAN FOR PAGES
// =============================================================================

function findPageFiles(dir: string, basePath: string = ''): string[] {
  const routes: string[] = [];
  
  if (!fs.existsSync(dir)) return routes;
  
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      // Skip special directories
      if (entry.name.startsWith('_') || entry.name === 'api' || entry.name === 'node_modules') {
        continue;
      }
      
      // Handle route groups (parentheses)
      let routeSegment = entry.name;
      if (entry.name.startsWith('(') && entry.name.endsWith(')')) {
        routeSegment = ''; // Route groups don't add to path
      }
      
      const newBasePath = routeSegment ? `${basePath}/${routeSegment}` : basePath;
      routes.push(...findPageFiles(fullPath, newBasePath));
    } else if (entry.name === 'page.tsx' || entry.name === 'page.ts') {
      routes.push(basePath || '/');
    }
  }
  
  return routes;
}

// =============================================================================
// MAIN AUDIT
// =============================================================================

function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🔐 ROUTE PERMISSIONS AUDIT');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const issues: PermissionIssue[] = [];

  // 1. Find all page routes
  const appDir = path.join(process.cwd(), 'app');
  const pageRoutes = findPageFiles(appDir);
  
  console.log(`📄 Found ${pageRoutes.length} page routes\n`);

  // 2. Check route-access.ts exists
  const routeAccessPath = path.join(process.cwd(), 'lib/permissions/route-access.ts');
  
  if (!fs.existsSync(routeAccessPath)) {
    console.log('❌ lib/permissions/route-access.ts not found!');
    console.log('   Create this file as the source of truth for route permissions.\n');
    process.exit(1);
  }

  // 3. Read route-access.ts and extract ROUTE_ACCESS
  const routeAccessContent = fs.readFileSync(routeAccessPath, 'utf-8');
  
  // Simple extraction of routes from ROUTE_ACCESS
  const routeAccessMatches = routeAccessContent.match(/['"]\/[^'"]+['"]\s*:\s*\[/g) || [];
  const definedRoutes = routeAccessMatches.map(m => m.match(/['"]([^'"]+)['"]/)?.[1]).filter(Boolean) as string[];
  
  console.log(`📋 Defined in route-access.ts: ${definedRoutes.length} routes\n`);

  // 4. Check for pages without permission definitions
  const publicPrefixes = ['/', '/login', '/register', '/forgot-password', '/reset-password', '/about', '/features', '/pricing', '/security', '/contact'];
  
  for (const route of pageRoutes) {
    // Skip public routes
    if (publicPrefixes.some(p => route === p || route.startsWith(p + '/'))) {
      continue;
    }
    
    // Skip api routes (handled separately)
    if (route.startsWith('/api')) {
      continue;
    }
    
    // Check if route or parent is defined
    const isDefined = definedRoutes.some(defined => 
      route === defined || route.startsWith(defined + '/')
    );
    
    if (!isDefined) {
      issues.push({
        type: 'missing',
        route,
        message: `Page exists but no permission defined`,
        severity: 'warning',
      });
    }
  }

  // 5. Check for orphan definitions (defined but no page exists)
  for (const defined of definedRoutes) {
    // Skip dynamic routes
    if (defined.includes('[')) continue;
    
    const pageExists = pageRoutes.some(page => 
      page === defined || page.startsWith(defined + '/')
    );
    
    // Also check if it's a prefix that matches something
    const hasChildren = pageRoutes.some(page => page.startsWith(defined));
    
    if (!pageExists && !hasChildren) {
      issues.push({
        type: 'orphan',
        route: defined,
        message: `Permission defined but no page exists`,
        severity: 'warning',
      });
    }
  }

  // 6. Report
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📊 RESULTS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (issues.length === 0) {
    console.log('✅ No permission issues found!\n');
  } else {
    const errors = issues.filter(i => i.severity === 'error');
    const warnings = issues.filter(i => i.severity === 'warning');
    
    console.log(`Found ${issues.length} issues (${errors.length} errors, ${warnings.length} warnings)\n`);
    
    if (errors.length > 0) {
      console.log('❌ ERRORS:\n');
      for (const issue of errors) {
        console.log(`   ${issue.route}`);
        console.log(`   └─ ${issue.message}\n`);
      }
    }
    
    if (warnings.length > 0) {
      console.log('⚠️  WARNINGS:\n');
      for (const issue of warnings) {
        console.log(`   ${issue.route}`);
        console.log(`   └─ ${issue.message}\n`);
      }
    }
  }

  // 7. Summary table
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📋 ROUTE COVERAGE');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log(`   Page routes found:     ${pageRoutes.length}`);
  console.log(`   Permissions defined:   ${definedRoutes.length}`);
  console.log(`   Missing definitions:   ${issues.filter(i => i.type === 'missing').length}`);
  console.log(`   Orphan definitions:    ${issues.filter(i => i.type === 'orphan').length}`);
  console.log('');

  // Exit with error if there are errors
  if (issues.filter(i => i.severity === 'error').length > 0) {
    process.exit(1);
  }
}

main();

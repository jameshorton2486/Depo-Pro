#!/usr/bin/env node
// =============================================================================
// ROUTE COVERAGE GUARD
// scripts/check-route-coverage.ts
//
// CI guard that fails if any page route is not registered in permissions.
// Run: npm run check:routes
// =============================================================================

import * as fs from 'fs';
import * as path from 'path';

// Import permissions - using dynamic import to handle TypeScript compilation
async function importPermissions() {
  try {
    // Try to use tsx/ts-node compatible import
    const { ROUTE_ACCESS, PUBLIC_ROUTES } = await import('../lib/permissions/route-access.js');
    return { ROUTE_ACCESS, PUBLIC_ROUTES };
  } catch {
    // Fallback: parse the file directly (for cases where TS compilation fails)
    const routeAccessPath = path.join(__dirname, '../lib/permissions/route-access.ts');
    const content = fs.readFileSync(routeAccessPath, 'utf-8');
    
    // Extract ROUTE_ACCESS keys using regex
    const routes: string[] = [];
    const routeAccessRegex = /'([^']+)':\s*\[/g;
    let match;
    while ((match = routeAccessRegex.exec(content)) !== null) {
      if (match[1].startsWith('/')) {
        routes.push(match[1]);
      }
    }
    
    // Extract PUBLIC_ROUTES
    const publicRoutes: string[] = [];
    const publicRoutesRegex = /'([^']+)'/g;
    const publicSection = content.match(/PUBLIC_ROUTES[^[]*\[([^\]]+)\]/s);
    if (publicSection) {
      let pubMatch;
      while ((pubMatch = publicRoutesRegex.exec(publicSection[1])) !== null) {
        if (pubMatch[1].startsWith('/')) {
          publicRoutes.push(pubMatch[1]);
        }
      }
    }
    
    return { 
      ROUTE_ACCESS: routes.reduce((acc, r) => ({ ...acc, [r]: [] }), {}),
      PUBLIC_ROUTES: publicRoutes 
    };
  }
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const APP_DIR = path.join(__dirname, '../app');

// Route prefixes that have implicit fallback coverage
const COVERED_PREFIXES = [
  '/admin',
  '/reporter', 
  '/scopist',
  '/attorney',
  '/agency',
];

// Routes to ignore (API routes, special files)
const IGNORE_PATTERNS = [
  /\/api\//,           // API routes have separate coverage
  /\/_/,               // Private folders
  /\/\.\./,            // Parent directory references
];

// =============================================================================
// ROUTE DISCOVERY
// =============================================================================

interface DiscoveredRoute {
  filePath: string;
  routePath: string;
}

function findPageRoutes(dir: string, routes: DiscoveredRoute[] = []): DiscoveredRoute[] {
  if (!fs.existsSync(dir)) {
    return routes;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      // Skip route groups like (dashboard), (auth) - they're not part of URL
      if (entry.name.startsWith('(') && entry.name.endsWith(')')) {
        findPageRoutes(fullPath, routes);
      } else {
        findPageRoutes(fullPath, routes);
      }
    } else if (entry.name === 'page.tsx' || entry.name === 'page.ts') {
      // Convert file path to route path
      let routePath = dir
        .replace(APP_DIR, '')
        .replace(/\\/g, '/');  // Windows path fix
      
      // Remove route group markers like (dashboard), (auth)
      routePath = routePath.replace(/\/\([^)]+\)/g, '');
      
      // Handle dynamic segments [id] -> keep as [id] for matching
      // Empty path means root
      if (routePath === '') routePath = '/';
      
      routes.push({
        filePath: fullPath,
        routePath: routePath,
      });
    }
  }
  
  return routes;
}

// =============================================================================
// COVERAGE CHECK
// =============================================================================

async function checkCoverage(): Promise<void> {
  console.log('\n🔍 ROUTE COVERAGE CHECK\n');
  console.log('='.repeat(60));
  
  // Discover all page routes
  const discoveredRoutes = findPageRoutes(APP_DIR);
  console.log(`\n📄 Found ${discoveredRoutes.length} page routes\n`);
  
  // Load permissions
  const { ROUTE_ACCESS, PUBLIC_ROUTES } = await importPermissions();
  const registeredRoutes = Object.keys(ROUTE_ACCESS);
  console.log(`📋 Registered routes: ${registeredRoutes.length}`);
  console.log(`🌐 Public routes: ${PUBLIC_ROUTES.length}\n`);
  
  const allRegistered = [...registeredRoutes, ...PUBLIC_ROUTES];
  
  // Check each discovered route
  const unregistered: DiscoveredRoute[] = [];
  const covered: DiscoveredRoute[] = [];
  
  for (const route of discoveredRoutes) {
    // Skip ignored patterns
    if (IGNORE_PATTERNS.some(pattern => pattern.test(route.routePath))) {
      continue;
    }
    
    // Normalize route path for comparison (convert [param] to match registered)
    const normalizedPath = route.routePath.replace(/\[([^\]]+)\]/g, '[*]');
    
    // Check if route is in public routes
    const isPublic = PUBLIC_ROUTES.some(publicPath => {
      const normalizedPublic = publicPath.replace(/\[([^\]]+)\]/g, '[*]');
      return normalizedPath === normalizedPublic || normalizedPath.startsWith(normalizedPublic + '/');
    });
    
    if (isPublic) {
      covered.push(route);
      continue;
    }
    
    // Check exact match or prefix match
    const isCovered = registeredRoutes.some(registered => {
      const normalizedRegistered = registered.replace(/\[([^\]]+)\]/g, '[*]');
      // Exact match
      if (normalizedPath === normalizedRegistered) return true;
      // Prefix match (child routes)
      if (normalizedPath.startsWith(normalizedRegistered + '/')) return true;
      return false;
    });
    
    // Check covered prefixes (fallback)
    const hasFallbackCoverage = COVERED_PREFIXES.some(prefix => 
      route.routePath.startsWith(prefix)
    );
    
    if (isCovered || hasFallbackCoverage) {
      covered.push(route);
    } else {
      unregistered.push(route);
    }
  }
  
  // Report results
  console.log('COVERAGE RESULTS:');
  console.log('-'.repeat(60));
  console.log(`✅ Covered: ${covered.length}`);
  console.log(`❌ Unregistered: ${unregistered.length}`);
  console.log('');
  
  if (unregistered.length > 0) {
    console.log('⚠️  UNREGISTERED ROUTES:');
    console.log('-'.repeat(60));
    
    unregistered.forEach(route => {
      console.log(`  ❌ ${route.routePath}`);
      console.log(`     File: ${route.filePath.replace(process.cwd(), '.')}`);
    });
    
    console.log('\n📝 ACTION REQUIRED:');
    console.log('   Add these routes to ROUTE_ACCESS or PUBLIC_ROUTES in:');
    console.log('   lib/permissions/route-access.ts\n');
    
    console.log('   Example:\n');
    unregistered.forEach(route => {
      const basePath = route.routePath.split('/').slice(0, -1).join('/') || '/';
      console.log(`   '${route.routePath}': ['ADMIN', 'REPORTER'],  // Add appropriate roles`);
    });
    
    console.log('\n');
    process.exit(1);
  }
  
  console.log('✅ All routes are properly registered!\n');
  process.exit(0);
}

// =============================================================================
// MAIN
// =============================================================================

checkCoverage().catch((error) => {
  console.error('Error running route coverage check:', error);
  process.exit(1);
});

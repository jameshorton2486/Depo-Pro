/* ============================================================================
   PERMISSION DIFF GENERATOR
   scripts/generate-permission-diff.ts
   
   Phase 4A-2: Generate permission diff report for releases
============================================================================ */

import fs from 'fs';
import path from 'path';
import { ROUTE_ACCESS, API_ACCESS } from '../lib/permissions/route-access';

interface PermissionDiff {
  added: { route: string; roles: string[] }[];
  removed: { route: string; roles: string[] }[];
  changed: { route: string; before: string[]; after: string[] }[];
}

/**
 * Compare current permissions with baseline
 * Baseline should be stored in releases/permission-baseline.json
 */
function generateDiff(): PermissionDiff {
  const baselinePath = path.resolve('releases/permission-baseline.json');
  
  let baseline: Record<string, string[]> = {};
  if (fs.existsSync(baselinePath)) {
    baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf-8'));
  }

  // Get current permissions
  const current: Record<string, string[]> = {
    ...ROUTE_ACCESS,
    ...API_ACCESS,
  };

  const diff: PermissionDiff = {
    added: [],
    removed: [],
    changed: [],
  };

  // Find added routes
  for (const [route, roles] of Object.entries(current)) {
    if (!(route in baseline)) {
      diff.added.push({ route, roles });
    } else if (JSON.stringify(baseline[route].sort()) !== JSON.stringify(roles.sort())) {
      diff.changed.push({
        route,
        before: baseline[route],
        after: roles,
      });
    }
  }

  // Find removed routes
  for (const [route, roles] of Object.entries(baseline)) {
    if (!(route in current)) {
      diff.removed.push({ route, roles });
    }
  }

  return diff;
}

/**
 * Save current permissions as new baseline
 */
function saveBaseline() {
  const releasesDir = path.resolve('releases');
  if (!fs.existsSync(releasesDir)) {
    fs.mkdirSync(releasesDir, { recursive: true });
  }

  const current: Record<string, string[]> = {
    ...ROUTE_ACCESS,
    ...API_ACCESS,
  };

  fs.writeFileSync(
    path.join(releasesDir, 'permission-baseline.json'),
    JSON.stringify(current, null, 2)
  );
}

/**
 * Main function
 */
function main() {
  const command = process.argv[2];

  if (command === 'save') {
    saveBaseline();
    console.log('✅ Permission baseline saved');
    return;
  }

  if (command === 'diff') {
    const diff = generateDiff();
    
    const outputPath = path.resolve('releases/permission-diff.json');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(diff, null, 2));
    
    console.log('Permission Diff Report:');
    console.log(`  Added: ${diff.added.length}`);
    console.log(`  Removed: ${diff.removed.length}`);
    console.log(`  Changed: ${diff.changed.length}`);
    console.log(`\nSaved to: ${outputPath}`);
    
    if (diff.added.length > 0 || diff.removed.length > 0 || diff.changed.length > 0) {
      console.log('\n⚠️  Permission changes detected. Review before release.');
    } else {
      console.log('\n✅ No permission changes');
    }
    
    return;
  }

  console.log('Usage:');
  console.log('  npm run report:permissions save  - Save current permissions as baseline');
  console.log('  npm run report:permissions diff  - Generate diff report');
}

main();

#!/usr/bin/env node
/**
 * Version Guard Script
 * Enforces Next.js 16.1.1 (locked version)
 * Run: node scripts/check-next-version.js
 */

const fs = require('fs');
const path = require('path');

const pkgPath = path.join(__dirname, '..', 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

const version = pkg.dependencies?.next || pkg.devDependencies?.next;

if (!version) {
  console.error('❌ Next.js dependency not found in package.json');
  process.exit(1);
}

// Remove any version prefix (^, ~, etc.) for comparison
const cleanVersion = version.replace(/[\^~]/, '');

// Exact version check - must be 16.1.1
if (cleanVersion !== '16.1.1') {
  console.error('❌ Next.js version mismatch detected:', version);
  console.error('   Depo-Pro must use Next.js 16.1.1 exactly');
  console.error('   Update package.json: "next": "^16.1.1"');
  process.exit(1);
}

// Also check for unstable versions
if (
  version.includes('canary') ||
  version.includes('latest') ||
  version.includes('beta')
) {
  console.error('❌ Unstable Next.js version detected:', version);
  console.error('   Depo-Pro must use stable version 15.0.3');
  process.exit(1);
}

console.log('✅ Next.js version OK (15.0.3):', version);

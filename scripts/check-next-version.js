#!/usr/bin/env node
/**
 * Version Guard Script
 * Prevents accidental Next.js 16 upgrades
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

if (
  version.includes('16') ||
  version.includes('canary') ||
  version.includes('latest')
) {
  console.error('❌ Next.js 16 or unstable version detected:', version);
  console.error('   Depo-Pro must remain on Next.js 15.x');
  process.exit(1);
}

console.log('✅ Next.js version OK:', version);

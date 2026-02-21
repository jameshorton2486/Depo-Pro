#!/usr/bin/env node
/**
 * Version Guard Script
 * Enforces Next.js 16.1.6 exactly (upgraded for route group build fix)
 * Run: node scripts/check-next-version.js
 *
 * This script checks:
 * 1. package.json declares Next.js 16.1.6 exactly (no caret/range)
 * 2. package-lock.json resolves to 16.1.6 exactly
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REQUIRED_VERSION = '16.1.6';
const rootDir = path.join(__dirname, '..');
const pkgPath = path.join(rootDir, 'package.json');
const lockPath = path.join(rootDir, 'package-lock.json');

// Check package.json
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const declaredVersion = pkg.dependencies?.next || pkg.devDependencies?.next;

if (!declaredVersion) {
  console.error('❌ Next.js dependency not found in package.json');
  process.exit(1);
}

// Remove any version prefix (^, ~, etc.) for comparison
const cleanDeclaredVersion = declaredVersion.replace(/[\^~>=<]/, '');

// Check declared version in package.json
if (cleanDeclaredVersion !== REQUIRED_VERSION) {
  console.error('❌ Next.js version mismatch in package.json');
  console.error(`   Detected: ${declaredVersion}`);
  console.error(`   Required: ${REQUIRED_VERSION}`);
  console.error(`   Fix: Update package.json to "next": "${REQUIRED_VERSION}" (exact, no caret)`);
  process.exit(1);
}

// Check for version ranges (should be exact)
if (declaredVersion !== REQUIRED_VERSION) {
  console.error('❌ Next.js version must be exact (no caret, tilde, or range)');
  console.error(`   Detected: ${declaredVersion}`);
  console.error(`   Required: ${REQUIRED_VERSION}`);
  console.error(`   Fix: Update package.json to "next": "${REQUIRED_VERSION}" (exact, no caret)`);
  process.exit(1);
}

// Check for unstable versions
if (
  declaredVersion.includes('canary') ||
  declaredVersion.includes('latest') ||
  declaredVersion.includes('beta')
) {
  console.error('❌ Unstable Next.js version detected:', declaredVersion);
  console.error(`   Depo-Pro must use stable version ${REQUIRED_VERSION}`);
  process.exit(1);
}

// Check resolved version in package-lock.json
let resolvedVersion = null;
if (fs.existsSync(lockPath)) {
  try {
    const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
    const nextPackage = lock.packages?.['node_modules/next'] || 
                       lock.dependencies?.next;
    
    if (nextPackage) {
      resolvedVersion = nextPackage.version;
    }
  } catch (err) {
    console.warn('⚠️  Could not read package-lock.json, skipping resolved version check');
  }
}

// If we have a resolved version, check it matches
if (resolvedVersion && resolvedVersion !== REQUIRED_VERSION) {
  console.error('❌ Next.js resolved version mismatch in package-lock.json');
  console.error(`   Detected: ${resolvedVersion}`);
  console.error(`   Required: ${REQUIRED_VERSION}`);
  console.error(`   Fix: Delete package-lock.json and node_modules, then run: npm install`);
  process.exit(1);
}

// Try to get actual installed version via npm list
let installedVersion = null;
try {
  const npmListOutput = execSync('npm list next --depth=0 --json', {
    cwd: rootDir,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe']
  });
  const npmList = JSON.parse(npmListOutput);
  if (npmList.dependencies?.next) {
    installedVersion = npmList.dependencies.next.version;
  }
} catch (err) {
  // npm list might fail if node_modules doesn't exist, that's OK
}

if (installedVersion && installedVersion !== REQUIRED_VERSION) {
  console.error('❌ Next.js installed version mismatch');
  console.error(`   Detected: ${installedVersion}`);
  console.error(`   Required: ${REQUIRED_VERSION}`);
  console.error(`   Fix: Delete node_modules and package-lock.json, then run: npm install`);
  process.exit(1);
}

console.log(`✅ Next.js version OK (${REQUIRED_VERSION}):`, declaredVersion);
if (resolvedVersion) {
  console.log(`   Resolved: ${resolvedVersion}`);
}
if (installedVersion) {
  console.log(`   Installed: ${installedVersion}`);
}

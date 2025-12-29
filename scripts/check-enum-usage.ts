#!/usr/bin/env tsx
// =============================================================================
// ENUM GUARDRAIL SCRIPT
// =============================================================================
// Scans the codebase for forbidden (deprecated) enum values.
// Run this before commits and in CI to prevent enum drift.
// 
// Usage: npm run check:enums
// =============================================================================

import { execSync } from 'node:child_process';

// =============================================================================
// CONFIGURATION
// =============================================================================

const FORBIDDEN_ENUM_VALUES = [
  'VIEW_DOWNLOAD',
  'VIEW_ANNOTATE',
  'FULL',
  'EMAIL',
  'CASE_ACCESS'
];

const EXCLUDED_PATHS = [
  'node_modules',
  '.next',
  '.git',
  'dist',
  'build',
  '.turbo',
  'coverage',
  'prisma/migrations',
  'scripts/check-enum-usage.ts',
];

const INCLUDED_EXTENSIONS = ['ts', 'tsx', 'js', 'jsx'];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function hasRipgrep(): boolean {
  try {
    execSync('rg --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function buildExcludeArgs(useRipgrep: boolean): string {
  if (useRipgrep) {
    return EXCLUDED_PATHS.map(p => `-g "!${p}"`).join(' ');
  }
  return EXCLUDED_PATHS.map(p => `--exclude="${p}"`).join(' ');
}

function buildIncludeArgs(useRipgrep: boolean): string {
  if (useRipgrep) {
    return INCLUDED_EXTENSIONS.map(ext => `-g "*.${ext}"`).join(' ');
  }
  return `--include="*.{${INCLUDED_EXTENSIONS.join(',')}}"`;
}

function buildSearchPattern(): string {
  return FORBIDDEN_ENUM_VALUES.map(v => `\\b${v}\\b`).join('|');
}

// =============================================================================
// MAIN SCRIPT
// =============================================================================

console.log('\n🔍 ENUM GUARDRAIL CHECK\n');
console.log('Scanning for forbidden enum values...\n');

const useRipgrep = hasRipgrep();
const pattern = buildSearchPattern();
const excludes = buildExcludeArgs(useRipgrep);
const includes = buildIncludeArgs(useRipgrep);

let command: string;

if (useRipgrep) {
  command = `rg "${pattern}" ${excludes} ${includes} --no-ignore-vcs`;
} else {
  command = `grep -rn "${pattern}" . ${excludes} ${includes}`;
}

console.log(`Using: ${useRipgrep ? 'ripgrep' : 'grep'}`);
console.log(`Pattern: ${FORBIDDEN_ENUM_VALUES.join(', ')}\n`);

try {
  const output = execSync(command, { 
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  
  console.error('━'.repeat(60));
  console.error('\n❌ ENUM GUARDRAIL VIOLATION DETECTED\n');
  console.error('━'.repeat(60));
  console.error('\nThe following files contain forbidden enum values:\n');
  console.error(output);
  console.error('━'.repeat(60));
  console.error('\n🔧 HOW TO FIX:\n');
  console.error('1. Import enums from @/lib/enums.ts');
  console.error('2. Replace hardcoded strings with enum members\n');
  console.error('Example:');
  console.error('  ❌ if (accessLevel === "VIEW_DOWNLOAD")');
  console.error('  ✅ if (accessLevel === AccessLevel.VIEW)\n');
  console.error('━'.repeat(60));
  console.error('\nForbidden values and their replacements:\n');
  console.error('  VIEW_DOWNLOAD  →  TranscriptAccessLevel.COMMENT');
  console.error('  VIEW_ANNOTATE  →  TranscriptAccessLevel.COMMENT');
  console.error('  FULL           →  TranscriptAccessLevel.EDIT');
  console.error('  EMAIL          →  ShareType.USER');
  console.error('  CASE_ACCESS    →  ShareType.ORGANIZATION\n');
  console.error('━'.repeat(60));
  
  process.exit(1);
  
} catch (error: any) {
  if (error.status === 1 && !error.stdout) {
    console.log('━'.repeat(60));
    console.log('\n✅ ENUM GUARDRAIL PASSED\n');
    console.log('No forbidden enum values found in the codebase.');
    console.log('━'.repeat(60));
    process.exit(0);
  }
  
  console.error('Error running enum check:', error.message);
  process.exit(1);
}

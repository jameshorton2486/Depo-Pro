#!/usr/bin/env tsx
// =============================================================================
// PRODUCTION VERIFICATION SCRIPT
// =============================================================================
// Run before deployment to ensure everything is configured correctly.
// 
// Usage: npm run verify:prod
// =============================================================================

import { execSync } from 'node:child_process';

interface CheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  duration?: number;
}

async function runChecks(): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  // 1. Enum Guardrails
  console.log('Checking enum guardrails...');
  try {
    execSync('npm run check:enums', { stdio: 'pipe' });
    results.push({
      name: 'Enum Guardrails',
      status: 'pass',
      message: 'No forbidden enum values found',
    });
  } catch {
    results.push({
      name: 'Enum Guardrails',
      status: 'fail',
      message: 'Forbidden enum values detected in codebase',
    });
  }

  // 2. Required Environment Variables
  console.log('Checking environment variables...');
  const requiredEnvVars = [
    'DATABASE_URL',
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL',
    'DEEPGRAM_API_KEY',
  ];

  for (const envVar of requiredEnvVars) {
    if (process.env[envVar]) {
      results.push({
        name: `Env: ${envVar}`,
        status: 'pass',
        message: 'Set',
      });
    } else {
      results.push({
        name: `Env: ${envVar}`,
        status: 'fail',
        message: 'Missing',
      });
    }
  }

  // 3. Secret Length
  if (process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_SECRET.length < 32) {
    results.push({
      name: 'NEXTAUTH_SECRET Length',
      status: 'warn',
      message: 'Should be at least 32 characters',
    });
  }

  // 4. TypeScript Check
  console.log('Running TypeScript check...');
  try {
    execSync('npm run typecheck', { stdio: 'pipe' });
    results.push({
      name: 'TypeScript',
      status: 'pass',
      message: 'No type errors',
    });
  } catch {
    results.push({
      name: 'TypeScript',
      status: 'fail',
      message: 'Type errors detected',
    });
  }

  // 5. Prisma Validation
  console.log('Validating Prisma schema...');
  try {
    execSync('npx prisma validate', { stdio: 'pipe' });
    results.push({
      name: 'Prisma Schema',
      status: 'pass',
      message: 'Schema is valid',
    });
  } catch {
    results.push({
      name: 'Prisma Schema',
      status: 'fail',
      message: 'Schema validation failed',
    });
  }

  // 6. ESLint Check
  console.log('Running ESLint...');
  try {
    execSync('npm run lint', { stdio: 'pipe' });
    results.push({
      name: 'ESLint',
      status: 'pass',
      message: 'No lint errors',
    });
  } catch {
    results.push({
      name: 'ESLint',
      status: 'warn',
      message: 'Lint warnings or errors detected',
    });
  }

  return results;
}

async function main() {
  console.log('\n🔍 DEPO-PRO PRODUCTION VERIFICATION\n');
  console.log('═'.repeat(60));
  
  const results = await runChecks();
  
  console.log('\n📊 RESULTS\n');
  
  let hasFailures = false;
  let hasWarnings = false;
  
  for (const result of results) {
    const icon = result.status === 'pass' ? '✅' : 
                 result.status === 'warn' ? '⚠️' : '❌';
    const duration = result.duration ? ` (${result.duration}ms)` : '';
    console.log(`${icon} ${result.name}: ${result.message}${duration}`);
    
    if (result.status === 'fail') hasFailures = true;
    if (result.status === 'warn') hasWarnings = true;
  }
  
  console.log('\n' + '═'.repeat(60));
  
  if (hasFailures) {
    console.log('\n❌ VERIFICATION FAILED\n');
    console.log('Fix the issues above before deploying.\n');
    process.exit(1);
  } else if (hasWarnings) {
    console.log('\n⚠️  VERIFICATION PASSED WITH WARNINGS\n');
    console.log('Review warnings before production deployment.\n');
    process.exit(0);
  } else {
    console.log('\n✅ VERIFICATION PASSED\n');
    console.log('Ready for production deployment!\n');
    process.exit(0);
  }
}

main().catch(console.error);

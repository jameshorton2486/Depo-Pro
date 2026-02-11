#!/usr/bin/env node
/**
 * Phase 10 Deployment Verification Script
 *
 * Run this after deploying Phase 10 to verify everything is set up correctly.
 *
 * Usage: node scripts/verify-phase10.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function check(message) {
  log(`\n🔍 ${message}`, 'blue');
}

function pass(message) {
  log(`  ✅ ${message}`, 'green');
}

function fail(message) {
  log(`  ❌ ${message}`, 'red');
}

function warn(message) {
  log(`  ⚠️  ${message}`, 'yellow');
}

function info(message) {
  log(`  ℹ️  ${message}`, 'gray');
}

let passCount = 0;
let failCount = 0;
let warnCount = 0;

// ============================================================================
// VERIFICATION CHECKS
// ============================================================================

async function verifyEnvironmentVariables() {
  check('Checking environment variables...');

  const required = [
    'ANTHROPIC_API_KEY',
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
  ];

  let allPresent = true;

  for (const varName of required) {
    if (process.env[varName]) {
      pass(`${varName} is set`);
      passCount++;
    } else {
      fail(`${varName} is NOT set`);
      failCount++;
      allPresent = false;
    }
  }

  if (process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_API_KEY.startsWith('sk-ant-')) {
    warn('ANTHROPIC_API_KEY does not start with sk-ant-');
    warnCount++;
  }

  return allPresent;
}

async function verifyFileStructure() {
  check('Checking file structure...');

  const requiredFiles = [
    'supabase/migrations/20260211_medical_records_chronology.sql',
    'types/medical.ts',
    'lib/supabase/queries/medical.ts',
    'lib/services/medical-extraction.ts',
    'lib/services/chronology-export.ts',
    'app/api/jobs/[id]/medical-records/route.ts',
    'app/api/jobs/[id]/chronology/route.ts',
    'components/medical/MedicalRecordsPanel.tsx',
    'components/medical/ChronologyViewer.tsx',
    'app/(dashboard)/jobs/[id]/medical/page.tsx',
  ];

  let allPresent = true;

  for (const file of requiredFiles) {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      pass(`${file}`);
      passCount++;
    } else {
      fail(`${file} NOT FOUND`);
      failCount++;
      allPresent = false;
    }
  }

  return allPresent;
}

async function verifyDependencies() {
  check('Checking package dependencies...');

  const packageJsonPath = path.join(process.cwd(), 'package.json');

  if (!fs.existsSync(packageJsonPath)) {
    fail('package.json not found');
    failCount++;
    return false;
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };

  const required = [
    '@anthropic-ai/sdk',
    'docx',
    '@supabase/supabase-js',
  ];

  let allPresent = true;

  for (const dep of required) {
    if (allDeps[dep]) {
      pass(`${dep} (${allDeps[dep]})`);
      passCount++;
    } else {
      fail(`${dep} is NOT installed`);
      info(`Run: npm install ${dep}`);
      failCount++;
      allPresent = false;
    }
  }

  return allPresent;
}

async function verifyTypeScript() {
  check('Checking TypeScript compilation...');

  const { execSync } = require('child_process');

  try {
    execSync('npx tsc --noEmit 2>&1', {
      encoding: 'utf8',
      stdio: 'pipe'
    });
    pass('TypeScript compilation successful (0 errors)');
    passCount++;
    return true;
  } catch (error) {
    const output = error.stdout || error.message;
    const errorLines = output.split('\n').filter(line => line.includes('error TS'));

    if (errorLines.length > 0) {
      fail(`TypeScript has ${errorLines.length} errors`);
      errorLines.slice(0, 3).forEach(line => info(line.trim()));
      if (errorLines.length > 3) {
        info(`... and ${errorLines.length - 3} more errors`);
      }
      failCount++;
      return false;
    }

    warn('Could not verify TypeScript compilation');
    warnCount++;
    return true;
  }
}

async function verifyNavigation() {
  check('Checking navigation integration...');

  const jobPagePath = path.join(
    process.cwd(),
    'app/(dashboard)/jobs/[id]/page.tsx'
  );

  if (!fs.existsSync(jobPagePath)) {
    fail('Job detail page not found');
    failCount++;
    return false;
  }

  const content = fs.readFileSync(jobPagePath, 'utf8');

  if (content.includes('FileText')) {
    pass('FileText icon imported');
    passCount++;
  } else {
    fail('FileText icon NOT imported');
    info('Add FileText to lucide-react imports');
    failCount++;
  }

  if (content.includes('Medical Chronology')) {
    pass('Medical Chronology card added');
    passCount++;
  } else {
    fail('Medical Chronology card NOT added');
    failCount++;
  }

  if (content.includes('/medical')) {
    pass('Medical route linked');
    passCount++;
  } else {
    fail('Medical route NOT linked');
    failCount++;
  }

  return true;
}

async function checkSupabaseConnection() {
  check('Checking Supabase connection...');

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    fail('Cannot check - NEXT_PUBLIC_SUPABASE_URL not set');
    failCount++;
    return false;
  }

  try {
    const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
    pass(`Supabase URL: ${url.hostname}`);
    passCount++;
    return true;
  } catch (error) {
    fail('Invalid Supabase URL format');
    failCount++;
    return false;
  }
}

async function verifyMigrationFile() {
  check('Checking migration file content...');

  const migrationPath = path.join(
    process.cwd(),
    'supabase/migrations/20260211_medical_records_chronology.sql'
  );

  if (!fs.existsSync(migrationPath)) {
    fail('Migration file not found');
    failCount++;
    return false;
  }

  const content = fs.readFileSync(migrationPath, 'utf8');

  const checks = [
    ['medical_records table', 'CREATE TABLE IF NOT EXISTS medical_records'],
    ['chronology_entries table', 'CREATE TABLE IF NOT EXISTS chronology_entries'],
    ['RLS policies', 'ENABLE ROW LEVEL SECURITY'],
    ['Indexes', 'CREATE INDEX IF NOT EXISTS'],
  ];

  for (const [name, pattern] of checks) {
    if (content.includes(pattern)) {
      pass(name);
      passCount++;
    } else {
      fail(`${name} not found in migration`);
      failCount++;
    }
  }

  return true;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  log('\n╔════════════════════════════════════════════════════════════╗', 'blue');
  log('║  Phase 10 Deployment Verification                        ║', 'blue');
  log('║  Medical Document Intake & AI Chronology                 ║', 'blue');
  log('╚════════════════════════════════════════════════════════════╝\n', 'blue');

  // Load environment variables
  require('dotenv').config({ path: '.env.local' });

  // Run all checks
  await verifyEnvironmentVariables();
  await verifyFileStructure();
  await verifyDependencies();
  await verifyMigrationFile();
  await verifyNavigation();
  await verifyTypeScript();
  await checkSupabaseConnection();

  // Summary
  log('\n' + '═'.repeat(60), 'gray');
  log('\n📊 VERIFICATION SUMMARY\n', 'blue');

  if (passCount > 0) {
    log(`  ✅ Passed: ${passCount}`, 'green');
  }
  if (warnCount > 0) {
    log(`  ⚠️  Warnings: ${warnCount}`, 'yellow');
  }
  if (failCount > 0) {
    log(`  ❌ Failed: ${failCount}`, 'red');
  }

  log('');

  if (failCount === 0 && warnCount === 0) {
    log('🎉 All checks passed! Ready to deploy Phase 10.\n', 'green');
    log('Next steps:', 'blue');
    log('  1. Run migration in Supabase Dashboard', 'gray');
    log('  2. Regenerate Supabase types', 'gray');
    log('  3. Test locally: npm run dev', 'gray');
    log('  4. Deploy to production\n', 'gray');
    process.exit(0);
  } else if (failCount === 0) {
    log('⚠️  Verification complete with warnings.\n', 'yellow');
    log('Review warnings above before deploying.\n', 'yellow');
    process.exit(0);
  } else {
    log('❌ Verification failed. Fix errors above before deploying.\n', 'red');
    process.exit(1);
  }
}

// Run verification
main().catch((error) => {
  log('\n💥 Verification script error:', 'red');
  console.error(error);
  process.exit(1);
});

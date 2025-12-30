#!/usr/bin/env tsx

/**
 * Check for Prisma schema drift
 * Run this in CI before deployments
 * 
 * Usage: npm run db:check-drift
 */

import { execSync } from 'child_process';

console.log('🔍 Checking for Prisma schema drift...\n');

try {
  // Check if there are pending migrations
  const status = execSync('npx prisma migrate status', { 
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  if (status.includes('have not yet been applied')) {
    console.error('❌ ERROR: Pending migrations detected!');
    console.error(status);
    process.exit(1);
  }
  
  // Check if schema matches database
  // This command will exit with code 2 if there are differences
  try {
    execSync('npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --exit-code', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    console.log('✅ Schema is in sync with database');
    process.exit(0);
  } catch (error: any) {
    if (error.status === 2) {
      console.error('❌ ERROR: Schema drift detected!');
      console.error('   Run `npx prisma migrate dev` to create a migration');
      process.exit(1);
    }
    throw error;
  }
  
} catch (error: any) {
  if (error.status === 1) {
    // Migration status check failed - likely no migrations table
    console.warn('⚠️  WARNING: Could not check migration status');
    console.warn('   This might be a fresh database. Run `npx prisma migrate dev` to initialize.');
    process.exit(0); // Don't fail on fresh databases
  } else {
    console.error('❌ ERROR:', error.message);
    process.exit(1);
  }
}


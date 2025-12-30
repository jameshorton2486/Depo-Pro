#!/usr/bin/env tsx
/**
 * Phase 6 Billing Tables Verification Script
 * 
 * Checks if Phase 6 billing tables exist in the database.
 * Safe to run - read-only queries only.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface TableCheck {
  tableName: string;
  exists: boolean;
  rowCount?: number;
}

async function checkTableExists(tableName: string): Promise<TableCheck> {
  try {
    // Check if table exists using information_schema
    const result = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = ${tableName}
    `;

    const exists = result.length > 0;
    let rowCount: number | undefined;

    if (exists) {
      // If table exists, count rows (safe read-only query)
      const countResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count
        FROM ${prisma.$queryRawUnsafe(`"${tableName}"`)}
      `;
      rowCount = Number(countResult[0]?.count || 0);
    }

    return {
      tableName,
      exists,
      rowCount,
    };
  } catch (error) {
    // If error, table probably doesn't exist or there's a permission issue
    return {
      tableName,
      exists: false,
    };
  }
}

async function checkEnumExists(enumName: string): Promise<boolean> {
  try {
    const result = await prisma.$queryRaw<Array<{ typname: string }>>`
      SELECT typname
      FROM pg_type
      WHERE typname = ${enumName}
    `;
    return result.length > 0;
  } catch (error) {
    return false;
  }
}

async function main() {
  console.log('🔍 Verifying Phase 6 Billing Tables...\n');

  const phase6Tables = [
    'BillingAccount',
    'BillingRate',
    'BillingPeriod',
    'Invoice',
    'InvoiceLineItem',
    'BillingUsageRecord',
  ];

  const phase6Enums = [
    'BillingServiceType',
    'BillingUnit',
    'InvoiceStatus',
    'AudioEnhancementType',
  ];

  console.log('📊 Checking Tables:');
  console.log('─'.repeat(60));

  const tableChecks: TableCheck[] = [];

  for (const tableName of phase6Tables) {
    const check = await checkTableExists(tableName);
    tableChecks.push(check);

    const status = check.exists ? '✅ EXISTS' : '❌ MISSING';
    const rowInfo = check.exists ? ` (${check.rowCount} rows)` : '';
    console.log(`${status.padEnd(12)} ${tableName}${rowInfo}`);
  }

  console.log('\n📋 Checking Enums:');
  console.log('─'.repeat(60));

  for (const enumName of phase6Enums) {
    const exists = await checkEnumExists(enumName);
    const status = exists ? '✅ EXISTS' : '❌ MISSING';
    console.log(`${status.padEnd(12)} ${enumName}`);
  }

  console.log('\n' + '═'.repeat(60));
  
  const allTablesExist = tableChecks.every(check => check.exists);
  const missingTables = tableChecks.filter(check => !check.exists).map(check => check.tableName);

  if (allTablesExist) {
    console.log('✅ SUCCESS: All Phase 6 billing tables exist in the database!');
    console.log('   Migration baseline matches actual database state.');
  } else {
    console.log('⚠️  WARNING: Some Phase 6 billing tables are missing:');
    missingTables.forEach(table => console.log(`   • ${table}`));
    console.log('\n💡 Next Steps:');
    console.log('   1. If tables were created via `prisma db push`, they should exist');
    console.log('   2. If tables are missing, you may need to apply the baseline migration');
    console.log('   3. Check Prisma Studio: npx prisma studio');
  }

  console.log('═'.repeat(60) + '\n');
}

main()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


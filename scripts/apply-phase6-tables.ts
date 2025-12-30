#!/usr/bin/env tsx
/**
 * Phase 6 Billing Tables Application Script
 * 
 * Safely creates Phase 6 billing tables and enums by extracting
 * only the Phase 6-related CREATE statements from the baseline migration.
 * 
 * This script:
 * - Only creates Phase 6 tables/enums (BillingAccount, Invoice, etc.)
 * - Does NOT touch existing tables
 * - Does NOT reset or drop anything
 * - Safe to run multiple times (uses IF NOT EXISTS patterns)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function applyPhase6Tables() {
  console.log('🚀 Applying Phase 6 Billing Tables...\n');
  console.log('⚠️  This will create Phase 6 tables and enums.');
  console.log('   Safe operation - only creates new tables, no data loss.\n');

  try {
    // Phase 6 Enums
    console.log('📋 Creating Enums...');
    
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "BillingServiceType" AS ENUM ('TRANSCRIPTION_AUTOMATED', 'MODEL_UPGRADE', 'HUMAN_REVIEW_CONFIDENCE', 'HUMAN_REVIEW_FULL', 'FORENSIC_AUDIO_RX');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log('   ✅ BillingServiceType');

    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "BillingUnit" AS ENUM ('PER_MINUTE', 'PER_WORD', 'PER_FILE', 'PER_HOUR');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log('   ✅ BillingUnit');

    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'OPEN', 'PAID', 'VOID');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log('   ✅ InvoiceStatus');

    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "AudioEnhancementType" AS ENUM ('AUTOMATED_DOLBY', 'MANUAL_RX');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log('   ✅ AudioEnhancementType');

    // Phase 6 Tables
    console.log('\n📊 Creating Tables...');

    // BillingAccount
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "BillingAccount" (
        "id" TEXT NOT NULL,
        "firmId" TEXT NOT NULL,
        "stripeCustomerId" TEXT,
        "billingEmail" TEXT NOT NULL,
        "currency" TEXT NOT NULL DEFAULT 'USD',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,

        CONSTRAINT "BillingAccount_pkey" PRIMARY KEY ("id")
      );
    `);
    console.log('   ✅ BillingAccount');

    // BillingRate
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "BillingRate" (
        "id" TEXT NOT NULL,
        "firmId" TEXT NOT NULL,
        "serviceType" "BillingServiceType" NOT NULL,
        "unit" "BillingUnit" NOT NULL,
        "amountCents" INTEGER NOT NULL,
        "version" INTEGER NOT NULL,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "BillingRate_pkey" PRIMARY KEY ("id")
      );
    `);
    console.log('   ✅ BillingRate');

    // BillingPeriod
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "BillingPeriod" (
        "id" TEXT NOT NULL,
        "firmId" TEXT NOT NULL,
        "startAt" TIMESTAMP(3) NOT NULL,
        "endAt" TIMESTAMP(3) NOT NULL,
        "locked" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "BillingPeriod_pkey" PRIMARY KEY ("id")
      );
    `);
    console.log('   ✅ BillingPeriod');

    // Invoice
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Invoice" (
        "id" TEXT NOT NULL,
        "billingAccountId" TEXT NOT NULL,
        "invoiceNumber" TEXT NOT NULL,
        "stripeInvoiceId" TEXT,
        "periodStart" TIMESTAMP(3) NOT NULL,
        "periodEnd" TIMESTAMP(3) NOT NULL,
        "totalCents" INTEGER NOT NULL,
        "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,

        CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
      );
    `);
    console.log('   ✅ Invoice');

    // InvoiceLineItem
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "InvoiceLineItem" (
        "id" TEXT NOT NULL,
        "invoiceId" TEXT NOT NULL,
        "jobId" TEXT,
        "serviceType" "BillingServiceType" NOT NULL,
        "description" TEXT NOT NULL,
        "quantity" DECIMAL(10,4) NOT NULL,
        "unit" "BillingUnit" NOT NULL,
        "unitPriceCents" INTEGER NOT NULL,
        "totalCents" INTEGER NOT NULL,
        "rateVersion" INTEGER NOT NULL,

        CONSTRAINT "InvoiceLineItem_pkey" PRIMARY KEY ("id")
      );
    `);
    console.log('   ✅ InvoiceLineItem');

    // BillingUsageRecord
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "BillingUsageRecord" (
        "id" TEXT NOT NULL,
        "firmId" TEXT NOT NULL,
        "jobId" TEXT NOT NULL,
        "serviceType" "BillingServiceType" NOT NULL,
        "quantity" DECIMAL(10,4) NOT NULL,
        "unit" "BillingUnit" NOT NULL,
        "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "invoiceLineItemId" TEXT,

        CONSTRAINT "BillingUsageRecord_pkey" PRIMARY KEY ("id")
      );
    `);
    console.log('   ✅ BillingUsageRecord');

    // Create Indexes
    console.log('\n🔍 Creating Indexes...');

    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "BillingAccount_firmId_key" ON "BillingAccount"("firmId");
      CREATE UNIQUE INDEX IF NOT EXISTS "BillingAccount_stripeCustomerId_key" ON "BillingAccount"("stripeCustomerId");
      CREATE INDEX IF NOT EXISTS "BillingAccount_stripeCustomerId_idx" ON "BillingAccount"("stripeCustomerId");
    `);
    console.log('   ✅ BillingAccount indexes');

    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "BillingRate_firmId_serviceType_version_key" ON "BillingRate"("firmId", "serviceType", "version");
      CREATE INDEX IF NOT EXISTS "BillingRate_firmId_serviceType_idx" ON "BillingRate"("firmId", "serviceType");
      CREATE INDEX IF NOT EXISTS "BillingRate_firmId_serviceType_isActive_idx" ON "BillingRate"("firmId", "serviceType", "isActive");
    `);
    console.log('   ✅ BillingRate indexes');

    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "BillingPeriod_firmId_startAt_endAt_key" ON "BillingPeriod"("firmId", "startAt", "endAt");
      CREATE INDEX IF NOT EXISTS "BillingPeriod_firmId_locked_idx" ON "BillingPeriod"("firmId", "locked");
    `);
    console.log('   ✅ BillingPeriod indexes');

    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");
      CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_stripeInvoiceId_key" ON "Invoice"("stripeInvoiceId");
      CREATE INDEX IF NOT EXISTS "Invoice_billingAccountId_status_idx" ON "Invoice"("billingAccountId", "status");
      CREATE INDEX IF NOT EXISTS "Invoice_billingAccountId_periodStart_idx" ON "Invoice"("billingAccountId", "periodStart");
      CREATE INDEX IF NOT EXISTS "Invoice_stripeInvoiceId_idx" ON "Invoice"("stripeInvoiceId");
    `);
    console.log('   ✅ Invoice indexes');

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "InvoiceLineItem_invoiceId_idx" ON "InvoiceLineItem"("invoiceId");
      CREATE INDEX IF NOT EXISTS "InvoiceLineItem_jobId_idx" ON "InvoiceLineItem"("jobId");
    `);
    console.log('   ✅ InvoiceLineItem indexes');

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "BillingUsageRecord_firmId_recordedAt_idx" ON "BillingUsageRecord"("firmId", "recordedAt");
      CREATE INDEX IF NOT EXISTS "BillingUsageRecord_firmId_serviceType_idx" ON "BillingUsageRecord"("firmId", "serviceType");
      CREATE INDEX IF NOT EXISTS "BillingUsageRecord_jobId_idx" ON "BillingUsageRecord"("jobId");
      CREATE INDEX IF NOT EXISTS "BillingUsageRecord_invoiceLineItemId_idx" ON "BillingUsageRecord"("invoiceLineItemId");
    `);
    console.log('   ✅ BillingUsageRecord indexes');

    // Create Foreign Keys
    console.log('\n🔗 Creating Foreign Keys...');

    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        ALTER TABLE "BillingAccount" ADD CONSTRAINT "BillingAccount_firmId_fkey" 
          FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log('   ✅ BillingAccount -> Firm');

    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        ALTER TABLE "BillingRate" ADD CONSTRAINT "BillingRate_firmId_fkey" 
          FOREIGN KEY ("firmId") REFERENCES "BillingAccount"("firmId") ON DELETE CASCADE ON UPDATE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log('   ✅ BillingRate -> BillingAccount');

    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        ALTER TABLE "BillingPeriod" ADD CONSTRAINT "BillingPeriod_firmId_fkey" 
          FOREIGN KEY ("firmId") REFERENCES "BillingAccount"("firmId") ON DELETE CASCADE ON UPDATE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log('   ✅ BillingPeriod -> BillingAccount');

    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_billingAccountId_fkey" 
          FOREIGN KEY ("billingAccountId") REFERENCES "BillingAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log('   ✅ Invoice -> BillingAccount');

    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        ALTER TABLE "InvoiceLineItem" ADD CONSTRAINT "InvoiceLineItem_invoiceId_fkey" 
          FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log('   ✅ InvoiceLineItem -> Invoice');

    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        ALTER TABLE "BillingUsageRecord" ADD CONSTRAINT "BillingUsageRecord_firmId_fkey" 
          FOREIGN KEY ("firmId") REFERENCES "BillingAccount"("firmId") ON DELETE CASCADE ON UPDATE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log('   ✅ BillingUsageRecord -> BillingAccount');

    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        ALTER TABLE "BillingUsageRecord" ADD CONSTRAINT "BillingUsageRecord_invoiceLineItemId_fkey" 
          FOREIGN KEY ("invoiceLineItemId") REFERENCES "InvoiceLineItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log('   ✅ BillingUsageRecord -> InvoiceLineItem');

    console.log('\n' + '═'.repeat(60));
    console.log('✅ SUCCESS: Phase 6 billing tables created!');
    console.log('═'.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error);
    throw error;
  }
}

async function main() {
  await applyPhase6Tables();
  
  // Verify the tables were created
  console.log('🔍 Verifying tables were created...\n');
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);
  
  try {
    const { stdout } = await execAsync('npx tsx scripts/verify-phase6-tables.ts');
    console.log(stdout);
  } catch (error: any) {
    console.log(error.stdout || error.message);
  }
}

main()
  .catch((error) => {
    console.error('❌ Failed to apply Phase 6 tables:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


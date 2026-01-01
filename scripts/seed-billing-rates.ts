// =============================================================================
// SEED BILLING RATES
// =============================================================================
// Location: scripts/seed-billing-rates.ts
// Usage: npx tsx scripts/seed-billing-rates.ts
// Purpose: Seed default billing rates and create initial pricing snapshot
// =============================================================================

import { PrismaClient, BillingServiceType, BillingUnit } from '@prisma/client';

const prisma = new PrismaClient();

// Default pricing (in cents) - matches Phase 6B specification
const DEFAULT_RATES = {
  TRANSCRIPTION_AUTOMATED: {
    description: 'Automated Transcription',
    unit: 'PER_MINUTE' as BillingUnit,
    amountCents: 160, // $1.60/minute
  },
  MODEL_UPGRADE: {
    description: 'Enhanced ASR Model (Medical/Bilingual)',
    unit: 'PER_MINUTE' as BillingUnit,
    amountCents: 40, // $0.40/minute additional (25% of base)
  },
  HUMAN_REVIEW_CONFIDENCE: {
    description: 'Low-Confidence Word Review',
    unit: 'PER_WORD' as BillingUnit,
    amountCents: 0.035, // $0.35 per 1000 words = $0.00035/word
  },
  HUMAN_REVIEW_FULL: {
    description: 'Full Scopist Review',
    unit: 'PER_MINUTE' as BillingUnit,
    amountCents: 125, // $1.25/minute
  },
  FORENSIC_AUDIO_RX: {
    description: 'Manual Forensic Audio Cleanup (RX Advanced)',
    unit: 'PER_FILE' as BillingUnit,
    amountCents: 15000, // $150.00 flat fee
  },
};

async function seedBillingRates() {
  console.log('🌱 Seeding billing rates...\n');

  // Get all firms
  const firms = await prisma.firm.findMany({
    select: { id: true, name: true },
  });

  console.log(`Found ${firms.length} firms\n`);

  for (const firm of firms) {
    console.log(`Processing firm: ${firm.name}`);

    // Ensure billing account exists
    let billingAccount = await prisma.billingAccount.findUnique({
      where: { firmId: firm.id },
    });

    if (!billingAccount) {
      // Get firm admin email for billing
      const adminUser = await prisma.user.findFirst({
        where: { firmId: firm.id, role: 'ADMIN' },
        select: { email: true },
      });

      billingAccount = await prisma.billingAccount.create({
        data: {
          firmId: firm.id,
          billingEmail: adminUser?.email || `billing@${firm.name.toLowerCase().replace(/\s+/g, '')}.com`,
        },
      });

      console.log(`  ✅ Created billing account`);
    } else {
      console.log(`  ⏭️  Billing account already exists`);
    }

    // Create billing rates for each service type
    for (const [serviceType, config] of Object.entries(DEFAULT_RATES)) {
      // Check if rate already exists
      const existingRate = await prisma.billingRate.findFirst({
        where: {
          firmId: firm.id,
          serviceType: serviceType as BillingServiceType,
          isActive: true,
        },
      });

      if (existingRate) {
        console.log(`  ⏭️  ${config.description} rate already exists`);
        continue;
      }

      // Create new rate
      await prisma.billingRate.create({
        data: {
          firmId: firm.id,
          serviceType: serviceType as BillingServiceType,
          unit: config.unit,
          amountCents: config.amountCents,
          version: 1,
          isActive: true,
        },
      });

      const price = config.amountCents === 0.035 
        ? '$0.35/1000 words'
        : `$${(config.amountCents / 100).toFixed(2)}`;
      console.log(`  ✅ Created ${config.description} rate: ${price}`);
    }

    console.log('');
  }

  // Create system-wide default pricing snapshot (if PricingSnapshot model exists)
  console.log('Creating system default pricing snapshot...');

  try {
    const snapshot = await prisma.pricingSnapshot.create({
      data: {
        transcriptionRateCents: 160,
        asrMultiplier: 1.25,
        confidenceReviewRateCents: 35, // $0.35 per 1000 words
        fullReviewRateCents: 125,
        rxFlatFeeCents: 15000,
        minTranscriptionMinutes: 15,
      },
    });

    console.log(`✅ Created system pricing snapshot: ${snapshot.id}\n`);
  } catch (error) {
    console.log('⚠️  Could not create PricingSnapshot - table may not exist yet');
    console.log('   Run migration first: npx prisma migrate dev --name add_pricing_snapshots\n');
  }

  console.log('✅ Billing rates seeded successfully!\n');

  // Print summary
  console.log('📊 Rate Summary:');
  console.log('─'.repeat(60));
  for (const [serviceType, config] of Object.entries(DEFAULT_RATES)) {
    let price: string;
    if (config.amountCents === 0.035) {
      price = '$0.35/1000 words';
    } else if (config.amountCents === 0) {
      price = 'Included';
    } else {
      price = `$${(config.amountCents / 100).toFixed(2)}`;
    }
    console.log(`  ${config.description.padEnd(40)} ${price.padStart(15)}`);
  }
  console.log('─'.repeat(60));
}

async function main() {
  try {
    await seedBillingRates();
  } catch (error) {
    console.error('Error seeding billing rates:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

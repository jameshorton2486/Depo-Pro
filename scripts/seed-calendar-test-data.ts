/**
 * Seed Calendar & CSR Test Data
 * 
 * Run: npx tsx scripts/seed-calendar-test-data.ts
 * 
 * Creates test data for:
 * - Agency
 * - Attorneys
 * - Calendar Events
 * - CSR Records
 * - Proper Nouns
 * - Marketplace Settings
 */

import { PrismaClient } from '@prisma/client';
import { addDays, addHours, setHours, setMinutes } from 'date-fns';

const prisma = new PrismaClient();

// Helper to create date at specific time
function createDateTime(daysFromNow: number, hour: number, minute: number = 0): Date {
  const date = addDays(new Date(), daysFromNow);
  return setMinutes(setHours(date, hour), minute);
}

async function main() {
  console.log('🌱 Seeding calendar and CSR test data...\n');

  // ============================================
  // CLEANUP (Optional - uncomment to reset)
  // ============================================
  // await cleanup();

  // ============================================
  // 1. CREATE AGENCY
  // ============================================
  console.log('📦 Creating test agency...');
  
  const agency = await prisma.agency.upsert({
    where: { slug: 'texas-legal-reporting' },
    update: {},
    create: {
      name: 'Texas Legal Reporting',
      slug: 'texas-legal-reporting',
      email: 'admin@texaslegalreporting.com',
      phone: '713-555-0100',
      address: '1000 Main Street, Suite 500',
      city: 'Houston',
      state: 'TX',
      zipCode: '77002',
      planType: 'PROFESSIONAL',
      maxReporters: 25,
      maxFirms: 15,
    },
  });
  console.log(`   ✅ Agency: ${agency.name} (${agency.id})`);

  // ============================================
  // 2. CREATE ATTORNEYS
  // ============================================
  console.log('\n👔 Creating test attorneys...');
  
  const attorneys = await Promise.all([
    prisma.attorney.upsert({
      where: { email: 'thunter@hunterlaw.com' },
      update: {},
      create: {
        firstName: 'Taylor',
        lastName: 'Hunter',
        normalizedName: 'taylor-hunter-hunter-law',
        firmName: 'Hunter Law',
        email: 'thunter@hunterlaw.com',
        phone: '713-555-0201',
        address: '2000 Post Oak Blvd',
        city: 'Houston',
        state: 'TX',
        zipCode: '77056',
        barNumber: '24012345',
        barState: 'TX',
        licensureStates: ['TX'],
        preferredFormat: 'Word',
        preferredDelivery: 'E-Trans',
      },
    }),
    prisma.attorney.upsert({
      where: { email: 'jsmith@pappasgrubbs.com' },
      update: {},
      create: {
        firstName: 'Jennifer',
        lastName: 'Smith',
        normalizedName: 'jennifer-smith-pappas-grubbs-price',
        firmName: 'Pappas Grubbs Price, PC',
        email: 'jsmith@pappasgrubbs.com',
        phone: '713-555-0302',
        address: '3000 Richmond Ave',
        city: 'Houston',
        state: 'TX',
        zipCode: '77098',
        barNumber: '24098765',
        barState: 'TX',
        licensureStates: ['TX', 'OK'],
        preferredFormat: 'PDF',
        preferredDelivery: 'E-Trans',
      },
    }),
    prisma.attorney.upsert({
      where: { email: 'mwilson@wilsondefense.com' },
      update: {},
      create: {
        firstName: 'Michael',
        lastName: 'Wilson',
        normalizedName: 'michael-wilson-wilson-defense',
        firmName: 'Wilson Defense Group',
        email: 'mwilson@wilsondefense.com',
        phone: '214-555-0403',
        address: '4000 Elm Street',
        city: 'Dallas',
        state: 'TX',
        zipCode: '75201',
        barNumber: '24056789',
        barState: 'TX',
        licensureStates: ['TX', 'LA'],
        preferredFormat: 'Word',
        preferredDelivery: 'Both',
      },
    }),
  ]);
  
  attorneys.forEach(att => {
    console.log(`   ✅ Attorney: ${att.firstName} ${att.lastName} (${att.firmName})`);
  });

  // ============================================
  // 3. GET EXISTING USERS
  // ============================================
  console.log('\n👤 Finding existing users...');
  
  const reporter = await prisma.user.findFirst({
    where: { role: 'REPORTER' },
  });
  
  const scopist = await prisma.user.findFirst({
    where: { role: 'SCOPIST' },
  });
  
  const admin = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
  });

  if (!reporter) {
    console.log('   ⚠️  No reporter found - creating test reporter');
    // Create a test reporter if none exists
  }
  
  console.log(`   ✅ Reporter: ${reporter?.firstName} ${reporter?.lastName}`);
  console.log(`   ✅ Scopist: ${scopist?.firstName} ${scopist?.lastName}`);
  console.log(`   ✅ Admin: ${admin?.firstName} ${admin?.lastName}`);

  // ============================================
  // 4. CREATE CALENDAR EVENTS
  // ============================================
  console.log('\n📅 Creating calendar events...');
  
  if (reporter && admin) {
    const events = [
      {
        caseStyle: 'Eric Estopinal v. A&H Foods, LLC',
        caseNumber: '2025-CV-12345',
        deponentName: 'Eric Estopinal',
        deponentRole: 'PLAINTIFF' as const,
        scheduledStart: createDateTime(2, 9), // 2 days from now, 9 AM
        scheduledEnd: createDateTime(2, 17),
        locationType: 'IN_PERSON' as const,
        locationAddress: '1000 Louisiana St',
        locationCity: 'Houston',
        locationState: 'TX',
        status: 'SCHEDULED' as const,
      },
      {
        caseStyle: 'Garcia v. Metro Transit Authority',
        caseNumber: '2025-CV-23456',
        deponentName: 'Maria Garcia',
        deponentRole: 'PLAINTIFF' as const,
        scheduledStart: createDateTime(3, 10),
        scheduledEnd: createDateTime(3, 15),
        locationType: 'ZOOM' as const,
        zoomJoinUrl: 'https://zoom.us/j/1234567890',
        status: 'CONFIRMED' as const,
      },
      {
        caseStyle: 'Williams Tech Corp v. DataSoft Inc.',
        caseNumber: '2025-CV-34567',
        deponentName: 'Robert Chen',
        deponentRole: 'CORPORATE_REP' as const,
        scheduledStart: createDateTime(5, 9),
        scheduledEnd: createDateTime(5, 18),
        locationType: 'IN_PERSON' as const,
        locationAddress: '2001 Ross Ave',
        locationCity: 'Dallas',
        locationState: 'TX',
        status: 'SCHEDULED' as const,
        interpreterRequired: false,
        videographerRequired: true,
      },
      {
        caseStyle: 'Johnson v. City Hospital',
        caseNumber: '2025-CV-45678',
        deponentName: 'Dr. Sarah Johnson',
        deponentRole: 'EXPERT_WITNESS' as const,
        scheduledStart: createDateTime(7, 13),
        scheduledEnd: createDateTime(7, 17),
        locationType: 'ZOOM' as const,
        zoomJoinUrl: 'https://zoom.us/j/9876543210',
        status: 'SCHEDULED' as const,
      },
      {
        caseStyle: 'Martinez v. ABC Insurance Co.',
        caseNumber: '2025-CV-56789',
        deponentName: 'Juan Martinez',
        deponentRole: 'PLAINTIFF' as const,
        scheduledStart: createDateTime(10, 9),
        scheduledEnd: createDateTime(10, 12),
        locationType: 'IN_PERSON' as const,
        locationAddress: '500 Main St',
        locationCity: 'San Antonio',
        locationState: 'TX',
        status: 'SCHEDULED' as const,
        interpreterRequired: true,
        interpreterLanguage: 'Spanish',
      },
    ];

    for (const eventData of events) {
      const event = await prisma.calendarEvent.create({
        data: {
          ...eventData,
          timezone: 'America/Chicago',
          agencyId: agency.id,
          assignedReporterId: reporter.id,
          orderingAttorneyId: attorneys[0].id,
          createdById: admin.id,
        },
      });
      console.log(`   ✅ Event: ${event.caseStyle} (${event.scheduledStart.toLocaleDateString()})`);
    }
  }

  // ============================================
  // 5. CREATE CSR RECORDS (if jobs exist)
  // ============================================
  console.log('\n📋 Creating CSR records...');
  
  const existingJobs = await prisma.job.findMany({
    where: {
      // Find jobs without CSR records
      // csrRecord: null, // Uncomment after schema update
    },
    take: 2,
  });

  for (const job of existingJobs) {
    // Check if CSR record already exists
    const existingCSR = await prisma.cSRRecord.findUnique({
      where: { jobId: job.id },
    }).catch(() => null);

    if (!existingCSR) {
      try {
        const csrRecord = await prisma.cSRRecord.create({
          data: {
            jobId: job.id,
            depositionDate: job.depositionDate,
            scheduledStartTime: job.depositionDate,
            caseCaption: job.caseName,
            causeNumber: job.caseNumber || '2025-CV-00000',
            courtName: '419th Judicial District Court',
            county: 'Harris',
            state: 'TX',
            locationType: job.location?.includes('Zoom') ? 'ZOOM' : 'IN_PERSON',
            locationAddress: job.location || undefined,
          },
        });

        // Add proper nouns
        const properNouns = [
          { value: job.caseName.split(' v. ')[0], category: 'PERSON_NAME' as const },
          { value: job.caseName.split(' v. ')[1]?.replace(', LLC', '').replace(', Inc.', ''), category: 'COMPANY_NAME' as const },
        ].filter(pn => pn.value);

        for (const noun of properNouns) {
          await prisma.cSRProperNoun.create({
            data: {
              csrRecordId: csrRecord.id,
              value: noun.value,
              category: noun.category,
              source: 'Case Title',
              useInTranscription: true,
            },
          }).catch(() => {}); // Ignore duplicates
        }

        console.log(`   ✅ CSR Record: ${job.caseName}`);
      } catch (error) {
        console.log(`   ⚠️  Skipped CSR for job ${job.id} (may already exist)`);
      }
    }
  }

  // ============================================
  // 6. CREATE MARKETPLACE SETTINGS
  // ============================================
  console.log('\n🏪 Creating marketplace settings...');
  
  if (scopist) {
    await prisma.marketplaceSettings.upsert({
      where: { userId: scopist.id },
      update: {},
      create: {
        userId: scopist.id,
        isAvailableForWork: true,
        minPagesAccepted: 50,
        maxPagesAccepted: 300,
        preferredRatePerPage: 3.50,
        acceptsRushJobs: true,
        acceptsMedicalDepos: true,
        acceptsTechnicalDepos: true,
        preferredStates: ['TX', 'OK', 'LA'],
      },
    });
    console.log(`   ✅ Marketplace settings for ${scopist.firstName}`);
  }

  if (reporter) {
    await prisma.marketplaceSettings.upsert({
      where: { userId: reporter.id },
      update: {},
      create: {
        userId: reporter.id,
        autoAcceptClaims: false,
        defaultRatePerPage: 3.25,
        preferredScopists: [],
        blockedScopists: [],
      },
    });
    console.log(`   ✅ Marketplace settings for ${reporter.firstName}`);
  }

  // ============================================
  // 7. CREATE REPORTER AVAILABILITY
  // ============================================
  console.log('\n⏰ Creating reporter availability...');
  
  if (reporter) {
    // Monday - Friday, 8 AM - 6 PM
    const weekdays = [1, 2, 3, 4, 5]; // Mon-Fri
    
    for (const day of weekdays) {
      await prisma.reporterAvailability.upsert({
        where: {
          userId_dayOfWeek_startTime: {
            userId: reporter.id,
            dayOfWeek: day,
            startTime: '08:00',
          },
        },
        update: {},
        create: {
          userId: reporter.id,
          dayOfWeek: day,
          startTime: '08:00',
          endTime: '18:00',
          isActive: true,
        },
      });
    }
    console.log(`   ✅ Availability set for ${reporter.firstName} (Mon-Fri 8AM-6PM)`);
  }

  // ============================================
  // SUMMARY
  // ============================================
  console.log('\n' + '='.repeat(50));
  console.log('✅ SEED COMPLETE');
  console.log('='.repeat(50));
  console.log(`
📊 Summary:
   • 1 Agency created
   • ${attorneys.length} Attorneys created
   • 5 Calendar Events created
   • ${existingJobs.length} CSR Records created
   • 2 Marketplace Settings created
   • Reporter availability configured

🔗 Test the following:
   • Calendar: /calendar
   • Marketplace: /marketplace
   • Job CSR: /jobs/[id]/csr
  `);
}

/**
 * Cleanup function - removes all test data
 * Use with caution!
 */
async function cleanup() {
  console.log('🧹 Cleaning up test data...');
  
  // Delete in order of dependencies
  await prisma.cSRProperNoun.deleteMany({});
  await prisma.cSRWitness.deleteMany({});
  await prisma.cSRAttorney.deleteMany({});
  await prisma.cSRParty.deleteMany({});
  await prisma.cSRTranscriptOptions.deleteMany({});
  await prisma.cSRRecord.deleteMany({});
  await prisma.calendarEvent.deleteMany({});
  await prisma.jobClaim.deleteMany({});
  await prisma.marketplaceSettings.deleteMany({});
  await prisma.reporterAvailability.deleteMany({});
  await prisma.reporterUnavailability.deleteMany({});
  await prisma.attorney.deleteMany({});
  await prisma.agency.deleteMany({});
  
  console.log('   ✅ Cleanup complete');
}

// Run
main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

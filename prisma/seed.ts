import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...\n');

  // Create demo law firm
  const firm = await prisma.firm.upsert({
    where: { emailAddress: 'demo@depo-pro.com' },
    update: {},
    create: {
      name: 'Demo Law Firm',
      emailAddress: 'demo@depo-pro.com',
    },
  });

  console.log('✅ Created firm:', firm.name);

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@demo-law.com' },
    update: {},
    create: {
      email: 'admin@demo-law.com',
      name: 'Admin User',
      role: UserRole.ADMIN,
      firmId: firm.id,
    },
  });

  console.log('✅ Created admin:', admin.email);

  // Create court reporter
  const reporter = await prisma.user.upsert({
    where: { email: 'reporter@demo-law.com' },
    update: {},
    create: {
      email: 'reporter@demo-law.com',
      name: 'Court Reporter',
      role: UserRole.COURT_REPORTER,
      firmId: firm.id,
    },
  });

  console.log('✅ Created court reporter:', reporter.email);

  // Create scopist
  const scopist = await prisma.user.upsert({
    where: { email: 'scopist@demo-law.com' },
    update: {},
    create: {
      email: 'scopist@demo-law.com',
      name: 'Scopist User',
      role: UserRole.SCOPIST,
      firmId: firm.id,
    },
  });

  console.log('✅ Created scopist:', scopist.email);

  // Add some common legal terms to dictionary
  const legalTerms = [
    { word: 'deposition', category: 'LEGAL_TERM' },
    { word: 'plaintiff', category: 'LEGAL_TERM' },
    { word: 'defendant', category: 'LEGAL_TERM' },
    { word: 'objection', category: 'LEGAL_TERM' },
    { word: 'sustained', category: 'LEGAL_TERM' },
    { word: 'overruled', category: 'LEGAL_TERM' },
    { word: 'exhibit', category: 'LEGAL_TERM' },
    { word: 'testimony', category: 'LEGAL_TERM' },
  ];

  for (const term of legalTerms) {
    await prisma.customDictionaryEntry.upsert({
      where: {
        firmId_word: {
          firmId: firm.id,
          word: term.word,
        },
      },
      update: {},
      create: {
        firmId: firm.id,
        word: term.word,
        category: term.category as any,
        source: 'MANUAL',
      },
    });
  }

  console.log(`✅ Added ${legalTerms.length} legal terms to dictionary`);

  console.log('\n🎉 Seeding complete!\n');
  console.log('Demo credentials:');
  console.log('  Admin: admin@demo-law.com');
  console.log('  Reporter: reporter@demo-law.com');
  console.log('  Scopist: scopist@demo-law.com');
  console.log(`  Firm ID: ${firm.id}\n`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

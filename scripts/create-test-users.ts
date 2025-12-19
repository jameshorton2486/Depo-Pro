// scripts/create-test-users.ts
// Create test user accounts for beta testing

import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const password = await hash('Test123!', 10);

  console.log('Creating test users...');

  // Create test reporter
  const reporter = await prisma.user.upsert({
    where: { email: 'reporter@test.com' },
    update: {},
    create: {
      email: 'reporter@test.com',
      passwordHash: password,
      role: 'REPORTER',
      firstName: 'Test',
      lastName: 'Reporter',
      agencyName: 'Test Agency',
    },
  });

  console.log('✅ Reporter created:', reporter.email);

  // Create test scopist
  const scopist = await prisma.user.upsert({
    where: { email: 'scopist@test.com' },
    update: {},
    create: {
      email: 'scopist@test.com',
      passwordHash: password,
      role: 'SCOPIST',
      firstName: 'Test',
      lastName: 'Scopist',
      specialties: ['medical', 'legal'],
      experienceLevel: 'expert',
    },
  });

  console.log('✅ Scopist created:', scopist.email);

  // Create admin (optional)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@test.com' },
    update: {},
    create: {
      email: 'admin@test.com',
      passwordHash: password,
      role: 'ADMIN',
      firstName: 'Admin',
      lastName: 'User',
    },
  });

  console.log('✅ Admin created:', admin.email);

  console.log('\n📋 Test Account Credentials:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Reporter:');
  console.log('  Email: reporter@test.com');
  console.log('  Password: Test123!');
  console.log('\nScopist:');
  console.log('  Email: scopist@test.com');
  console.log('  Password: Test123!');
  console.log('\nAdmin:');
  console.log('  Email: admin@test.com');
  console.log('  Password: Test123!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((error) => {
    console.error('Error creating test users:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


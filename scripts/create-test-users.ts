// scripts/create-test-users.ts
// Create test user accounts for beta testing
// 
// ⚠️ IMPORTANT: Users must be created via Supabase Auth first!
// This script only creates the Prisma User records that reference Supabase users.
// Run this AFTER creating users in Supabase Auth dashboard or via Supabase API.

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('⚠️  NOTE: Users must exist in Supabase Auth first!');
  console.log('This script creates Prisma User records that reference Supabase user IDs.\n');

  // Create test reporter (requires Supabase user ID)
  // Replace 'supabase-user-id-here' with actual Supabase auth user ID
  const reporter = await prisma.user.upsert({
    where: { email: 'reporter@test.com' },
    update: {},
    create: {
      id: 'supabase-user-id-reporter', // Replace with actual Supabase auth user ID
      email: 'reporter@test.com',
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
      id: 'supabase-user-id-scopist', // Replace with actual Supabase auth user ID
      email: 'scopist@test.com',
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
      id: 'supabase-user-id-admin', // Replace with actual Supabase auth user ID
      email: 'admin@test.com',
      role: 'ADMIN',
      firstName: 'Admin',
      lastName: 'User',
    },
  });

  console.log('✅ Admin created:', admin.email);

  console.log('\n📋 Test Users Created:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Reporter: reporter@test.com');
  console.log('Scopist: scopist@test.com');
  console.log('Admin: admin@test.com');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n⚠️  Remember: Create these users in Supabase Auth first!');
}

main()
  .catch((error) => {
    console.error('Error creating test users:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


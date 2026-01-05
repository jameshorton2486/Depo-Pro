// scripts/create-admin-user.ts
// Create an admin user with secure credentials
//
// ⚠️ IMPORTANT: User must be created via Supabase Auth first!
// This script only creates the Prisma User record that references the Supabase user.
// Steps:
// 1. Create user in Supabase Auth dashboard or via Supabase API
// 2. Get the Supabase user ID (UUID)
// 3. Run this script with the Supabase user ID

import { PrismaClient, UserRole } from '@prisma/client';

// Ensure DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  console.log('🔐 Creating admin user for James Horton...\n');
  console.log('⚠️  NOTE: User must exist in Supabase Auth first!');
  console.log('Get the Supabase user ID from Supabase Auth dashboard.\n');

  // Replace with actual Supabase auth user ID (UUID)
  const SUPABASE_USER_ID = process.env.SUPABASE_USER_ID || 'supabase-user-id-here';
  
  if (SUPABASE_USER_ID === 'supabase-user-id-here') {
    console.error('❌ SUPABASE_USER_ID environment variable is not set');
    console.error('   Set it to the Supabase auth user ID (UUID)');
    process.exit(1);
  }

  // Check if firm exists, create if needed
  let firm = await prisma.firm.findFirst();

  if (!firm) {
    firm = await prisma.firm.create({
      data: {
        id: 'james-horton-firm',
        name: 'Depo-Pro Legal Services',
        address: '123 Main Street',
        phone: '555-123-4567',
        email: 'jameshorton2486@gmail.com',
      },
    });
    console.log('✅ Created firm:', firm.name);
  } else {
    console.log('✅ Using existing firm:', firm.name);
  }

  // Create admin user (references Supabase auth user)
  const admin = await prisma.user.upsert({
    where: { email: 'jameshorton2486@gmail.com' },
    update: {
      role: UserRole.ADMIN,
      firstName: 'James',
      lastName: 'Horton',
      firmId: firm.id,
    },
    create: {
      id: SUPABASE_USER_ID, // Supabase auth user ID (UUID)
      email: 'jameshorton2486@gmail.com',
      firstName: 'James',
      lastName: 'Horton',
      role: UserRole.ADMIN,
      firmId: firm.id,
      timezone: 'America/New_York',
    },
  });

  console.log('\n✅ Admin user created successfully!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📧 Email:    jameshorton2486@gmail.com');
  console.log('🆔 Supabase ID: ' + SUPABASE_USER_ID);
  console.log('👤 Role:     ADMIN');
  console.log('🏢 Firm:     ' + firm.name);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n⚠️  IMPORTANT: User must be created in Supabase Auth first!');
  console.log('🔒 Authentication is handled by Supabase.\n');

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('❌ Error creating admin user:', error);
  process.exit(1);
});
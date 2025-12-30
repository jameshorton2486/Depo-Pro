// scripts/create-admin-user.ts
// Create an admin user with secure credentials

import { PrismaClient, UserRole } from '@prisma/client';
import { hash } from 'bcryptjs';
import { randomBytes } from 'crypto';

// Ensure DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

const prisma = new PrismaClient();

function generateSecurePassword(): string {
  // Generate a secure 12-character password
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

async function main() {
  console.log('🔐 Creating admin user for James Horton...\n');

  // Secure password for initial login
  const plainPassword = 'DepoProAdmin2025!';
  const passwordHash = await hash(plainPassword, 10);

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

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: 'jameshorton2486@gmail.com' },
    update: {
      passwordHash,
      role: UserRole.ADMIN,
      firstName: 'James',
      lastName: 'Horton',
      firmId: firm.id,
    },
    create: {
      email: 'jameshorton2486@gmail.com',
      firstName: 'James',
      lastName: 'Horton',
      role: UserRole.ADMIN,
      passwordHash,
      firmId: firm.id,
      timezone: 'America/New_York',
    },
  });

  console.log('\n✅ Admin user created successfully!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📧 Email:    jameshorton2486@gmail.com');
  console.log('🔑 Password: DepoProAdmin2025!');
  console.log('👤 Role:     ADMIN');
  console.log('🏢 Firm:     ' + firm.name);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n⚠️  IMPORTANT: Change your password after first login!');
  console.log('🔒 Keep these credentials secure.\n');

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('❌ Error creating admin user:', error);
  process.exit(1);
});
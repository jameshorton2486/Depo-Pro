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
  console.log('🔐 Creating admin user with secure credentials...\n');

  // Generate secure password
  const plainPassword = generateSecurePassword();
  const passwordHash = await hash(plainPassword, 10);

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@depo-pro.com' },
    update: {
      passwordHash,
    },
    create: {
      email: 'admin@depo-pro.com',
      firstName: 'Admin',
      lastName: 'User',
      role: UserRole.ADMIN,
      passwordHash,
    },
  });

  console.log('✅ Admin user created/updated successfully!');
  console.log('📧 Email: admin@depo-pro.com');
  console.log('🔑 Password:', plainPassword);
  console.log('\n⚠️  IMPORTANT: Save these credentials securely!');
  console.log('🔒 This password will only be shown once.\n');

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('❌ Error creating admin user:', error);
  process.exit(1);
});
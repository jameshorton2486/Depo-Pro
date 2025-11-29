// scripts/seed-production.ts
// Seed essential data for production

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding production database...');

  // Create default firm if not exists
  const defaultFirm = await prisma.firm.upsert({
    where: { id: 'default-firm' },
    update: {},
    create: {
      id: 'default-firm',
      name: 'Default Firm',
      email: 'admin@depo-pro.com',
    },
  });

  console.log('✅ Default firm created:', defaultFirm.name);

  // Create admin user if not exists
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@depo-pro.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'changeme123';
  
  const hashedPassword = await bcrypt.hash(adminPassword, 12);

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      firstName: 'Admin',
      lastName: 'User',
      password: hashedPassword,
      role: 'ADMIN',
      firmId: defaultFirm.id,
    },
  });

  console.log('✅ Admin user created:', adminUser.email);
  console.log('');
  console.log('⚠️  IMPORTANT: Change the admin password immediately after first login!');
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { PrismaClient, UserRole } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...\n');

  const passwordHash = await hash('password123', 10);

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@depo-pro.com' },
    update: {},
    create: {
      email: 'admin@depo-pro.com',
      firstName: 'Admin',
      lastName: 'User',
      role: UserRole.ADMIN,
      passwordHash,
    },
  });

  console.log('✅ Created admin:', admin.email);

  // Create court reporter
  const reporter = await prisma.user.upsert({
    where: { email: 'reporter@depo-pro.com' },
    update: {},
    create: {
      email: 'reporter@depo-pro.com',
      firstName: 'Court',
      lastName: 'Reporter',
      role: UserRole.REPORTER,
      passwordHash,
    },
  });

  console.log('✅ Created court reporter:', reporter.email);

  // Create scopist
  const scopist = await prisma.user.upsert({
    where: { email: 'scopist@depo-pro.com' },
    update: {},
    create: {
      email: 'scopist@depo-pro.com',
      firstName: 'Scopist',
      lastName: 'User',
      role: UserRole.SCOPIST,
      passwordHash,
    },
  });

  console.log('✅ Created scopist:', scopist.email);

  console.log('\n🎉 Seeding complete!\n');
  console.log('Demo credentials (password: password123):');
  console.log('  Admin: admin@depo-pro.com');
  console.log('  Reporter: reporter@depo-pro.com');
  console.log('  Scopist: scopist@depo-pro.com');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

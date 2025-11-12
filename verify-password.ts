// Quick script to verify password hashing
import { PrismaClient } from '@prisma/client';
import { compare } from 'bcryptjs';

const prisma = new PrismaClient();

async function verifyPasswords() {
  console.log('🔍 Checking user passwords...\n');

  const users = await prisma.user.findMany({
    where: {
      email: {
        in: ['admin@depo-pro.com', 'reporter@depo-pro.com', 'scopist@depo-pro.com']
      }
    },
    select: {
      email: true,
      passwordHash: true,
    }
  });

  for (const user of users) {
    const isValid = await compare('password123', user.passwordHash);
    console.log(`${user.email}:`);
    console.log(`  Hash: ${user.passwordHash.substring(0, 20)}...`);
    console.log(`  Valid with 'password123': ${isValid ? '✅' : '❌'}`);
    console.log('');
  }

  await prisma.$disconnect();
}

verifyPasswords().catch(console.error);

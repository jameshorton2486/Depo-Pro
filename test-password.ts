// Quick password test script
import { hash, compare } from 'bcryptjs';
import { db } from './lib/db';

async function testPassword() {
  console.log('🔐 Testing Password Hashing...\n');
  
  // Test hashing
  const plainPassword = 'password123';
  const hashed = await hash(plainPassword, 10);
  console.log('Plain Password:', plainPassword);
  console.log('Hashed Password:', hashed);
  
  // Test comparison
  const isValid = await compare(plainPassword, hashed);
  console.log('Password Valid:', isValid);
  
  // Check database user
  console.log('\n📋 Checking database user...');
  const user = await db.user.findUnique({
    where: { email: 'admin@depo-pro.com' },
    select: {
      email: true,
      name: true,
      passwordHash: true,
    },
  });
  
  if (user) {
    console.log('User found:', user.email);
    console.log('Has password hash:', !!user.passwordHash);
    console.log('Password hash length:', user.passwordHash?.length);
    
    if (user.passwordHash) {
      const dbPasswordValid = await compare('password123', user.passwordHash);
      console.log('DB Password Valid:', dbPasswordValid);
    }
  } else {
    console.log('User not found!');
  }
  
  await db.$disconnect();
}

testPassword().catch(console.error);

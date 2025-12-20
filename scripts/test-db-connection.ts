/**
 * Test database connection script
 * Run with: npx tsx scripts/test-db-connection.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testConnection() {
  try {
    console.log('🔌 Testing database connection...\n');
    
    // Test basic connection
    await prisma.$connect();
    console.log('✅ Successfully connected to database!\n');
    
    // Test a simple query
    const result = await prisma.$queryRaw`SELECT version() as version`;
    console.log('📊 Database version:', (result as any)[0]?.version || 'Unknown');
    
    // Test if we can query a table
    try {
      const userCount = await prisma.user.count();
      console.log(`👥 Users in database: ${userCount}`);
    } catch (error: any) {
      if (error.message?.includes('does not exist')) {
        console.log('⚠️  User table does not exist yet. Run: npx prisma db push');
      } else {
        throw error;
      }
    }
    
    console.log('\n✅ All tests passed! Database connection is working.');
    
  } catch (error: any) {
    console.error('\n❌ Database connection failed!\n');
    console.error('Error:', error.message);
    console.error('\n🔍 Troubleshooting steps:');
    console.error('1. Verify DATABASE_URL in .env file');
    console.error('2. Check Supabase dashboard → Settings → Database');
    console.error('3. Ensure your IP is allowed (or use connection pooler)');
    console.error('4. Verify password is correct');
    console.error('5. Check if database is paused in Supabase');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();


// scripts/test-db-connection.ts
// Quick script to test database connection

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testConnection() {
  try {
    console.log('🔍 Testing database connection...\n');
    
    // Test basic connection
    await prisma.$connect();
    console.log('✅ Database connection successful!\n');
    
    // Test a simple query
    const userCount = await prisma.user.count();
    console.log(`✅ Query test successful! Found ${userCount} user(s) in database.\n`);
    
    // Test schema access
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `;
    
    console.log(`✅ Schema access successful! Found ${tables.length} tables:\n`);
    tables.forEach(table => {
      console.log(`   - ${table.tablename}`);
    });
    
    console.log('\n🎉 All database tests passed!');
    
  } catch (error) {
    console.error('\n❌ Database connection failed!\n');
    
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      
      if (error.message.includes('P1000') || error.message.includes('Authentication')) {
        console.error('\n💡 This is an authentication error.');
        console.error('   Check your DATABASE_URL in .env.local');
        console.error('   Verify your Supabase password is correct');
        console.error('   Ensure you\'re using direct connection (port 5432)');
      } else if (error.message.includes('P1001') || error.message.includes('Can\'t reach')) {
        console.error('\n💡 Cannot reach database server.');
        console.error('   Check your internet connection');
        console.error('   Verify Supabase project is active');
        console.error('   Check if IP is whitelisted in Supabase');
      } else if (error.message.includes('SSL')) {
        console.error('\n💡 SSL connection issue.');
        console.error('   Add ?sslmode=require to your DATABASE_URL');
      }
    } else {
      console.error('Unknown error:', error);
    }
    
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();

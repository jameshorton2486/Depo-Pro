// scripts/test-supabase-auth.ts
// Test Supabase authentication setup
//
// Usage: npm run tsx scripts/test-supabase-auth.ts

import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function main() {
  console.log('🔍 Testing Supabase Authentication Setup...\n');

  // Check environment variables
  console.log('📋 Environment Variables:');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log(`  NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? '✅ Set' : '❌ Missing'}`);
  console.log(`  NEXT_PUBLIC_SUPABASE_ANON_KEY: ${supabaseAnonKey ? '✅ Set' : '❌ Missing'}`);
  console.log(`  SUPABASE_SERVICE_ROLE_KEY: ${serviceRoleKey ? '✅ Set' : '❌ Missing'}\n`);

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing required Supabase environment variables');
    console.error('   Check your .env.local file');
    process.exit(1);
  }

  // Test admin client
  console.log('🔐 Testing Admin Client:');
  try {
    const adminClient = getSupabaseAdminClient();
    console.log('  ✅ Admin client created successfully');
    
    // Try to list users (requires service role key)
    if (serviceRoleKey) {
      const { data: users, error } = await adminClient.auth.admin.listUsers();
      if (error) {
        console.log(`  ⚠️  Cannot list users: ${error.message}`);
      } else {
        console.log(`  ✅ Found ${users.users.length} user(s) in Supabase Auth`);
        if (users.users.length > 0) {
          console.log('\n  Users in Supabase Auth:');
          users.users.slice(0, 5).forEach((user) => {
            console.log(`    - ${user.email} (ID: ${user.id})`);
          });
        }
      }
    } else {
      console.log('  ⚠️  Service role key not set - cannot list users');
    }
  } catch (error: any) {
    console.error(`  ❌ Admin client error: ${error.message}`);
  }

  console.log('\n✅ Supabase authentication setup check complete');
  console.log('\n💡 Next steps:');
  console.log('   1. Ensure users exist in Supabase Auth (check Dashboard)');
  console.log('   2. Run: npm run list-users (to see database profiles)');
  console.log('   3. Run: npm run promote-to-admin (to promote a user)');
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});

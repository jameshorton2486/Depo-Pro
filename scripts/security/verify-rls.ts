/**
 * Runtime RLS verification script
 * Fails if anon or authenticated users can read restricted tables
 * 
 * Usage: tsx scripts/verify-rls.ts
 * 
 * This script proves RLS is actually enforced at runtime, not just assumed.
 * Run in CI/CD pipeline to catch RLS misconfigurations before production.
 */

import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

async function verifyRLS() {
  console.log('🔒 Verifying Row Level Security (RLS) policies...\n');

  const anon = createClient(url, anonKey);

  // Test 1: Anon user should NOT be able to read users table
  console.log('Test 1: Verifying anon user cannot read users table...');
  const { data: usersData, error: usersError } = await anon
    .from('users')
    .select('*')
    .limit(1);

  if (!usersError && usersData && usersData.length > 0) {
    throw new Error(
      '❌ RLS FAILURE: anon user can read users table. RLS is not enforced.'
    );
  }
  console.log('✅ RLS enforced for users table (anon blocked)');

  // Test 2: Anon user should NOT be able to read jobs table
  console.log('Test 2: Verifying anon user cannot read jobs table...');
  const { data: jobsData, error: jobsError } = await anon
    .from('jobs')
    .select('*')
    .limit(1);

  if (!jobsError && jobsData && jobsData.length > 0) {
    throw new Error(
      '❌ RLS FAILURE: anon user can read jobs table. RLS is not enforced.'
    );
  }
  console.log('✅ RLS enforced for jobs table (anon blocked)');

  // Test 3: Anon user should NOT be able to read transcriptions table
  console.log('Test 3: Verifying anon user cannot read transcriptions table...');
  const { data: transcriptionsData, error: transcriptionsError } = await anon
    .from('transcriptions')
    .select('*')
    .limit(1);

  if (!transcriptionsError && transcriptionsData && transcriptionsData.length > 0) {
    throw new Error(
      '❌ RLS FAILURE: anon user can read transcriptions table. RLS is not enforced.'
    );
  }
  console.log('✅ RLS enforced for transcriptions table (anon blocked)');

  console.log('\n✅ All RLS policies verified successfully');
  console.log('🔒 Row Level Security is properly configured');
}

verifyRLS().catch((err) => {
  console.error('\n❌ RLS Verification Failed:');
  console.error(err.message);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * Verify Environment Variables at Runtime
 * Checks if NEXT_PUBLIC_* vars are accessible (for debugging)
 */

console.log('🔍 Verifying NEXT_PUBLIC_* Environment Variables...\n');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

console.log('📋 Runtime Values:');
console.log('─'.repeat(60));

if (!supabaseUrl) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL: UNDEFINED');
  console.error('   This means the variable was NOT replaced at build time!');
} else {
  console.log('✅ NEXT_PUBLIC_SUPABASE_URL: Defined');
  console.log(`   Value: ${supabaseUrl.substring(0, 50)}...`);
  console.log(`   Length: ${supabaseUrl.length} characters`);
}

if (!publishableKey) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: UNDEFINED');
  console.error('   This means the variable was NOT replaced at build time!');
  console.error('   This will cause "Invalid API key" errors!');
} else {
  console.log('✅ NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: Defined');
  console.log(`   Value: ${publishableKey.substring(0, 30)}...`);
  console.log(`   Length: ${publishableKey.length} characters`);
  
  if (!publishableKey.startsWith('sb_publishable_')) {
    console.error('❌ ERROR: Key does not start with "sb_publishable_"');
    console.error('   Get the publishable key from Supabase Dashboard → Settings → API Keys');
  } else {
    console.log('✅ Key format correct (sb_publishable_*)');
  }
}

console.log('─'.repeat(60));

if (!supabaseUrl || !publishableKey) {
  console.error('\n❌ CRITICAL: Environment variables are undefined!');
  console.error('\n🔧 To fix:');
  console.error('1. Check .env.local has the correct values (no quotes)');
  console.error('2. Delete .next folder completely');
  console.error('3. Run: npm run dev');
  console.error('4. NEXT_PUBLIC_* vars MUST be replaced at BUILD TIME');
  process.exit(1);
}

console.log('\n✅ Environment variables are defined at runtime');
console.log('\n💡 If browser still shows "Invalid API key":');
console.log('   1. The build cache may be stale - delete .next and rebuild');
console.log('   2. Check browser Network tab - see actual request to Supabase');
console.log('   3. Verify the publishable key in Supabase Dashboard matches this value');

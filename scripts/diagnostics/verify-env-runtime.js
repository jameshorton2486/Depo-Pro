#!/usr/bin/env node
/**
 * Verify Environment Variables at Runtime
 * Checks if NEXT_PUBLIC_* vars are accessible (for debugging)
 */

console.log('🔍 Verifying NEXT_PUBLIC_* Environment Variables...\n');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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

if (!supabaseAnonKey) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY: UNDEFINED');
  console.error('   This means the variable was NOT replaced at build time!');
  console.error('   This will cause "Invalid API key" errors!');
} else {
  console.log('✅ NEXT_PUBLIC_SUPABASE_ANON_KEY: Defined');
  console.log(`   Value: ${supabaseAnonKey.substring(0, 30)}...`);
  console.log(`   Length: ${supabaseAnonKey.length} characters`);
  
  if (supabaseAnonKey.length < 100) {
    console.warn('⚠️  WARNING: Key seems too short (expected ~200+ characters)');
  }
  
  if (!supabaseAnonKey.startsWith('eyJ')) {
    console.warn('⚠️  WARNING: Key does not start with "eyJ" (JWT format)');
  }
}

console.log('─'.repeat(60));

if (!supabaseUrl || !supabaseAnonKey) {
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
console.log('   3. Verify the ANON key in Supabase Dashboard matches this value');

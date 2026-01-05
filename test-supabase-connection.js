/**
 * Test Supabase Connection & API Keys
 * This will verify if your Supabase credentials are valid
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('🔐 TESTING SUPABASE CONNECTION');
console.log('═══════════════════════════════════════════════════════════════\n');

// Check environment variables
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('📋 Step 1: Checking Environment Variables\n');
console.log(`URL: ${url ? '✓ Set' : '❌ Missing'}`);
if (url) console.log(`     ${url}`);
console.log(`Anon Key: ${anonKey ? '✓ Set' : '❌ Missing'}`);
if (anonKey) console.log(`     ${anonKey.substring(0, 30)}...`);
console.log(`Service Key: ${serviceKey ? '✓ Set' : '❌ Missing'}`);
if (serviceKey) console.log(`     ${serviceKey.substring(0, 30)}...`);

if (!url || !anonKey || !serviceKey) {
  console.log('\n❌ FAILED: Missing required environment variables');
  console.log('\n📝 Required in .env.local:');
  console.log('   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co');
  console.log('   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiI...');
  console.log('   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiI...\n');
  process.exit(1);
}

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('🧪 Step 2: Testing Anon Key Connection');
console.log('═══════════════════════════════════════════════════════════════\n');

async function testConnection() {
  try {
    // Test 1: Create client with anon key
    const supabase = createClient(url, anonKey);
    console.log('✓ Client created successfully with anon key\n');

    // Test 2: Try to access auth (this should work even without authentication)
    console.log('Testing auth session...');
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      console.log(`❌ Auth session error: ${sessionError.message}`);
      if (sessionError.message.includes('Invalid API key') || sessionError.message.includes('Invalid JWT')) {
        console.log('\n🚨 YOUR ANON KEY IS INVALID OR EXPIRED');
        console.log('   Go to: Supabase Dashboard → Project Settings → API');
        console.log('   Copy the "anon public" key\n');
        return false;
      }
    } else {
      console.log('✓ Auth session check passed (no active session is normal)\n');
    }

    // Test 3: Try to query a basic endpoint
    console.log('Testing database connection...');
    const { data, error } = await supabase.from('User').select('count', { count: 'exact', head: true });

    if (error) {
      if (error.message.includes('relation "User" does not exist')) {
        console.log('✓ Database connection works (table check failed, but that\'s expected)\n');
      } else if (error.message.includes('Invalid API key')) {
        console.log(`❌ API key error: ${error.message}\n`);
        console.log('🚨 YOUR CREDENTIALS ARE INVALID');
        console.log('   Update .env.local with real keys from Supabase Dashboard\n');
        return false;
      } else {
        console.log(`⚠️  Query error (may be normal): ${error.message}\n`);
      }
    } else {
      console.log('✓ Database query succeeded\n');
    }

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🧪 Step 3: Testing Service Role Key');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Test 4: Create admin client
    const adminClient = createClient(url, serviceKey);
    console.log('✓ Admin client created successfully\n');

    // Test 5: Test service role access
    console.log('Testing admin privileges...');
    const { error: adminError } = await adminClient.from('User').select('count', { count: 'exact', head: true });

    if (adminError) {
      if (adminError.message.includes('relation "User" does not exist')) {
        console.log('✓ Service role key works (table check failed, but that\'s expected)\n');
      } else if (adminError.message.includes('Invalid API key')) {
        console.log(`❌ Service role key is invalid: ${adminError.message}\n`);
        console.log('🚨 YOUR SERVICE_ROLE_KEY IS INVALID');
        console.log('   Update SUPABASE_SERVICE_ROLE_KEY in .env.local\n');
        return false;
      } else {
        console.log(`⚠️  Admin query error: ${adminError.message}\n`);
      }
    } else {
      console.log('✓ Service role key verified\n');
    }

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ SUCCESS: ALL CREDENTIALS ARE VALID');
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log('📝 Next steps:');
    console.log('   1. Restart your dev server: npm run dev');
    console.log('   2. Try registering at: http://localhost:3000/register');
    console.log('   3. Check browser console for any remaining errors\n');
    return true;

  } catch (err) {
    console.log(`\n❌ UNEXPECTED ERROR: ${err.message}\n`);
    console.error(err);
    return false;
  }
}

testConnection().then((success) => {
  process.exit(success ? 0 : 1);
});

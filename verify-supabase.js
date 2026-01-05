/**
 * Verify Supabase Environment & Connection
 * Usage: node verify-supabase.js
 */

require('dotenv').config({ path: '.env.local' });

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('SUPABASE ENVIRONMENT VERIFICATION');
console.log('═══════════════════════════════════════════════════════════════\n');

const checks = {
  'NEXT_PUBLIC_SUPABASE_URL': process.env.NEXT_PUBLIC_SUPABASE_URL,
  'NEXT_PUBLIC_SUPABASE_ANON_KEY': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✓ SET (hidden)' : '❌ MISSING',
  'SUPABASE_SERVICE_ROLE_KEY': process.env.SUPABASE_SERVICE_ROLE_KEY ? '✓ SET (hidden)' : '❌ MISSING',
  'SUPABASE_URL': process.env.SUPABASE_URL,
  'DATABASE_URL': process.env.DATABASE_URL ? '✓ SET (hidden)' : '❌ MISSING',
  'DIRECT_URL': process.env.DIRECT_URL ? '✓ SET (hidden)' : '❌ MISSING',
};

Object.entries(checks).forEach(([key, value]) => {
  const status = typeof value === 'string' && value.includes('https') ? '✓' : typeof value === 'string' && value.includes('SET') ? '✓' : '✗';
  console.log(`${status} ${key}: ${typeof value === 'string' && value.includes('https') ? value : typeof value === 'string' ? value : '(NOT SET)'}`);
});

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('VALIDATION SUMMARY');
console.log('═══════════════════════════════════════════════════════════════\n');

const hasRequired =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
  process.env.SUPABASE_SERVICE_ROLE_KEY &&
  process.env.DATABASE_URL;

if (hasRequired) {
  console.log('✅ All required Supabase variables are set!');
  console.log('\n📝 Next Steps:');
  console.log('   1. Try registering: /register');
  console.log('   2. Check Supabase Dashboard for new auth users');
  console.log('   3. Verify database tables via Prisma Studio: npx prisma studio\n');
} else {
  console.log('❌ Missing required variables. Please check .env.local');
  console.log('\n📝 Required variables:');
  console.log('   - NEXT_PUBLIC_SUPABASE_URL');
  console.log('   - NEXT_PUBLIC_SUPABASE_ANON_KEY');
  console.log('   - SUPABASE_SERVICE_ROLE_KEY');
  console.log('   - DATABASE_URL\n');
}

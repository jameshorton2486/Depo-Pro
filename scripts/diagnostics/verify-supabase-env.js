#!/usr/bin/env node
/**
 * Supabase environment sanity check
 * Run: node scripts/diagnostics/verify-supabase-env.js
 */

const required = [
  { key: 'NEXT_PUBLIC_SUPABASE_URL', mask: false, required: true },
  { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', mask: true, required: true },
  { key: 'SUPABASE_SERVICE_ROLE_KEY', mask: true, required: false },
  { key: 'SUPABASE_URL', mask: false, required: false },
  { key: 'SUPABASE_ANON_KEY', mask: true, required: false },
  { key: 'NEXT_PUBLIC_SITE_URL', mask: false, required: true },
  // NextAuth removed - using Supabase only
];

const maskValue = (val) => {
  if (!val) return 'NOT SET';
  if (val.length <= 12) return `${val} (${val.length})`;
  const head = val.slice(0, 4);
  const tail = val.slice(-4);
  return `${head}...${tail} (len ${val.length})`;
};

let hasCriticalGap = false;
console.log('\n🔍 Supabase env diagnostic');
console.log('='.repeat(50));

for (const { key, mask, required } of required) {
  const value = process.env[key];
  const isSet = Boolean(value);
  const status = isSet ? '✅' : required ? '❌' : '⚠️';
  if (required && !isSet) hasCriticalGap = true;
  console.log(`${status} ${key}`);
  console.log(`    Value: ${mask ? maskValue(value) : value || 'NOT SET'}`);
}

// Basic URL format check
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (supabaseUrl) {
  try {
    const parsed = new URL(supabaseUrl);
    if (!parsed.hostname.endsWith('.supabase.co')) {
      console.log('⚠️  NEXT_PUBLIC_SUPABASE_URL host is not *.supabase.co');
    }
  } catch (err) {
    console.log('❌ NEXT_PUBLIC_SUPABASE_URL is not a valid URL');
    hasCriticalGap = true;
  }
}

// Basic JWT shape check
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (anon) {
  const parts = anon.split('.');
  if (parts.length !== 3) {
    console.log('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is not a JWT');
    hasCriticalGap = true;
  }
}

console.log('='.repeat(50));
if (hasCriticalGap) {
  console.log('❌ Missing required env vars. See above.');
  process.exitCode = 1;
} else {
  console.log('✅ Core env vars look present.');
}
console.log();

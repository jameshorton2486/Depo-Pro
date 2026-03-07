#!/usr/bin/env node
/**
 * Environment Variables Diagnostic Script
 * Checks if Supabase environment variables are set correctly
 * Run: node scripts/check-env-vars.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Checking Supabase Environment Variables...\n');

// Check for .env.local file
const envLocalPath = path.join(__dirname, '..', '.env.local');
const envPath = path.join(__dirname, '..', '.env');

let envFile = null;
if (fs.existsSync(envLocalPath)) {
  envFile = envLocalPath;
  console.log('✅ Found .env.local file');
} else if (fs.existsSync(envPath)) {
  envFile = envPath;
  console.log('⚠️  Found .env file (should use .env.local for local development)');
} else {
  console.error('❌ No .env.local or .env file found!');
  console.error('   Create .env.local in the project root with:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co');
  console.error('   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
  process.exit(1);
}

// Read and parse env file
const envContent = fs.readFileSync(envFile, 'utf8');
const envLines = envContent.split('\n');

let supabaseUrl = null;
let publishableKey = null;
let hasQuotes = false;

for (const line of envLines) {
  const trimmed = line.trim();
  if (trimmed.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
    supabaseUrl = trimmed.substring('NEXT_PUBLIC_SUPABASE_URL='.length).trim();
  } else if (trimmed.startsWith('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=')) {
    publishableKey = trimmed.substring('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='.length).trim();
  }
}

console.log('\n📋 Environment Variable Status:');
console.log('─'.repeat(50));

// Check URL
if (!supabaseUrl) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL: NOT SET');
} else {
  if (supabaseUrl.startsWith('"') || supabaseUrl.endsWith('"')) {
    console.error('❌ NEXT_PUBLIC_SUPABASE_URL: Has quotes (remove quotes!)');
    hasQuotes = true;
  } else if (supabaseUrl === '') {
    console.error('❌ NEXT_PUBLIC_SUPABASE_URL: Empty value');
  } else if (!supabaseUrl.startsWith('https://')) {
    console.warn('⚠️  NEXT_PUBLIC_SUPABASE_URL: Does not start with https://');
    console.log(`   Value: ${supabaseUrl.substring(0, 50)}...`);
  } else {
    console.log('✅ NEXT_PUBLIC_SUPABASE_URL: Set correctly');
    console.log(`   Value: ${supabaseUrl.substring(0, 50)}...`);
  }
}

// Check Publishable Key
if (!publishableKey) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: NOT SET');
} else {
  if (publishableKey.startsWith('"') || publishableKey.endsWith('"')) {
    console.error('❌ NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: Has quotes (remove quotes!)');
    hasQuotes = true;
  } else if (publishableKey === '') {
    console.error('❌ NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: Empty value');
  } else if (!publishableKey.startsWith('sb_publishable_')) {
    console.error('❌ NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: Does not start with "sb_publishable_"');
    console.error('   Get the publishable key from Supabase Dashboard → Settings → API Keys');
    console.log(`   Value: ${publishableKey.substring(0, 30)}...`);
  } else {
    console.log('✅ NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: Set correctly');
    console.log(`   Value: ${publishableKey.substring(0, 30)}...`);
    console.log(`   Length: ${publishableKey.length} characters`);
  }
}

console.log('─'.repeat(50));

// Summary
if (!supabaseUrl || !publishableKey) {
  console.error('\n❌ Missing required environment variables!');
  console.error('\n📝 To fix:');
  console.error('1. Create or edit .env.local in the project root');
  console.error('2. Add these lines (without quotes):');
  console.error('   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co');
  console.error('   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key_here');
  console.error('3. Get the publishable key from Supabase Dashboard → Settings → API Keys');
  console.error('4. Restart your dev server (npm run dev)');
  process.exit(1);
}

if (hasQuotes) {
  console.error('\n❌ Environment variables contain quotes!');
  console.error('\n📝 To fix:');
  console.error('1. Open .env.local');
  console.error('2. Remove quotes around the values');
  console.error('3. Restart your dev server');
  process.exit(1);
}

console.log('\n✅ All environment variables are set correctly!');
console.log('\n💡 If you still see "Invalid API key" error:');
console.log('   1. Make sure you restarted the dev server after setting env vars');
console.log('   2. Verify the values match your Supabase project');
console.log('   3. Check Supabase Dashboard → Settings → API → Publishable and secret API keys');
console.log('   4. Make sure you\'re using the PUBLISHABLE key (sb_publishable_*), not service role key');

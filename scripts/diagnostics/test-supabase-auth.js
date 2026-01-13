#!/usr/bin/env node
/**
 * Test Supabase Auth Endpoint
 * Run: node scripts/diagnostics/test-supabase-auth.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Load .env.local
const envPath = path.join(__dirname, '../../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...valParts] = line.split('=');
    const val = valParts.join('=').trim();
    if (key && !key.startsWith('#') && val) {
      process.env[key.trim()] = val;
    }
  });
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('\n🔍 Supabase Auth Endpoint Test\n');
console.log('='.repeat(70));

// Check env vars
if (!SUPABASE_URL || !ANON_KEY) {
  console.error('❌ Missing env vars:');
  console.error(`   NEXT_PUBLIC_SUPABASE_URL: ${SUPABASE_URL ? '✅' : '❌'}`);
  console.error(`   NEXT_PUBLIC_SUPABASE_ANON_KEY: ${ANON_KEY ? '✅' : '❌'}`);
  process.exit(1);
}

console.log(`✅ SUPABASE_URL: ${SUPABASE_URL}`);
console.log(`✅ ANON_KEY loaded (length: ${ANON_KEY.length})`);

// Decode JWT to check expiry
const parts = ANON_KEY.split('.');
if (parts.length === 3) {
  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    console.log(`✅ Key role: ${payload.role}`);
    console.log(`✅ Key expires: ${new Date(payload.exp * 1000).toISOString()}`);

    if (new Date(payload.exp * 1000) < new Date()) {
      console.error('❌ KEY IS EXPIRED!');
      process.exit(1);
    }
  } catch (e) {
    console.error('❌ Could not decode key:', e.message);
  }
}

console.log('='.repeat(70));
console.log('\n📤 Testing /auth/v1/token endpoint...\n');

// Test the token endpoint (should fail with invalid credentials, but 401 means auth works)
const testUrl = new URL(SUPABASE_URL);
testUrl.pathname = '/auth/v1/token';
testUrl.searchParams.set('grant_type', 'password');

const postData = JSON.stringify({
  email: 'test@example.com',
  password: 'wrongpassword123'
});

const options = {
  hostname: testUrl.hostname,
  path: testUrl.pathname + testUrl.search,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
    'apikey': ANON_KEY,
  }
};

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log(`📊 Response Status: ${res.statusCode}`);
    console.log(`📋 Response Headers:`, JSON.stringify(res.headers, null, 2));
    console.log(`📝 Response Body:\n${data}\n`);

    console.log('='.repeat(70));

    if (res.statusCode === 200) {
      console.log('❌ Got 200 - unexpected! Should be 400 or 401 with wrong credentials');
      process.exit(1);
    } else if (res.statusCode === 400) {
      console.log('✅ Got 400 - invalid credentials (expected)');
      console.log('✅ This means Supabase auth is working!');
      process.exit(0);
    } else if (res.statusCode === 401) {
      const body = JSON.parse(data);
      if (body.error === 'invalid_grant') {
        console.log('✅ Got 401 - invalid_grant (expected for wrong password)');
        console.log('✅ This means Supabase auth is working!');
        process.exit(0);
      } else {
        console.error('❌ Got 401 but unexpected error:', body);
        process.exit(1);
      }
    } else {
      console.error(`❌ Unexpected status code: ${res.statusCode}`);
      console.error(`📝 Error: ${data}`);
      process.exit(1);
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Request failed:', e.message);
  process.exit(1);
});

req.write(postData);
req.end();

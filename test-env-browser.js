// Test script to verify NEXT_PUBLIC variables are in .env.local
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');

const lines = envContent.split('\n');
const publicVars = lines.filter(line => line.startsWith('NEXT_PUBLIC_'));

console.log('📋 NEXT_PUBLIC variables in .env.local:\n');
publicVars.forEach(line => {
  const [key, ...valueParts] = line.split('=');
  const value = valueParts.join('=');
  const masked = value.substring(0, 40) + (value.length > 40 ? '...' : '');
  console.log(`  ${key}=${masked}`);

  // Check for common issues
  if (value.startsWith('"') || value.startsWith("'")) {
    console.log(`    ⚠️  WARNING: Value starts with quote!`);
  }
  if (value.includes(' ')) {
    console.log(`    ⚠️  WARNING: Value contains spaces!`);
  }
});

console.log('\n✅ All NEXT_PUBLIC variables should be injected into browser at build time');
console.log('   Make sure to restart dev server after changing .env.local!');

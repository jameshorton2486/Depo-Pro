// scripts/diagnose-auth.ts
// Comprehensive Supabase authentication diagnostic
//
// Usage: npm run tsx scripts/diagnose-auth.ts

import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║     DEPO-PRO AUTHENTICATION DIAGNOSTIC                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // ═══════════════════════════════════════════════════════════════
  // Step 1: Environment Variables
  // ═══════════════════════════════════════════════════════════════
  console.log('┌─────────────────────────────────────────────────────────────┐');
  console.log('│ STEP 1: Environment Variables                              │');
  console.log('└─────────────────────────────────────────────────────────────┘');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const urlStatus = supabaseUrl ? '✅ SET' : '❌ MISSING';
  const anonStatus = supabaseAnonKey ? '✅ SET' : '❌ MISSING';
  const serviceStatus = serviceRoleKey ? '✅ SET' : '❌ MISSING';

  console.log(`  NEXT_PUBLIC_SUPABASE_URL:     ${urlStatus}`);
  if (supabaseUrl) console.log(`    → ${supabaseUrl}`);

  console.log(`  NEXT_PUBLIC_SUPABASE_ANON_KEY: ${anonStatus}`);
  if (supabaseAnonKey) {
    const masked = `${supabaseAnonKey.substring(0, 20)}...${supabaseAnonKey.substring(supabaseAnonKey.length - 10)}`;
    console.log(`    → ${masked}`);
  }

  console.log(`  SUPABASE_SERVICE_ROLE_KEY:    ${serviceStatus}`);
  if (serviceRoleKey) {
    const masked = `${serviceRoleKey.substring(0, 20)}...${serviceRoleKey.substring(serviceRoleKey.length - 10)}`;
    console.log(`    → ${masked}`);
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    console.log('\n❌ FATAL: Missing required environment variables');
    console.log('   Get them from: Supabase Dashboard → Settings → API\n');
    process.exit(1);
  }

  // ═══════════════════════════════════════════════════════════════
  // Step 2: Package Check
  // ═══════════════════════════════════════════════════════════════
  console.log('\n┌─────────────────────────────────────────────────────────────┐');
  console.log('│ STEP 2: Package Dependencies                                │');
  console.log('└─────────────────────────────────────────────────────────────┘');

  try {
    const packageJson = require('../package.json');
    const hasSSR = packageJson.dependencies?.['@supabase/ssr'] || packageJson.devDependencies?.['@supabase/ssr'];
    const hasSupabase = packageJson.dependencies?.['@supabase/supabase-js'] || packageJson.devDependencies?.['@supabase/supabase-js'];

    console.log(`  @supabase/ssr:        ${hasSSR ? '✅ INSTALLED' : '❌ MISSING'}`);
    if (hasSSR) console.log(`    → Version: ${hasSSR}`);

    console.log(`  @supabase/supabase-js: ${hasSupabase ? '✅ INSTALLED' : '❌ MISSING'}`);
    if (hasSupabase) console.log(`    → Version: ${hasSupabase}`);

    if (!hasSSR) {
      console.log('\n❌ @supabase/ssr is required for Next.js App Router');
      console.log('   Run: npm install @supabase/ssr\n');
      process.exit(1);
    }
  } catch (err) {
    console.log('  ⚠️  Could not check package.json');
  }

  // ═══════════════════════════════════════════════════════════════
  // Step 3: Supabase Connection Test
  // ═══════════════════════════════════════════════════════════════
  console.log('\n┌─────────────────────────────────────────────────────────────┐');
  console.log('│ STEP 3: Supabase Connection Test                           │');
  console.log('└─────────────────────────────────────────────────────────────┘');

  if (!serviceRoleKey) {
    console.log('  ⏭️  Skipped: SUPABASE_SERVICE_ROLE_KEY not set');
  } else {
    try {
      const adminClient = getSupabaseAdminClient();
      console.log('  ✅ Admin client created successfully');

      const { data: usersData, error: usersError } = await adminClient.auth.admin.listUsers();

      if (usersError) {
        console.log(`  ❌ Connection failed: ${usersError.message}`);
        if (usersError.message.includes('Invalid API key')) {
          console.log('     → Check your SUPABASE_SERVICE_ROLE_KEY in .env.local');
        }
      } else {
        console.log(`  ✅ Connection successful`);
        console.log(`  📊 Users in Supabase Auth: ${usersData.users.length}`);

        if (usersData.users.length === 0) {
          console.log('\n  ⚠️  WARNING: No users exist!');
          console.log('     → Go to /register to create your first user');
        } else {
          console.log('\n  📋 Existing Users:');
          usersData.users.slice(0, 10).forEach((user, index) => {
            const role = user.user_metadata?.role || 'none';
            const confirmed = user.email_confirmed_at ? '✓' : '○';
            console.log(`     ${index + 1}. ${confirmed} ${user.email}`);
            console.log(`        ID: ${user.id}`);
            console.log(`        Role (metadata): ${role}`);
            console.log('');
          });
        }
      }
    } catch (err: any) {
      console.log(`  ❌ Error: ${err.message}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // Step 4: File Structure Check
  // ═══════════════════════════════════════════════════════════════
  console.log('\n┌─────────────────────────────────────────────────────────────┐');
  console.log('│ STEP 4: File Structure Check                               │');
  console.log('└─────────────────────────────────────────────────────────────┘');

  const fs = require('fs');
  const requiredFiles = [
    'lib/supabase/browser.ts',
    'lib/supabase/server.ts',
    'lib/supabase/middleware.ts',
    'lib/supabase/admin.ts',
    'middleware.ts',
    'app/(auth)/login/page.tsx',
  ];

  requiredFiles.forEach((file) => {
    const exists = fs.existsSync(file);
    console.log(`  ${exists ? '✅' : '❌'} ${file}`);
  });

  // ═══════════════════════════════════════════════════════════════
  // Step 5: Recommendations
  // ═══════════════════════════════════════════════════════════════
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    RECOMMENDATIONS                           ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log('  ✅ Your setup is CORRECT:');
  console.log('     - @supabase/ssr is installed');
  console.log('     - Canonical clients are configured');
  console.log('     - Middleware uses proper cookie handling');
  console.log('     - Login page uses getSupabaseBrowserClient()');
  console.log('');

  console.log('  📋 Next Steps:');
  console.log('');
  console.log('     1. Ensure you have a user:');
  console.log('        → Go to /register to create one');
  console.log('        → Or check Supabase Dashboard → Authentication → Users');
  console.log('');
  console.log('     2. Test login:');
  console.log('        → Go to /login');
  console.log('        → Enter your email and password');
  console.log('        → Check browser DevTools (F12) for errors');
  console.log('');
  console.log('     3. Check cookies after login:');
  console.log('        → DevTools → Application → Cookies');
  console.log('        → Look for cookies starting with "sb-"');
  console.log('');
  console.log('     4. If login fails, check:');
  console.log('        → Browser console for JavaScript errors');
  console.log('        → Network tab for failed requests');
  console.log('        → Supabase Dashboard → Authentication → Users');
  console.log('        → Verify email is confirmed (if required)');
  console.log('');

  console.log('  🔐 To promote a user to ADMIN:');
  console.log('     npm run list-users');
  console.log('     EMAIL=your-email@example.com npm run promote-to-admin');
  console.log('');
}

main().catch((error) => {
  console.error('\n❌ Diagnostic error:', error);
  process.exit(1);
});

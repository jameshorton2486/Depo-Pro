/**
 * scripts/create-test-users.ts
 *
 * Creates two test users in separate organizations for CI org-isolation testing.
 * Idempotent — safe to run multiple times.
 *
 * Usage:
 *   npx tsx scripts/create-test-users.ts
 *
 * Requires (in .env.local or environment):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Required env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const TEST_CONFIG = [
  {
    email: 'ci-org-a@depo-pro.test',
    password: 'CITest-OrgA-2026!',
    role: 'ADMIN',
    firmName: 'CI Test Firm Alpha',
  },
  {
    email: 'ci-org-b@depo-pro.test',
    password: 'CITest-OrgB-2026!',
    role: 'ADMIN',
    firmName: 'CI Test Firm Beta',
  },
];

async function ensureFirm(name: string): Promise<string> {
  const { data: existing } = await supabase
    .from('firms')
    .select('id')
    .eq('name', name)
    .maybeSingle();

  if (existing) {
    console.log(`  firm exists: ${existing.id}`);
    return existing.id;
  }

  const { data, error } = await supabase
    .from('firms')
    .insert({ name, is_active: true })
    .select('id')
    .single();

  if (error) throw new Error(`Failed to create firm "${name}": ${error.message}`);
  console.log(`  firm created: ${data.id}`);
  return data.id;
}

async function ensureUser(
  email: string,
  password: string,
  role: string,
  firmId: string
): Promise<string> {
  // Check if user already exists
  const { data: users } = await supabase.auth.admin.listUsers();
  const existing = users?.users?.find((u) => u.email === email);

  let userId: string;

  if (existing) {
    console.log(`  user exists: ${existing.id}`);
    userId = existing.id;
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role, firm_id: firmId },
    });
    if (error) throw new Error(`Failed to create user ${email}: ${error.message}`);
    userId = data.user.id;
    console.log(`  user created: ${userId}`);
  }

  // Upsert profile
  const { error: profileError } = await supabase.from('profiles').upsert(
    {
      id: userId,
      email,
      role,
      firm_id: firmId,
      full_name: `CI Test User (${role})`,
      is_active: true,
    },
    { onConflict: 'id' }
  );

  if (profileError) {
    console.warn(`  profile upsert warning: ${profileError.message}`);
  }

  return userId;
}

async function main() {
  console.log('=== Depo-Pro CI Test User Setup ===\n');
  console.log(`Supabase URL: ${SUPABASE_URL}\n`);

  const results: Array<{ email: string; userId: string; firmId: string }> = [];

  for (const cfg of TEST_CONFIG) {
    console.log(`Setting up ${cfg.email}...`);
    const firmId = await ensureFirm(cfg.firmName);
    const userId = await ensureUser(cfg.email, cfg.password, cfg.role, firmId);
    results.push({ email: cfg.email, userId, firmId });
    console.log();
  }

  console.log('=== Results ===');
  for (const r of results) {
    console.log(`${r.email}:`);
    console.log(`  User ID:  ${r.userId}`);
    console.log(`  Firm ID:  ${r.firmId}`);
  }

  console.log('\n=== GitHub Secret Commands ===');
  console.log('Run these to set the required CI secrets:\n');
  console.log(
    `gh secret set TEST_USER_A --body "${results[0].userId}" --repo jameshorton2486/depo-pro`
  );
  console.log(
    `gh secret set TEST_USER_B --body "${results[1].userId}" --repo jameshorton2486/depo-pro`
  );
  console.log('\nNote: TEST_USER_A and TEST_USER_B are in DIFFERENT firms — this is required');
  console.log('for the org-isolation test suite to validate cross-tenant data isolation.\n');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

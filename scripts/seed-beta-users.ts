/**
 * Beta User Seed Script
 * Run with: npx ts-node scripts/seed-beta-users.ts
 *
 * Creates test accounts for beta onboarding.
 * Safe to run multiple times — uses upsert to avoid duplicates.
 *
 * Before running:
 *   1. Fill in real email addresses below
 *   2. Set BETA_FIRM_ID to the firm_id of James's firm
 *      Find it: SELECT id FROM firms WHERE name ILIKE '%E2E%' in the Supabase SQL editor
 *   3. Ensure SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL are set in your env
 *
 * DO NOT commit this file with real email addresses filled in.
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const firmId = process.env.BETA_FIRM_ID

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

if (!firmId) {
  console.error('Missing BETA_FIRM_ID. Set it to the firm_id of the beta firm.')
  console.error('Find it: SELECT id FROM firms WHERE name ILIKE \'%E2E%\' in the Supabase SQL editor.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

const BETA_USERS = [
  {
    email: 'reporter1@beta-test.depo-pro.com',  // Replace with real email before running
    password: 'BetaReporter1!',                   // Replace with secure password
    role: 'COURT_REPORTER',
    full_name: 'Beta Reporter 1',
  },
  {
    email: 'reporter2@beta-test.depo-pro.com',
    password: 'BetaReporter2!',
    role: 'COURT_REPORTER',
    full_name: 'Beta Reporter 2',
  },
  {
    email: 'scopist1@beta-test.depo-pro.com',
    password: 'BetaScopist1!',
    role: 'SCOPIST',
    full_name: 'Beta Scopist 1',
  },
  {
    email: 'scopist2@beta-test.depo-pro.com',
    password: 'BetaScopist2!',
    role: 'SCOPIST',
    full_name: 'Beta Scopist 2',
  },
  {
    email: 'attorney1@beta-test.depo-pro.com',
    password: 'BetaAttorney1!',
    role: 'ATTORNEY',
    full_name: 'Beta Attorney 1',
  },
]

async function seedBetaUsers() {
  console.log('Creating beta user accounts...\n')

  for (const user of BETA_USERS) {
    // 1. Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,  // Skip email confirmation for test accounts
    })

    let userId = authData?.user?.id

    if (authError) {
      if (authError.message === 'User already registered') {
        // Look up existing user
        const { data: listData } = await supabase.auth.admin.listUsers()
        const existing = listData?.users?.find((u) => u.email === user.email)
        if (existing) {
          userId = existing.id
          console.log(`  ~ ${user.email} already exists (${userId})`)
        } else {
          console.error(`  x Could not find or create user: ${user.email}`)
          continue
        }
      } else {
        console.error(`  x Failed to create auth user for ${user.email}:`, authError.message)
        continue
      }
    }

    if (!userId) {
      console.error(`  x No userId resolved for ${user.email}`)
      continue
    }

    // 2. Upsert the profile record
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        firm_id: firmId,
      }, { onConflict: 'id' })

    if (profileError) {
      console.error(`  x Failed to upsert profile for ${user.email}:`, profileError.message)
    } else {
      console.log(`  + ${user.role.padEnd(16)} ${user.email}`)
    }
  }

  console.log('\nDone. Verify accounts at: https://supabase.com/dashboard/project/ildhcfspbmhuemzgvzyx/auth/users')
}

seedBetaUsers().catch(console.error)

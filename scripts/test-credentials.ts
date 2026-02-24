/**
 * scripts/test-credentials.ts
 *
 * Validates Deepgram and Supabase API keys from .env.local.
 * Run: npx tsx scripts/test-credentials.ts
 */

import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { createClient as createDeepgram } from '@deepgram/sdk';

dotenv.config({ path: '.env.local' });

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function testDeepgram() {
  console.log('--- Testing Deepgram ---');
  if (!DEEPGRAM_API_KEY) {
    console.error('❌ Deepgram: DEEPGRAM_API_KEY not set in .env.local');
    return;
  }
  try {
    const deepgram = createDeepgram(DEEPGRAM_API_KEY);
    const { result, error } = await deepgram.manage.getProjects();
    if (error) throw error;
    console.log('✅ Deepgram: Key is valid. Projects found:', result.projects?.length ?? 0);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('❌ Deepgram: Auth failed.', msg);
  }
}

async function testSupabasePublishable() {
  console.log('\n--- Testing Supabase (Publishable Key) ---');
  if (!SUPABASE_URL || !PUBLISHABLE_KEY) {
    console.error('❌ Supabase: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY not set');
    return;
  }
  try {
    const supabase = createClient(SUPABASE_URL, PUBLISHABLE_KEY);
    const { error } = await supabase.from('profiles').select('id').limit(1);
    if (error?.code === 'PGRST301') throw new Error('Invalid API Key');
    console.log('✅ Supabase Publishable: Connection successful.');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('❌ Supabase Publishable: Auth failed.', msg);
  }
}

async function testSupabaseServiceRole() {
  console.log('\n--- Testing Supabase (Service Role) ---');
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('❌ Supabase: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set');
    return;
  }
  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { error } = await supabase.auth.admin.listUsers();
    if (error) throw error;
    console.log('✅ Supabase Service Role: Admin access verified.');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('❌ Supabase Service Role: Auth failed.', msg);
  }
}

async function runAllTests() {
  console.log('=== Depo-Pro Credential Test ===\n');
  await testDeepgram();
  await testSupabasePublishable();
  await testSupabaseServiceRole();
  console.log('\nDone.\n');
}

runAllTests();

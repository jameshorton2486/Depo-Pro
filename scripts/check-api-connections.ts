#!/usr/bin/env npx tsx
/**
 * scripts/check-api-connections.ts
 *
 * Validates all API connections before starting the app.
 * Run: npm run check:apis
 *
 * Loads .env.local first (Next.js convention), then .env.
 * Exits with code 1 if any REQUIRED connection fails.
 * Optional connections (Stripe, Redis, OpenAI) warn but don't fail.
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { ANTHROPIC_MODELS } from '../lib/config/anthropic-models';
import * as fs from 'fs';

// Warn if keys are set as system env vars — they override .env.local
const systemKeys = ['ANTHROPIC_API_KEY', 'DEEPGRAM_API_KEY', 'OPENAI_API_KEY'];
for (const key of systemKeys) {
  if (process.env[key]) {
    console.warn(
      `WARNING: ${key} is set as a system environment variable and will override .env.local. Clear with: [System.Environment]::SetEnvironmentVariable("${key}", $null, "User")`
    );
  }
}

// Load env files
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

function cleanKey(val: string | undefined): string {
  if (!val) return '';
  return val.trim().replace(/^["']|["']$/g, '');
}

const SUPABASE_URL = cleanKey(process.env.NEXT_PUBLIC_SUPABASE_URL);
const SERVICE_ROLE_KEY = cleanKey(process.env.SUPABASE_SERVICE_ROLE_KEY);
const ANTHROPIC_API_KEY = cleanKey(process.env.ANTHROPIC_API_KEY);
const DEEPGRAM_API_KEY = cleanKey(process.env.DEEPGRAM_API_KEY);
const RESEND_API_KEY = cleanKey(process.env.RESEND_API_KEY);
const OPENAI_API_KEY = cleanKey(process.env.OPENAI_API_KEY);
const STRIPE_SECRET_KEY = cleanKey(process.env.STRIPE_SECRET_KEY);
const REDIS_URL = cleanKey(process.env.REDIS_URL);

const TIMEOUT_MS = 10_000;

interface CheckResult {
  ok: boolean;
  msg: string;
  required: boolean;
}

async function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`${label} timed out after ${TIMEOUT_MS}ms`)), TIMEOUT_MS)
  );
  return Promise.race([promise, timeout]);
}

// ── REQUIRED CHECKS ────────────────────────────────────────────

async function checkSupabase(): Promise<CheckResult> {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return { ok: false, msg: 'Missing SUPABASE_URL or SERVICE_ROLE_KEY', required: true };
  }
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const result = await withTimeout(
      Promise.resolve(supabase.from('firms').select('id').limit(1)),
      'Supabase'
    );
    const { error } = result;
    if (error) return { ok: false, msg: `Supabase: ${error.message}`, required: true };
    return { ok: true, msg: 'Connected', required: true };
  } catch (err) {
    return { ok: false, msg: err instanceof Error ? err.message : 'Unknown error', required: true };
  }
}

async function checkAnthropic(): Promise<CheckResult> {
  if (!ANTHROPIC_API_KEY) {
    return { ok: false, msg: 'Missing ANTHROPIC_API_KEY (required for document intake)', required: true };
  }
  if (!ANTHROPIC_API_KEY.startsWith('sk-ant-')) {
    return { ok: false, msg: 'ANTHROPIC_API_KEY should start with sk-ant-', required: true };
  }
  try {
    const response = await withTimeout(
      fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: ANTHROPIC_MODELS.HAIKU,
          max_tokens: 1,
          messages: [{ role: 'user', content: 'ok' }],
        }),
      }),
      'Anthropic'
    );
    if (!response.ok) {
      const text = await response.text();
      return { ok: false, msg: `Anthropic ${response.status}: ${text.slice(0, 100)}`, required: true };
    }
    return { ok: true, msg: 'Connected', required: true };
  } catch (err) {
    return { ok: false, msg: err instanceof Error ? err.message : 'Unknown error', required: true };
  }
}

async function checkDeepgram(): Promise<CheckResult> {
  if (!DEEPGRAM_API_KEY) {
    return { ok: false, msg: 'Missing DEEPGRAM_API_KEY (required for transcription)', required: true };
  }
  try {
    const response = await withTimeout(
      fetch('https://api.deepgram.com/v1/projects', {
        method: 'GET',
        headers: { Authorization: `Token ${DEEPGRAM_API_KEY}` },
      }),
      'Deepgram'
    );
    if (!response.ok) {
      return { ok: false, msg: `Deepgram ${response.status}`, required: true };
    }
    return { ok: true, msg: 'Connected', required: true };
  } catch (err) {
    return { ok: false, msg: err instanceof Error ? err.message : 'Unknown error', required: true };
  }
}

async function checkResend(): Promise<CheckResult> {
  if (!RESEND_API_KEY) {
    return { ok: false, msg: 'Missing RESEND_API_KEY (required for email notifications)', required: true };
  }
  try {
    const response = await withTimeout(
      fetch('https://api.resend.com/domains', {
        method: 'GET',
        headers: { Authorization: `Bearer ${RESEND_API_KEY}` },
      }),
      'Resend'
    );
    if (!response.ok) {
      return { ok: false, msg: `Resend ${response.status}`, required: true };
    }
    return { ok: true, msg: 'Connected', required: true };
  } catch (err) {
    return { ok: false, msg: err instanceof Error ? err.message : 'Unknown error', required: true };
  }
}

// ── OPTIONAL CHECKS ────────────────────────────────────────────

async function checkOpenAI(): Promise<CheckResult> {
  if (!OPENAI_API_KEY) {
    return { ok: false, msg: 'Not configured (optional)', required: false };
  }
  try {
    const response = await withTimeout(
      fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
      }),
      'OpenAI'
    );
    if (!response.ok) {
      return { ok: false, msg: `OpenAI ${response.status}`, required: false };
    }
    return { ok: true, msg: 'Connected', required: false };
  } catch (err) {
    return { ok: false, msg: err instanceof Error ? err.message : 'Unknown error', required: false };
  }
}

async function checkStripe(): Promise<CheckResult> {
  if (!STRIPE_SECRET_KEY) {
    return { ok: false, msg: 'Not configured (optional until billing enabled)', required: false };
  }
  try {
    const response = await withTimeout(
      fetch('https://api.stripe.com/v1/balance', {
        method: 'GET',
        headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` },
      }),
      'Stripe'
    );
    if (!response.ok) {
      return { ok: false, msg: `Stripe ${response.status}`, required: false };
    }
    return { ok: true, msg: 'Connected', required: false };
  } catch (err) {
    return { ok: false, msg: err instanceof Error ? err.message : 'Unknown error', required: false };
  }
}

function checkRedis(): CheckResult {
  if (!REDIS_URL) {
    return { ok: false, msg: 'Not configured (USE_QUEUE=false, runs sync)', required: false };
  }
  return { ok: true, msg: `Configured: ${REDIS_URL.split('@')[1] || REDIS_URL.slice(0, 30)}...`, required: false };
}

function checkFilesystem(): CheckResult {
  const issues: string[] = [];
  for (const dir of ['uploads', 'tests/reports', 'tests/.auth']) {
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch {
        issues.push(dir);
      }
    }
  }
  if (issues.length > 0) {
    return { ok: false, msg: `Cannot create: ${issues.join(', ')}`, required: false };
  }
  return { ok: true, msg: 'Directories OK', required: false };
}

// ── MAIN ───────────────────────────────────────────────────────

async function main() {
  console.log('\n  Depo-Pro API Connection Check\n');

  const [supabase, anthropic, deepgram, resend, openai, stripe] = await Promise.all([
    checkSupabase(),
    checkAnthropic(),
    checkDeepgram(),
    checkResend(),
    checkOpenAI(),
    checkStripe(),
  ]);

  const redis = checkRedis();
  const filesystem = checkFilesystem();

  const line = '-'.repeat(60);
  let requiredFailed = 0;
  let optionalFailed = 0;

  console.log(line);
  console.log('  REQUIRED SERVICES');
  console.log(line);

  for (const [name, result] of [
    ['Supabase   ', supabase],
    ['Anthropic  ', anthropic],
    ['Deepgram   ', deepgram],
    ['Resend     ', resend],
  ] as const) {
    const icon = result.ok ? '[PASS]' : '[FAIL]';
    console.log(`  ${icon} ${name} ${result.msg}`);
    if (!result.ok) requiredFailed++;
  }

  console.log('');
  console.log(line);
  console.log('  OPTIONAL SERVICES');
  console.log(line);

  for (const [name, result] of [
    ['OpenAI     ', openai],
    ['Stripe     ', stripe],
    ['Redis      ', redis],
    ['Filesystem ', filesystem],
  ] as const) {
    const icon = result.ok ? '[PASS]' : '[WARN]';
    console.log(`  ${icon} ${name} ${result.msg}`);
    if (!result.ok) optionalFailed++;
  }

  console.log(line);

  if (requiredFailed > 0) {
    console.error(`\n  ${requiredFailed} required connection(s) failed.`);
    console.error('  Fix these before running: npm run dev\n');
    process.exit(1);
  }

  if (optionalFailed > 0) {
    console.log(`\n  All required services OK. ${optionalFailed} optional service(s) not configured.`);
  } else {
    console.log('\n  All connections OK.');
  }
  console.log('  Safe to run: npm run dev\n');
}

main();

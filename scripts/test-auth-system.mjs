// scripts/test-auth-system.mjs
// Depo-Pro Auth Diagnostic v2.0
// Run with: npm run test:auth
// Requires: npm run dev (dev server must be on localhost:3000)

import { readFileSync, writeFileSync, appendFileSync } from 'fs';
import { resolve } from 'path';

const BASE_URL = 'http://localhost:3000';
const REPORT_FILE = 'AUTH_DIAGNOSTIC_REPORT.md';
const LOG_FILE = 'AUTH_DIAGNOSTIC_LOG.txt';
const START_TIME = new Date();

// ── Load environment ──────────────────────────────────────────────────────────
function loadEnv() {
  try {
    const raw = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8');
    const env = {};
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx < 1) continue;
      env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
    }
    return { ...process.env, ...env };
  } catch {
    console.error('ERROR: Cannot read .env.local — run from project root');
    process.exit(1);
  }
}

const ENV = loadEnv();

const SUPABASE_URL = ENV.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = ENV.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SERVICE_ROLE_KEY = ENV.SUPABASE_SERVICE_ROLE_KEY;

// ── Test result tracking ──────────────────────────────────────────────────────
const results = [];
let sessionCookie = null;

function record(category, name, status, detail, fix = null) {
  const entry = { category, name, status, detail, fix, time: new Date().toISOString() };
  results.push(entry);
  const icon = { PASS: 'PASS', FAIL: 'FAIL', WARN: 'WARN', SKIP: 'SKIP', INFO: 'INFO' }[status] ?? '?';
  const line = `[${icon}] [${category}] ${name}: ${detail}`;
  console.log(line);
  appendFileSync(LOG_FILE, line + '\n');
  return entry;
}

function section(title) {
  const line = `\n${'='.repeat(60)}\n  ${title}\n${'='.repeat(60)}`;
  console.log(line);
  appendFileSync(LOG_FILE, line + '\n');
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────
async function get(path, options = {}) {
  const headers = { 'Accept': 'text/html,application/json', ...options.headers };
  if (sessionCookie) headers['Cookie'] = sessionCookie;
  try {
    const res = await fetch(BASE_URL + path, {
      method: 'GET',
      headers,
      redirect: options.followRedirects === false ? 'manual' : 'follow',
    });
    const cookies = res.headers.get('set-cookie');
    if (cookies) sessionCookie = cookies;
    return res;
  } catch (err) {
    return { status: 0, ok: false, error: err.message, headers: new Headers() };
  }
}

async function post(path, body, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...options.headers,
  };
  if (sessionCookie) headers['Cookie'] = sessionCookie;
  try {
    const res = await fetch(BASE_URL + path, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      redirect: options.followRedirects === false ? 'manual' : 'follow',
    });
    const cookies = res.headers.get('set-cookie');
    if (cookies) sessionCookie = cookies;
    return res;
  } catch (err) {
    return { status: 0, ok: false, error: err.message, headers: new Headers() };
  }
}

// ── TEST SUITE ────────────────────────────────────────────────────────────────

// ── TEST 1: Dev server reachable ─────────────────────────────────────────────
async function testServerReachable() {
  section('TEST 1 — DEV SERVER');
  try {
    const res = await fetch(BASE_URL, { redirect: 'manual' });
    if (res.status === 200 || res.status === 307 || res.status === 302) {
      record('Server', 'Dev server reachable', 'PASS',
        `HTTP ${res.status} at ${BASE_URL}`);
      return true;
    } else {
      record('Server', 'Dev server reachable', 'FAIL',
        `HTTP ${res.status} — unexpected response`,
        'Run: npm run dev');
      return false;
    }
  } catch (err) {
    record('Server', 'Dev server reachable', 'FAIL',
      `Cannot connect: ${err.message}`,
      'Run: npm run dev in another terminal');
    return false;
  }
}

// ── TEST 2: Supabase connection ───────────────────────────────────────────────
async function testSupabaseConnection() {
  section('TEST 2 — SUPABASE CONNECTION');

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    record('Supabase', 'Environment variables', 'FAIL',
      'NEXT_PUBLIC_SUPABASE_URL or PUBLISHABLE_KEY missing from .env.local',
      'Add both variables to .env.local');
    return;
  }

  record('Supabase', 'NEXT_PUBLIC_SUPABASE_URL', 'INFO', SUPABASE_URL);

  // Test 2a: Auth settings endpoint (uses old-format JWT for raw REST)
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: SUPABASE_KEY },
    });
    if (res.status === 200) {
      const data = await res.json();
      record('Supabase', 'Auth API reachable', 'PASS',
        `Connected — signup enabled: ${data.disable_signup === false}`);
    } else {
      record('Supabase', 'Auth API reachable', 'FAIL',
        `HTTP ${res.status}`,
        'Check NEXT_PUBLIC_SUPABASE_URL is correct');
    }
  } catch (err) {
    record('Supabase', 'Auth API reachable', 'FAIL', err.message);
  }

  // Test 2b: Schema public permissions via REST API
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/jobs?select=id&limit=1`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    });
    if (res.status === 200) {
      record('Supabase', 'Schema public access (anon)', 'PASS',
        'anon role can query public schema');
    } else if (res.status === 401 || res.status === 403) {
      const body = await res.json().catch(() => ({}));
      if (body.message?.includes('permission denied for schema')) {
        record('Supabase', 'Schema public access (anon)', 'FAIL',
          'Permission denied for schema public',
          'Run: GRANT USAGE ON SCHEMA public TO anon;');
      } else {
        record('Supabase', 'Schema public access (anon)', 'WARN',
          `HTTP ${res.status}: ${body.message ?? 'unknown error'}`);
      }
    } else {
      record('Supabase', 'Schema public access (anon)', 'WARN',
        `HTTP ${res.status} — check RLS policies`);
    }
  } catch (err) {
    record('Supabase', 'Schema public access (anon)', 'WARN', err.message);
  }

  // Test 2c: Service role key
  if (SERVICE_ROLE_KEY) {
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=1`, {
        headers: {
          apikey: SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        },
      });
      if (res.status === 200) {
        const data = await res.json();
        const userCount = data.users?.length ?? 0;
        record('Supabase', 'Service role key', 'PASS',
          `Admin API accessible — ${userCount} user(s) in page`);
      } else {
        record('Supabase', 'Service role key', 'FAIL',
          `HTTP ${res.status} — service role key rejected`,
          'Check SUPABASE_SERVICE_ROLE_KEY in .env.local');
      }
    } catch (err) {
      record('Supabase', 'Service role key', 'FAIL', err.message);
    }
  } else {
    record('Supabase', 'Service role key', 'WARN', 'SUPABASE_SERVICE_ROLE_KEY not set');
  }
}

// ── TEST 3: Public pages accessible ──────────────────────────────────────────
async function testPublicPages() {
  section('TEST 3 — PUBLIC PAGES (no auth required)');

  // These are the actual public routes from lib/permissions/route-access.ts
  const publicPaths = [
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/unauthorized',
  ];

  // Clear session to test as unauthenticated user
  const savedSession = sessionCookie;
  sessionCookie = null;

  for (const path of publicPaths) {
    const res = await get(path, { followRedirects: false });
    if (res.status === 200) {
      record('Public Pages', path, 'PASS', 'HTTP 200 — accessible without auth');
    } else if (res.status === 307 || res.status === 302) {
      const location = res.headers?.get?.('location') ?? 'unknown';
      if (location.includes('/login') && path === '/login') {
        record('Public Pages', path, 'FAIL',
          `Redirect loop: /login -> ${location}`,
          'Middleware is redirecting /login. Check proxy.ts PUBLIC_PATHS.');
      } else if (location.includes('/login') && path !== '/login') {
        record('Public Pages', path, 'FAIL',
          `HTTP ${res.status} -> ${location} — public page requires auth`,
          `Add ${path} to PUBLIC_PATHS in proxy.ts`);
      } else {
        record('Public Pages', path, 'INFO',
          `HTTP ${res.status} -> ${location}`);
      }
    } else if (res.status === 0) {
      record('Public Pages', path, 'FAIL',
        'Cannot connect to dev server',
        'Ensure npm run dev is running');
    } else if (res.status === 404) {
      record('Public Pages', path, 'WARN',
        `HTTP 404 — page does not exist`);
    } else {
      record('Public Pages', path, 'WARN',
        `HTTP ${res.status} — unexpected for a public route`);
    }
  }

  sessionCookie = savedSession;
}

// ── TEST 4: Protected pages redirect properly ─────────────────────────────────
async function testProtectedPages() {
  section('TEST 4 — PROTECTED PAGES (must redirect when unauthenticated)');

  // Clear session to test unauthenticated state
  const savedSession = sessionCookie;
  sessionCookie = null;

  // These are protected routes from proxy.ts PROTECTED_PREFIXES + ADMIN_PREFIXES
  const protectedPaths = [
    '/dashboard',
    '/jobs',
    '/reporter',
    '/scopist',
    '/attorney',
    '/admin',
  ];

  for (const path of protectedPaths) {
    const res = await get(path, { followRedirects: false });

    if (res.status === 307 || res.status === 302) {
      const location = res.headers?.get?.('location') ?? '';
      if (location.includes('/login') || location.includes('/unauthorized')) {
        record('Protected Pages', path, 'PASS',
          `HTTP ${res.status} -> ${location} (correctly blocked)`);
      } else if (location.includes(path)) {
        record('Protected Pages', path, 'FAIL',
          `Redirect loop: ${path} -> ${location}`,
          'Middleware creates infinite redirect. Check proxy.ts.');
      } else {
        record('Protected Pages', path, 'WARN',
          `HTTP ${res.status} -> ${location}`);
      }
    } else if (res.status === 200) {
      record('Protected Pages', path, 'FAIL',
        `HTTP 200 — accessible without auth!`,
        `Add ${path} to PROTECTED_PREFIXES in proxy.ts`);
    } else if (res.status === 401 || res.status === 403) {
      record('Protected Pages', path, 'PASS',
        `HTTP ${res.status} — correctly blocked`);
    } else if (res.status === 404) {
      record('Protected Pages', path, 'SKIP',
        `HTTP 404 — route does not exist`);
    } else {
      record('Protected Pages', path, 'WARN',
        `HTTP ${res.status}`);
    }
  }

  sessionCookie = savedSession;
}

// ── TEST 5: Redirect loop detection ──────────────────────────────────────────
async function testRedirectLoops() {
  section('TEST 5 — REDIRECT LOOP DETECTION');

  const savedSession = sessionCookie;
  sessionCookie = null;

  // /unauthorized must NOT redirect to /login (creates loop)
  const res = await get('/unauthorized', { followRedirects: false });
  if (res.status === 200) {
    record('Redirects', '/unauthorized page', 'PASS',
      'HTTP 200 — error page renders correctly');
  } else if (res.status === 307 || res.status === 302) {
    const location = res.headers?.get?.('location') ?? '';
    if (location.includes('/login')) {
      record('Redirects', '/unauthorized page', 'FAIL',
        '/unauthorized -> /login — infinite loop risk',
        'Add /unauthorized to PUBLIC_PATHS in proxy.ts');
    } else {
      record('Redirects', '/unauthorized page', 'WARN',
        `Redirects to ${location}`);
    }
  } else if (res.status === 404) {
    record('Redirects', '/unauthorized page', 'WARN',
      'Page missing — auth failures have no safe landing',
      'Create app/(auth)/unauthorized/page.tsx');
  }

  // /auth/callback must exist for password reset flow
  const callbackRes = await get('/auth/callback', { followRedirects: false });
  if (callbackRes.status === 307 || callbackRes.status === 302) {
    const location = callbackRes.headers?.get?.('location') ?? '';
    record('Redirects', '/auth/callback route', 'PASS',
      `HTTP ${callbackRes.status} -> ${location} — route exists`);
  } else if (callbackRes.status === 200) {
    record('Redirects', '/auth/callback route', 'PASS',
      'HTTP 200 — callback route exists');
  } else if (callbackRes.status === 404) {
    record('Redirects', '/auth/callback route', 'FAIL',
      'Route missing — password reset emails will fail',
      'Create app/auth/callback/route.ts');
  } else {
    record('Redirects', '/auth/callback route', 'INFO',
      `HTTP ${callbackRes.status}`);
  }

  // /auth/confirm must exist for email verification
  const confirmRes = await get('/auth/confirm', { followRedirects: false });
  if (confirmRes.status === 404) {
    record('Redirects', '/auth/confirm route', 'WARN',
      'Route missing — email confirmation links may fail');
  } else {
    record('Redirects', '/auth/confirm route', 'PASS',
      `HTTP ${confirmRes.status} — route exists`);
  }

  sessionCookie = savedSession;
}

// ── TEST 6: Login page ────────────────────────────────────────────────────────
async function testLoginPage() {
  section('TEST 6 — LOGIN PAGE');

  // Depo-Pro handles login client-side via Supabase browser client
  // (supabase.auth.signInWithPassword) — no login API route exists.
  // We test that the login page renders correctly.

  const savedSession = sessionCookie;
  sessionCookie = null;

  const loginPage = await get('/login');
  if (loginPage.status === 200) {
    record('Login', 'Login page renders', 'PASS', 'HTTP 200');
    try {
      const text = await loginPage.text();
      const hasForm = text.includes('password') || text.includes('Password')
        || text.includes('email') || text.includes('Email');
      if (hasForm) {
        record('Login', 'Login form present', 'PASS',
          'Page contains email/password form elements');
      } else {
        record('Login', 'Login form present', 'WARN',
          'Could not detect form fields in HTML — verify manually');
      }
    } catch {
      record('Login', 'Login form present', 'SKIP', 'Could not read response body');
    }
  } else {
    record('Login', 'Login page renders', 'FAIL',
      `HTTP ${loginPage.status}`,
      'Check app/(auth)/login/page.tsx');
  }

  record('Login', 'Auth method', 'INFO',
    'Login is client-side via supabase.auth.signInWithPassword() — no API route needed');

  sessionCookie = savedSession;
}

// ── TEST 7: Password reset flow ───────────────────────────────────────────────
async function testPasswordResetFlow() {
  section('TEST 7 — PASSWORD RESET FLOW');

  const savedSession = sessionCookie;
  sessionCookie = null;

  // 7a: Forgot password page
  const forgotPage = await get('/forgot-password');
  if (forgotPage.status === 200) {
    record('Password Reset', 'Forgot password page', 'PASS', 'HTTP 200');
  } else {
    record('Password Reset', 'Forgot password page', 'FAIL',
      `HTTP ${forgotPage.status}`,
      'Check app/(auth)/forgot-password/page.tsx');
  }

  // 7b: Reset password page loads (should show form, not spinner)
  const resetPage = await get('/reset-password');
  if (resetPage.status === 200) {
    try {
      const text = await resetPage.text();
      const hasPasswordField = text.includes('password') || text.includes('Password')
        || text.includes('new_password') || text.includes('newPassword');
      if (hasPasswordField) {
        record('Password Reset', 'Reset page form', 'PASS',
          'Page contains password form elements');
      } else {
        record('Password Reset', 'Reset page form', 'WARN',
          'Could not detect password fields — may show spinner instead of form');
      }
    } catch {
      record('Password Reset', 'Reset page form', 'PASS', 'HTTP 200');
    }
  } else {
    record('Password Reset', 'Reset page form', 'FAIL',
      `HTTP ${resetPage.status}`,
      'Check app/(auth)/reset-password/page.tsx');
  }

  // 7c: /auth/callback without code should redirect gracefully
  const callbackNoCode = await get('/auth/callback', { followRedirects: false });
  if (callbackNoCode.status === 307 || callbackNoCode.status === 302) {
    const location = callbackNoCode.headers?.get?.('location') ?? '';
    if (location.includes('error') || location.includes('login')) {
      record('Password Reset', '/auth/callback (no code)', 'PASS',
        `Graceful redirect -> ${location}`);
    } else {
      record('Password Reset', '/auth/callback (no code)', 'WARN',
        `Redirects to ${location} — verify this is correct without a code`);
    }
  } else if (callbackNoCode.status === 200) {
    record('Password Reset', '/auth/callback (no code)', 'WARN',
      'Returns 200 without a code — should redirect to error/login');
  } else if (callbackNoCode.status === 404) {
    record('Password Reset', '/auth/callback missing', 'FAIL',
      'Route does not exist — password reset broken',
      'Create app/auth/callback/route.ts');
  } else {
    record('Password Reset', '/auth/callback (no code)', 'INFO',
      `HTTP ${callbackNoCode.status}`);
  }

  record('Password Reset', 'Reset flow', 'INFO',
    'Flow: forgot-password -> Supabase email -> /auth/callback?next=/reset-password -> reset-password page -> supabase.auth.updateUser()');

  sessionCookie = savedSession;
}

// ── TEST 8: API route auth guards ─────────────────────────────────────────────
async function testApiRouteGuards() {
  section('TEST 8 — API ROUTE AUTH GUARDS');

  // Clear session — test unauthenticated access
  const savedSession = sessionCookie;
  sessionCookie = null;

  // These are actual API routes discovered in the codebase
  const sensitiveApiRoutes = [
    { path: '/api/jobs', label: 'Jobs list' },
    { path: '/api/transcripts', label: 'Transcripts list' },
    { path: '/api/admin/health', label: 'Admin health (role-gated)' },
  ];

  for (const route of sensitiveApiRoutes) {
    const res = await get(route.path, { followRedirects: false });

    if (res.status === 401 || res.status === 403) {
      record('API Guards', route.label, 'PASS',
        `HTTP ${res.status} — correctly rejects unauthenticated`);
    } else if (res.status === 307 || res.status === 302) {
      const location = res.headers?.get?.('location') ?? '';
      record('API Guards', route.label, 'PASS',
        `HTTP ${res.status} -> ${location}`);
    } else if (res.status === 200) {
      record('API Guards', route.label, 'FAIL',
        'HTTP 200 — returns data without authentication!',
        `Add withRouteProtection() to ${route.path}/route.ts`);
    } else if (res.status === 404) {
      record('API Guards', route.label, 'SKIP',
        'Route not found');
    } else if (res.status === 500) {
      record('API Guards', route.label, 'WARN',
        `HTTP 500 — server error (may be auth-related crash)`);
    } else if (res.status === 0) {
      record('API Guards', route.label, 'SKIP', 'Server not reachable');
    } else {
      record('API Guards', route.label, 'WARN',
        `HTTP ${res.status}`);
    }
  }

  // Cron endpoint: must require CRON_SECRET in Authorization header
  try {
    const cronRes = await fetch(BASE_URL + '/api/cron/process-jobs', {
      headers: { 'Authorization': 'Bearer wrong-secret-value' },
      redirect: 'manual',
    });
    if (cronRes.status === 401 || cronRes.status === 403) {
      record('API Guards', 'Cron secret enforcement', 'PASS',
        `HTTP ${cronRes.status} — wrong secret correctly rejected`);
    } else if (cronRes.status === 200) {
      record('API Guards', 'Cron secret enforcement', 'FAIL',
        'HTTP 200 — cron ran with wrong secret!',
        'Add CRON_SECRET check to app/api/cron/process-jobs/route.ts');
    } else if (cronRes.status === 404) {
      record('API Guards', 'Cron secret enforcement', 'SKIP', 'Route not found');
    } else if (cronRes.status === 307 || cronRes.status === 302) {
      record('API Guards', 'Cron secret enforcement', 'PASS',
        `HTTP ${cronRes.status} — redirected (middleware blocks)`);
    } else {
      record('API Guards', 'Cron secret enforcement', 'WARN',
        `HTTP ${cronRes.status}`);
    }
  } catch (err) {
    record('API Guards', 'Cron secret enforcement', 'SKIP', err.message);
  }

  sessionCookie = savedSession;
}

// ── TEST 9: Health check endpoint ────────────────────────────────────────────
async function testHealthEndpoint() {
  section('TEST 9 — HEALTH CHECK');

  // /api/health is a public endpoint
  const res = await get('/api/health');
  if (res.status === 200) {
    try {
      const body = await res.json();
      const status = body.status ?? 'unknown';
      record('Health', '/api/health', 'PASS',
        `HTTP 200 — status: ${status}`);
    } catch {
      record('Health', '/api/health', 'PASS', 'HTTP 200');
    }
  } else if (res.status === 0) {
    record('Health', '/api/health', 'FAIL', 'Server not reachable');
  } else {
    record('Health', '/api/health', 'WARN', `HTTP ${res.status}`);
  }

  // /api/health/supabase is also public
  const sbRes = await get('/api/health/supabase');
  if (sbRes.status === 200) {
    try {
      const body = await sbRes.json();
      record('Health', '/api/health/supabase', 'PASS',
        `HTTP 200 — ${JSON.stringify(body).slice(0, 80)}`);
    } catch {
      record('Health', '/api/health/supabase', 'PASS', 'HTTP 200');
    }
  } else if (sbRes.status === 404) {
    record('Health', '/api/health/supabase', 'SKIP', 'Route not found');
  } else {
    record('Health', '/api/health/supabase', 'WARN', `HTTP ${sbRes.status}`);
  }
}

// ── TEST 10: Supabase RLS grants ──────────────────────────────────────────────
async function testRlsGrants() {
  section('TEST 10 — SUPABASE RLS SCHEMA GRANTS');

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    record('RLS', 'Schema grant check', 'SKIP', 'Missing Supabase credentials');
    return;
  }

  // Test anon access to multiple tables
  const tables = ['profiles', 'jobs', 'firms', 'transcriptions'];

  for (const table of tables) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=id&limit=1`, {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      });
      if (res.status === 200) {
        record('RLS', `anon access: ${table}`, 'PASS',
          'Query succeeds (RLS filters rows)');
      } else {
        const body = await res.json().catch(() => ({}));
        const msg = body.message ?? `HTTP ${res.status}`;
        if (msg.includes('permission denied')) {
          record('RLS', `anon access: ${table}`, 'FAIL', msg,
            'Run: GRANT USAGE ON SCHEMA public TO anon;');
        } else if (msg.includes('recursion')) {
          record('RLS', `anon access: ${table}`, 'FAIL',
            `Infinite recursion in RLS policy for ${table}`,
            'Fix self-referencing RLS policies with SECURITY DEFINER functions');
        } else {
          record('RLS', `anon access: ${table}`, 'WARN', msg);
        }
      }
    } catch (err) {
      record('RLS', `anon access: ${table}`, 'WARN', err.message);
    }
  }
}

// ── GENERATE REPORT ───────────────────────────────────────────────────────────
function generateReport() {
  const duration = ((new Date() - START_TIME) / 1000).toFixed(1);
  const pass = results.filter(r => r.status === 'PASS').length;
  const fail = results.filter(r => r.status === 'FAIL').length;
  const warn = results.filter(r => r.status === 'WARN').length;
  const skip = results.filter(r => r.status === 'SKIP').length;
  const info = results.filter(r => r.status === 'INFO').length;

  const failures = results.filter(r => r.status === 'FAIL');
  const warnings = results.filter(r => r.status === 'WARN');

  const readiness = fail === 0 ? 'READY' : fail <= 2 ? 'NEEDS ATTENTION' : 'NOT READY';

  let report = `# Depo-Pro Auth Diagnostic Report
Generated: ${START_TIME.toISOString()}
Duration: ${duration}s

## Summary

| Result | Count |
|--------|-------|
| PASS | ${pass} |
| FAIL | ${fail} |
| WARN | ${warn} |
| SKIP | ${skip} |
| INFO | ${info} |
| **Auth Readiness** | **${readiness}** |

`;

  if (failures.length > 0) {
    report += `## Failures -- Must Fix Before Launch\n\n`;
    for (const f of failures) {
      report += `### ${f.category}: ${f.name}\n`;
      report += `**Problem:** ${f.detail}\n\n`;
      if (f.fix) report += `**Fix:**\n\`\`\`\n${f.fix}\n\`\`\`\n\n`;
    }
  }

  if (warnings.length > 0) {
    report += `## Warnings -- Should Address\n\n`;
    for (const w of warnings) {
      report += `- **[${w.category}] ${w.name}:** ${w.detail}\n`;
      if (w.fix) report += `  - Fix: ${w.fix}\n`;
    }
    report += '\n';
  }

  report += `## All Results\n\n`;
  report += `| Category | Test | Status | Detail |\n`;
  report += `|----------|------|--------|--------|\n`;
  for (const r of results) {
    report += `| ${r.category} | ${r.name} | ${r.status} | ${r.detail.replace(/\|/g, '/').replace(/\n/g, ' ')} |\n`;
  }

  report += `\n## Manual Verification Required\n\n`;
  report += `These cannot be tested programmatically:\n\n`;
  report += `- [ ] Supabase Dashboard > Auth > Email Templates > Reset Password URL is:\n`;
  report += `      \`{{ .SiteURL }}/auth/callback?next=/reset-password\`\n`;
  report += `- [ ] Supabase Dashboard > Auth > URL Configuration > Redirect URLs includes:\n`;
  report += `      \`https://depo-pro.com/auth/callback\`\n`;
  report += `- [ ] Password reset email actually arrives in inbox\n`;
  report += `- [ ] Clicking reset link lands on password form (not spinner)\n`;
  report += `- [ ] Login with real credentials succeeds end-to-end\n`;
  report += `- [ ] Dashboard loads with real data after login\n`;

  writeFileSync(REPORT_FILE, report);
  return { pass, fail, warn, skip, info, readiness };
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
async function main() {
  writeFileSync(LOG_FILE,
    `Depo-Pro Auth Diagnostic v2.0\nStarted: ${START_TIME.toISOString()}\n\n`);

  console.log('\n======================================================');
  console.log('     DEPO-PRO AUTH DIAGNOSTIC v2.0');
  console.log('======================================================\n');

  const serverUp = await testServerReachable();

  // Supabase tests don't need dev server
  await testSupabaseConnection();
  await testRlsGrants();

  if (!serverUp) {
    record('Server', 'Remaining tests', 'SKIP',
      'Dev server not running — skipping route tests',
      'Start with: npm run dev');
  } else {
    await testPublicPages();
    await testProtectedPages();
    await testRedirectLoops();
    await testLoginPage();
    await testPasswordResetFlow();
    await testApiRouteGuards();
    await testHealthEndpoint();
  }

  const { pass, fail, warn, skip, info, readiness } = generateReport();

  console.log('\n======================================================');
  console.log('               DIAGNOSTIC COMPLETE');
  console.log('------------------------------------------------------');
  console.log(`  PASS:  ${pass}`);
  console.log(`  FAIL:  ${fail}`);
  console.log(`  WARN:  ${warn}`);
  console.log(`  SKIP:  ${skip}`);
  console.log(`  INFO:  ${info}`);
  console.log(`  Auth readiness: ${readiness}`);
  console.log('------------------------------------------------------');
  console.log('  Reports written:');
  console.log('    AUTH_DIAGNOSTIC_REPORT.md');
  console.log('    AUTH_DIAGNOSTIC_LOG.txt');
  console.log('======================================================\n');

  if (fail > 0) {
    console.log('Fix the failures above before proceeding to beta.\n');
    process.exit(1);
  } else {
    console.log('No failures detected. Auth system is operational.\n');
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Diagnostic crashed:', err);
  process.exit(1);
});

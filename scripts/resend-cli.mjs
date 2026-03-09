#!/usr/bin/env node
// =============================================================================
// Resend CLI Helper for Depo-Pro
// Usage: node scripts/resend-cli.mjs <command>
//
// Commands:
//   domains     List verified domains
//   keys        List API keys
//   test        Send a test email
//   emails      List recent emails
//   help        Show this help
//
// Reads RESEND_API_KEY from .env.local
// =============================================================================

import { readFileSync } from 'fs';
import { resolve } from 'path';

const BASE = 'https://api.resend.com';

// ── Load API key from .env.local ─────────────────────────────────────────────
function getApiKey() {
  const envKey = process.env.RESEND_API_KEY;
  if (envKey) return envKey;

  try {
    const raw = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8');
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (trimmed.startsWith('RESEND_API_KEY=')) {
        return trimmed.slice('RESEND_API_KEY='.length).replace(/^["']|["']$/g, '');
      }
    }
  } catch { /* ignore */ }

  console.error('ERROR: RESEND_API_KEY not found in .env.local or environment');
  process.exit(1);
}

async function api(path, options = {}) {
  const key = getApiKey();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`API Error (${res.status}): ${body}`);
    process.exit(1);
  }

  return res.json();
}

// ── Commands ─────────────────────────────────────────────────────────────────

async function listDomains() {
  const data = await api('/domains');
  const domains = data.data || [];
  if (domains.length === 0) {
    console.log('No domains configured. Add one at https://resend.com/domains');
    return;
  }
  console.log('\nDomains:\n');
  for (const d of domains) {
    const status = d.status === 'verified' ? '✅' : '❌';
    console.log(`  ${status} ${d.name} (${d.status}) — created ${d.created_at}`);
  }
  console.log();
}

async function listApiKeys() {
  const data = await api('/api-keys');
  const keys = data.data || [];
  if (keys.length === 0) {
    console.log('No API keys found.');
    return;
  }
  console.log('\nAPI Keys:\n');
  for (const k of keys) {
    console.log(`  ${k.name} — id: ${k.id} — created ${k.created_at}`);
  }
  console.log();
}

async function sendTestEmail() {
  const to = process.argv[3] || 'delivered@resend.dev';
  console.log(`Sending test email to ${to}...`);

  const data = await api('/emails', {
    method: 'POST',
    body: JSON.stringify({
      from: 'Depo-Pro <notifications@depo-pro.com>',
      to: [to],
      subject: 'Depo-Pro Test Email',
      text: 'This is a test email from Depo-Pro. If you received this, Resend is configured correctly.',
    }),
  });

  console.log(`✅ Email sent! ID: ${data.id}`);
}

async function listEmails() {
  const data = await api('/emails');
  const emails = data.data || [];
  if (emails.length === 0) {
    console.log('No recent emails.');
    return;
  }
  console.log('\nRecent Emails:\n');
  for (const e of emails.slice(0, 10)) {
    console.log(`  ${e.id} | ${e.to} | ${e.subject} | ${e.created_at}`);
  }
  console.log();
}

function showHelp() {
  console.log(`
Resend CLI Helper for Depo-Pro

Usage: node scripts/resend-cli.mjs <command>

Commands:
  domains              List verified domains
  keys                 List API keys
  test [email]         Send test email (default: delivered@resend.dev)
  emails               List recent emails
  help                 Show this help

Reads RESEND_API_KEY from .env.local or environment.
`);
}

// ── Main ─────────────────────────────────────────────────────────────────────
const command = process.argv[2] || 'help';

switch (command) {
  case 'domains':  await listDomains(); break;
  case 'keys':     await listApiKeys(); break;
  case 'test':     await sendTestEmail(); break;
  case 'emails':   await listEmails(); break;
  case 'help':
  default:         showHelp(); break;
}

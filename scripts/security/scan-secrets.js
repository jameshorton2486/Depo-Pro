#!/usr/bin/env node
/* eslint-disable no-console */
const { execSync } = require('node:child_process');
const { readFileSync, existsSync } = require('node:fs');
const { extname } = require('node:path');

const DEFAULT_MODE = process.env.SECRET_SCAN_MODE || 'tracked';
const MODE = process.argv.includes('--staged') ? 'staged' : DEFAULT_MODE;

const IGNORED_PREFIXES = [
  'node_modules/',
  '.next/',
  'coverage/',
  'dist/',
  'build/',
  'playwright-report/',
  'test-results/',
  'reports/',
  'archive/',
  'docs/archive/',
  'docs/_archive/',
  'scripts/archive/',
];

const IGNORED_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.pdf',
  '.zip',
  '.gz',
  '.mp3',
  '.mp4',
  '.woff',
  '.woff2',
  '.ico',
  '.docx',
  '.xlsx',
]);

const RULES = [
  {
    id: 'postgres-uri-credential',
    regex: /\bpostgres(?:ql)?:\/\/([^:\s"'@]+):([^@\s"'<>]+)@([^\s"']+)/i,
    message: 'Potential PostgreSQL URI with embedded password.',
    isAllowed: (line, match) => {
      const password = (match?.[2] || '').toLowerCase();
      return (
        line.includes('-match') ||
        line.toLowerCase().includes('regex') ||
        line.includes('([^') ||
        password.includes('password') ||
        password.includes('placeholder') ||
        password.includes('your_') ||
        password.includes('example') ||
        password.includes('xxxx') ||
        password.includes('***') ||
        line.includes('<PASSWORD>') ||
        line.includes('[PASSWORD]') ||
        line.includes('$DATABASE_URL')
      );
    },
  },
  {
    id: 'supabase-service-role-key',
    regex: /\bSUPABASE_SERVICE_ROLE_KEY\s*=\s*([^\s"'`]+)/i,
    message: 'Potential hardcoded Supabase service role key.',
    isAllowed: (line, match) => {
      const value = (match?.[1] || '').toLowerCase();
      return (
        line.includes('-match') ||
        line.toLowerCase().includes('regex') ||
        value.includes('placeholder') ||
        value.includes('your-') ||
        value.includes('your_') ||
        value.includes('example') ||
        value.includes('...') ||
        value.includes('[paste') ||
        value.includes('[full_key]') ||
        value.includes('sb_secret_placeholder')
      );
    },
  },
  {
    id: 'supabase-secret-token',
    regex: /\bsb_secret_[a-z0-9._-]{16,}\b/i,
    message: 'Potential Supabase secret token.',
    isAllowed: (line) => /placeholder|your_|your-|example/i.test(line),
  },
  {
    id: 'anthropic-api-key',
    regex: /\bsk-ant-[a-z0-9_-]{16,}\b/i,
    message: 'Potential Anthropic API key.',
    isAllowed: (line) => /placeholder|your_|example/i.test(line),
  },
  {
    id: 'github-pat',
    regex: /\bghp_[a-z0-9]{20,}\b/i,
    message: 'Potential GitHub personal access token.',
    isAllowed: () => false,
  },
];

function run(cmd) {
  return execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] })
    .toString()
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function getCandidateFiles() {
  const cmd =
    MODE === 'staged'
      ? 'git diff --cached --name-only --diff-filter=ACMRTUXB'
      : 'git ls-files';
  return run(cmd).filter((file) => {
    if (IGNORED_PREFIXES.some((prefix) => file.startsWith(prefix))) return false;
    if (IGNORED_EXTENSIONS.has(extname(file).toLowerCase())) return false;
    return existsSync(file);
  });
}

function scanFile(filePath) {
  const findings = [];
  let content;
  try {
    content = readFileSync(filePath, 'utf8');
  } catch {
    return findings;
  }
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line || /^\s*(#|\/\/|\/\*|\*)/.test(line)) continue;
    for (const rule of RULES) {
      const match = line.match(rule.regex);
      if (!match) continue;
      if (rule.isAllowed?.(line, match)) continue;
      findings.push({
        filePath,
        line: i + 1,
        ruleId: rule.id,
        message: rule.message,
      });
    }
  }
  return findings;
}

const files = getCandidateFiles();
const findings = files.flatMap(scanFile);

if (findings.length > 0) {
  console.error('Secret scan failed. Potential secrets detected:\n');
  for (const finding of findings) {
    console.error(
      `- ${finding.filePath}:${finding.line} [${finding.ruleId}] ${finding.message}`
    );
  }
  console.error(
    '\nIf this is a false positive, replace literal secrets with placeholders or environment variables.'
  );
  process.exit(1);
}

console.log(`Secret scan passed (${MODE} files checked: ${files.length}).`);

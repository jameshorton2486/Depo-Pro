#!/usr/bin/env node
/**
 * Env inventory audit — key names only, never values.
 *
 * Compares:
 *   1. Keys declared in .env.example (authoritative template)
 *   2. Keys present in local .env / .env.local (names only)
 *   3. Keys referenced by application code (Vite, Edge Functions, Python, workers)
 *
 * Usage:
 *   node scripts/audit-env.mjs
 *   npm run env:audit
 */

import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Test/CI harness flags — documented in .env.example but never required locally. */
const HARNESS_KEYS = new Set(["STAGE_S_WRITE"]);

const STALE_KEYS = new Set([
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SITE_URL",
  "OPENAI_API_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "USE_STRIPE",
  "ENABLE_BILLING_PHASE_6",
  "RESEND_API_KEY",
  "CRON_SECRET",
  "INTERNAL_API_SECRET",
  "WEBHOOK_SECRET",
  "ADMIN_EMAIL",
  "LOW_CONFIDENCE_THRESHOLD",
  "USE_DEEPGRAM",
  "DEEPGRAM_WEBHOOK_SECRET",
  "VERCEL_OIDC_TOKEN",
  "SUPABASE_SECRET_KEY",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "AI_REVIEW_BRIDGE",
  "TIE_MODEL_OPUS",
  "TIE_MODEL_SONNET",
  "TIE_MODEL_HAIKU",
]);

const LOCAL_DEV_FILES = [".env", ".env.local", ".env.development", ".env.development.local"];

const CODE_SCAN_ROOTS = [
  "src",
  "supabase/functions",
  "transcript_finalize_service",
  "formatter_service",
  "transcript_formatter",
  "scripts",
];

const CODE_SCAN_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs", ".py"]);

const ENV_REF_PATTERNS = [
  /Deno\.env\.get\(\s*["']([A-Z][A-Z0-9_]*)["']\s*\)/g,
  /os\.getenv\(\s*["']([A-Z][A-Z0-9_]*)["']\s*\)/g,
  /os\.environ\.get\(\s*["']([A-Z][A-Z0-9_]*)["']\s*\)/g,
  /os\.environ\[\s*["']([A-Z][A-Z0-9_]*)["']\s*\]/g,
  /import\.meta\.env\.(VITE_[A-Z0-9_]+)/g,
  /process\.env\.([A-Z][A-Z0-9_]*)/g,
  /env\.([A-Z][A-Z0-9_]*)/g,
];

/** Minimum set to run frontend mock mode locally. */
const REQUIRED_LOCAL_MOCK = [];

/** Minimum set to run frontend against real Supabase + editor-api. */
const REQUIRED_LOCAL_REAL_API = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_ANON_KEY",
  "VITE_USE_REAL_API",
  "VITE_EDITOR_API_BASE_URL",
];

/** Minimum Edge Function secrets for AI review + transcription core. */
const REQUIRED_EDGE_CORE = [
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "ANTHROPIC_API_KEY",
  "DEEPGRAM_API_KEY",
];

function isBlankPlaceholder(value) {
  const v = value.trim().replace(/^['"]|['"]$/g, "");
  if (!v) return true;
  return /^(your-|https:\/\/your-project-id|change-me|todo|xxx|placeholder)/i.test(v);
}

/**
 * Parse KEY=VALUE lines. Returns Map<key, { set: boolean, blank: boolean }>.
 * Never stores or returns secret values.
 */
function parseEnvKeys(content) {
  const keys = new Map();
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator <= 0) continue;
    const key = line.slice(0, separator).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    const rawValue = line.slice(separator + 1);
    keys.set(key, {
      set: true,
      blank: isBlankPlaceholder(rawValue),
    });
  }
  return keys;
}

/** Keys mentioned only in comments under the "Stale" section are ignored as declared. */
function parseExampleDeclaredKeys(content) {
  const declared = new Set();
  const lines = content.split(/\r?\n/);
  let inStaleSection = false;
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.includes("Stale / unused")) {
      inStaleSection = true;
      continue;
    }
    if (inStaleSection) continue;
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator <= 0) continue;
    const key = line.slice(0, separator).trim();
    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      declared.add(key);
    }
  }

  // Also accept commented optional keys in sections 1–9 (e.g. # DATABASE_URL=)
  inStaleSection = false;
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.includes("Stale / unused")) {
      inStaleSection = true;
      continue;
    }
    if (inStaleSection) continue;
    const commented = line.match(/^#\s*([A-Z][A-Z0-9_]*)=/);
    if (commented) declared.add(commented[1]);
  }

  return declared;
}

async function walkFiles(dir, out = []) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === "dist" || entry.name === "__pycache__") {
      continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walkFiles(full, out);
    } else if (CODE_SCAN_EXTENSIONS.has(path.extname(entry.name))) {
      out.push(full);
    }
  }
  return out;
}

async function scanCodeKeys() {
  const found = new Map(); // key -> Set of relative file paths
  for (const relRoot of CODE_SCAN_ROOTS) {
    const absRoot = path.join(root, relRoot);
    const files = await walkFiles(absRoot);
    for (const file of files) {
      // Skip reference wave8 if somehow nested; CODE_SCAN_ROOTS excludes it.
      const content = await readFile(file, "utf8");
      const rel = path.relative(root, file);
      for (const pattern of ENV_REF_PATTERNS) {
        pattern.lastIndex = 0;
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const key = match[1];
          if (!key || key === "MODE" || key === "DEV" || key === "PROD" || key === "SSR" || key === "BASE_URL") {
            continue;
          }
          // Ignore common non-env identifiers matched by env.FOO in loose pattern
          if (pattern.source.startsWith("env\\.") && !/^[A-Z][A-Z0-9_]*$/.test(key)) {
            continue;
          }
          if (!found.has(key)) found.set(key, new Set());
          found.get(key).add(rel);
        }
      }
    }
  }
  return found;
}

async function loadFileKeys(relativePath) {
  const abs = path.join(root, relativePath);
  try {
    await stat(abs);
  } catch {
    return null;
  }
  const content = await readFile(abs, "utf8");
  return parseEnvKeys(content);
}

function sorted(setOrArray) {
  return [...setOrArray].sort((a, b) => a.localeCompare(b));
}

function printSection(title, items, emptyLabel = "(none)") {
  console.log(`\n${title}`);
  if (!items.length) {
    console.log(`  ${emptyLabel}`);
    return;
  }
  for (const item of items) {
    console.log(`  - ${item}`);
  }
}

async function main() {
  const examplePath = path.join(root, ".env.example");
  const exampleContent = await readFile(examplePath, "utf8");
  const declared = parseExampleDeclaredKeys(exampleContent);
  const codeKeys = await scanCodeKeys();

  console.log("Depo-Pro env audit (key names only — values never printed)");
  console.log(`Root: ${root}`);

  printSection("A. Keys declared in .env.example", sorted(declared));

  const codeOnly = sorted(
    [...codeKeys.keys()].filter((k) => !declared.has(k) && !STALE_KEYS.has(k) && !HARNESS_KEYS.has(k)),
  );
  // Filter loose env.FOO false positives that are clearly not env vars
  const codeOnlyFiltered = codeOnly.filter((k) => {
    // Keep VITE_ / known server prefixes / uppercase snake
    return (
      k.startsWith("VITE_")
      || k.startsWith("SUPABASE_")
      || k.startsWith("EXPORT_")
      || k.startsWith("FINALIZE_")
      || k.startsWith("WATCHDOG_")
      || k.startsWith("AI_")
      || k.startsWith("DEEPGRAM_")
      || k.startsWith("ANTHROPIC_")
      || k.startsWith("TRANSCRIBE_")
      || k.startsWith("SMOKE_")
      || k.startsWith("SEED_")
      || k.startsWith("EDITOR_")
      || k === "PORT"
      || k === "FORMATTER_VERSION"
      || k === "DATABASE_URL"
      || k === "DIRECT_URL"
    );
  });
  printSection(
    "B. Keys referenced in code but missing from .env.example",
    codeOnlyFiltered,
    "(none — template covers scanned code)",
  );

  let foundLocalFile = false;
  let hasEnvLocal = false;
  const presentNames = new Set();
  const blankRequired = [];

  for (const file of LOCAL_DEV_FILES) {
    const keys = await loadFileKeys(file);
    if (!keys) continue;
    foundLocalFile = true;
    if (file === ".env.local" || file.endsWith(".local")) hasEnvLocal = true;
    const names = sorted(keys.keys());
    printSection(`C. Keys present in ${file} (names only)`, names);
    for (const [key, meta] of keys) {
      presentNames.add(key);
      if (REQUIRED_LOCAL_REAL_API.includes(key) && meta.blank) {
        blankRequired.push(`${file}:${key}`);
      }
    }

    const staleInFile = names.filter((k) => STALE_KEYS.has(k));
    printSection(`   Stale/unused keys in ${file} (safe to remove)`, staleInFile);

    const unknown = names.filter((k) => !declared.has(k) && !STALE_KEYS.has(k));
    printSection(`   Unknown keys in ${file} (not in .env.example)`, unknown);
  }

  if (!foundLocalFile) {
    console.log("\nC. Local env files");
    console.log("  (none found — copy .env.example → .env and fill values)");
  }

  if (hasEnvLocal) {
    console.log("\n⚠️  `.env.local` detected. This app should use a single `.env` file.");
    console.log("   Scripts load `.env` only. Merge needed keys into `.env`, then delete `.env.local`.");
  }

  const missingForRealApi = REQUIRED_LOCAL_REAL_API.filter((k) => !presentNames.has(k));
  printSection(
    "D. Missing for local real-API frontend (VITE_USE_REAL_API=1)",
    missingForRealApi,
    foundLocalFile ? "(all key names present)" : "(no local .env yet)",
  );

  printSection(
    "E. Edge Function core secrets (set via `supabase secrets set`, not required in local .env)",
    REQUIRED_EDGE_CORE,
  );

  printSection(
    "F. Local mock-mode minimum",
    REQUIRED_LOCAL_MOCK.length ? REQUIRED_LOCAL_MOCK : ["(no keys required — defaults work with VITE_USE_REAL_API=0)"],
  );

  if (blankRequired.length) {
    printSection("G. Present but still blank placeholders (fill before real-API use)", blankRequired);
  }

  // Exit codes: 0 = healthy inventory; 1 = structural problems (stale file layout or template drift)
  let exitCode = 0;
  if (codeOnlyFiltered.length) {
    console.log("\nResult: FAIL — .env.example is missing keys referenced by code.");
    exitCode = 1;
  } else if (hasEnvLocal) {
    console.log("\nResult: WARN — consolidate `.env.local` into `.env` (exit 0; layout debt only).");
  } else if (!foundLocalFile) {
    console.log("\nResult: OK template — create `.env` from `.env.example` to run with secrets.");
  } else {
    console.log("\nResult: OK — single-file layout; review sections D/E for any blank secrets you need.");
  }

  process.exit(exitCode);
}

main().catch((error) => {
  console.error("env audit failed:", error instanceof Error ? error.message : error);
  process.exit(2);
});

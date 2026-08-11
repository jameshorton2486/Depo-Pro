#!/usr/bin/env node
// Edge Function type-verification gate (closes the deno-check CI gap — DOC ref: edge-fn gap).
//
// WHY: CI's `tsc` stops at `src/` and deploy uses esbuild (ignores types), so real type
// errors in the Deno Edge Functions go uncaught (two shipped before this gate). We cannot
// simply `deno check` in CI and fail on any error, because 4 functions type their Supabase
// client with the `Database = Record<string, never>` stub (no runnable `supabase gen types`
// path is available offline), which emits stable, benign "never"/overload noise on every
// write. This gate records that known noise as a per-function signature BASELINE and fails
// only on signatures NOT in the baseline — i.e. genuinely new type defects. It does not
// weaken checking: a real regression adds a new signature and fails. When the stub is later
// replaced with generated types, the baseline shrinks; run with --update to re-record.
//
// Usage:
//   node scripts/verify-edge-functions.mjs            # verify against baseline (CI mode)
//   node scripts/verify-edge-functions.mjs --update   # re-record the baseline after a change

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FUNCTIONS_DIR = join(ROOT, "supabase", "functions");
const BASELINE_PATH = join(FUNCTIONS_DIR, "deno-check-baseline.json");
const UPDATE = process.argv.includes("--update");

// Every production Edge Function entrypoint (index.ts under a non-_shared dir).
function entrypoints() {
  return readdirSync(FUNCTIONS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("_") && !d.name.startsWith("."))
    .map((d) => ({ name: d.name, path: join(FUNCTIONS_DIR, d.name, "index.ts") }))
    .filter((f) => existsSync(f.path))
    .sort((a, b) => a.name.localeCompare(b.name));
}

const stripAnsi = (s) => s.replace(/\[[0-9;]*m/g, "");

// Parse deno-check stderr into: a de-duplicated set of stable signatures (TS code + first-line
// message, line numbers/paths EXCLUDED so line shifts don't churn) AND the raw error count.
// Both matter: signatures catch distinct-message regressions (line shifts aside); the raw count
// catches a NEW error that happens to share an already-baselined generic message (e.g. the
// TS2769 "No overload matches this call" the Database stub emits on every write).
function analyze(rawStderr) {
  const sigs = new Set();
  let count = 0;
  for (const line of stripAnsi(rawStderr).split(/\r?\n/)) {
    const m = line.match(/^(TS\d+)\s*\[ERROR\]:\s*(.*)$/);
    if (m) {
      count += 1;
      sigs.add(`${m[1]}: ${m[2].replace(/\s+/g, " ").trim().slice(0, 200)}`);
    }
  }
  return { count, signatures: [...sigs].sort() };
}

function denoCheck(path) {
  try {
    execSync(`deno check "${path}"`, { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] });
    return ""; // exit 0 → no errors
  } catch (e) {
    return `${e.stdout ?? ""}\n${e.stderr ?? ""}`;
  }
}

const current = {};
for (const fn of entrypoints()) current[fn.name] = analyze(denoCheck(fn.path));

if (UPDATE) {
  writeFileSync(BASELINE_PATH, JSON.stringify(current, null, 2) + "\n");
  const total = Object.values(current).reduce((n, e) => n + e.count, 0);
  console.log(`Updated edge-function deno-check baseline: ${Object.keys(current).length} functions, ${total} known errors.`);
  process.exit(0);
}

if (!existsSync(BASELINE_PATH)) {
  console.error("No baseline at supabase/functions/deno-check-baseline.json. Run: node scripts/verify-edge-functions.mjs --update");
  process.exit(1);
}

const baseline = JSON.parse(readFileSync(BASELINE_PATH, "utf8"));
let failed = 0;
let progress = 0;
for (const [name, entry] of Object.entries(current)) {
  const base = baseline[name] ?? { count: 0, signatures: [] };
  const baseSigs = new Set(base.signatures ?? []);
  const added = entry.signatures.filter((s) => !baseSigs.has(s));
  const removed = (base.signatures ?? []).filter((s) => !new Set(entry.signatures).has(s));
  const countUp = entry.count > (base.count ?? 0);

  if (added.length || countUp) {
    failed += 1;
    console.error(`\n✗ ${name}: NEW type error(s) beyond baseline (count ${base.count ?? 0} → ${entry.count}):`);
    for (const s of added) console.error(`    + ${s}`);
    if (countUp && !added.length) {
      console.error(`    + (count rose with no new distinct message — a new error sharing an already-known message, e.g. a stub-pattern "No overload" at a new site)`);
    }
  }
  if (removed.length || entry.count < (base.count ?? 0)) {
    progress += 1;
    console.log(`\n✓ ${name}: fewer errors than baseline (count ${base.count ?? 0} → ${entry.count}) — tighten with --update.`);
    for (const s of removed) console.log(`    - ${s}`);
  }
}

if (failed > 0) {
  console.error(`\nEdge Function verification FAILED in ${failed} function(s). New errors are genuine defects (the baseline captures the known Database-stub noise). Fix them, or if intentional, justify and run --update.`);
  process.exit(1);
}

const total = Object.values(current).reduce((n, e) => n + e.count, 0);
console.log(`\nEdge Function verification passed: ${Object.keys(current).length} functions, ${total} known-noise errors, 0 new.${progress ? " Some baseline errors are gone — run --update to tighten." : ""}`);
process.exit(0);

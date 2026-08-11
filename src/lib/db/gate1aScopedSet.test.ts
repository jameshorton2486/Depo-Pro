// DOC-0331 §N — Gate 1A (C-scoped) authorized migration-set guard.
//
// After the C-scoped decision, Gate 1A applies EXACTLY five genuinely-absent migrations and
// must NOT include the two already-applied-out-of-band migrations (finalizing, watchdog — those
// are reconciled by Gate 0R `migration repair`, not re-run) nor the Gate 1B backfill. This test
// pins that set against the repo so any drift — a new pending migration, or one of the excluded
// files being pulled back into scope — fails and forces a re-audit before execution.
import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const DIR = resolve(process.cwd(), "supabase/migrations");

// Production applied max at audit time (read-only schema_migrations query, 2026-08-11).
const PRODUCTION_MAX_APPLIED = "20260722024834";

// Gate 1A (C-scoped) — the five genuinely-absent, to-be-applied migrations.
const GATE_1A_AUTHORIZED = [
  "20260729120000_corrections.sql",
  "20260804230000_canon_raw_b_provenance_columns.sql",
  "20260804233000_canon_raw_d_directory_provenance.sql",
  "20260810180000_line_type_review_contract.sql",
  "20260811120000_working_text_word_scoped_rpc.sql",
];

// Applied out-of-band (schema present, history unrecorded) — reconciled by Gate 0R, NOT re-run.
const GATE_0R_RECONCILE = [
  "20260724120000_transcription_job_finalizing.sql",
  "20260724130000_transcription_watchdog.sql",
];

// Excluded from Gate 1A — the row-mutating backfill (its own later authorization).
const GATE_1B_EXCLUDED = "20260812090000_line_type_review_backfill.sql";

function migrationsAfterProductionMax(): string[] {
  return readdirSync(DIR)
    .filter((f) => f.endsWith(".sql") && f.slice(0, 14) > PRODUCTION_MAX_APPLIED)
    .sort();
}

describe("Gate 1A C-scoped authorized set (DOC-0331 §N)", () => {
  it("the pending set is exactly the 8 audited migrations (no new/unexpected version)", () => {
    const expected = [...GATE_0R_RECONCILE, ...GATE_1A_AUTHORIZED, GATE_1B_EXCLUDED].sort();
    expect(migrationsAfterProductionMax()).toEqual(expected);
  });

  it("Gate 1A applies exactly five migrations, none of them excluded", () => {
    expect(GATE_1A_AUTHORIZED).toHaveLength(5);
    expect(GATE_1A_AUTHORIZED).not.toContain(GATE_1B_EXCLUDED);
    for (const reconciled of GATE_0R_RECONCILE) {
      expect(GATE_1A_AUTHORIZED).not.toContain(reconciled);
    }
  });

  it("Gate 1A authorized set is strictly ordered after the Gate 0R reconciliation set", () => {
    const reconcileVersions = GATE_0R_RECONCILE.map((f) => f.slice(0, 14)).sort();
    const maxReconcile = reconcileVersions[reconcileVersions.length - 1];
    const minAuthorized = GATE_1A_AUTHORIZED.map((f) => f.slice(0, 14)).sort()[0];
    expect(minAuthorized > maxReconcile).toBe(true);
  });

  it("all referenced migration files still exist (none deleted/moved)", () => {
    const present = new Set(readdirSync(DIR));
    for (const f of [...GATE_0R_RECONCILE, ...GATE_1A_AUTHORIZED, GATE_1B_EXCLUDED]) {
      expect(present.has(f)).toBe(true);
    }
  });
});

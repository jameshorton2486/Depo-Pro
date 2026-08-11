// DOC-0331 Gate 1A execution package — apply-time DML guard for the pending backlog.
//
// Production is behind the repo by 8 migrations (max applied 20260722024834). The Gate 1A
// execution safety case rests on one fact: among the pending migrations, ONLY the Gate 1B
// backfill mutates existing rows at apply time. Every other pending migration is additive —
// its only UPDATE/INSERT statements live inside `$$ ... $$` function bodies, which run when the
// RPC is invoked, never at migration apply. This test strips function bodies and asserts that
// invariant, so a future edit that introduces apply-time DML into the additive backlog (or into
// Gate 1A) fails loudly and forces a re-audit before any Gate 1A execution.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const DIR = resolve(process.cwd(), "supabase/migrations");

// Pending migrations as audited 2026-08-11 (versions > production max 20260722024834),
// excluding the Gate 1B backfill. All must be additive at apply time.
const PENDING_ADDITIVE = [
  "20260724120000_transcription_job_finalizing.sql",
  "20260724130000_transcription_watchdog.sql",
  "20260729120000_corrections.sql",
  "20260804230000_canon_raw_b_provenance_columns.sql",
  "20260804233000_canon_raw_d_directory_provenance.sql",
  "20260810180000_line_type_review_contract.sql", // Gate 1A
  "20260811120000_working_text_word_scoped_rpc.sql",
];
const GATE_1B = "20260812090000_line_type_review_backfill.sql";

// A row-mutating STATEMENT starts with the verb (after a `;` or start of file). This avoids
// false positives from the word "update" inside a policy name (`corrections_update_owner`), a
// `for update` clause, or comment prose ("No UPDATE/DELETE") — none of which mutate rows.
const DML_STATEMENT = /^\s*(insert|update|delete|merge)\b/im;

/** Reduce a migration to its apply-time (top-level) statements: strip block + line comments and
 *  `$$ ... $$` / `$tag$ ... $tag$` function bodies (whose DML runs only when the RPC is called). */
function applyTimeSql(file: string): string {
  const withoutBlockComments = readFileSync(resolve(DIR, file), "utf8").replace(/\/\*[\s\S]*?\*\//g, " ");
  const withoutLineComments = withoutBlockComments
    .split(/\r?\n/)
    .map((line) => line.replace(/--.*$/, ""))
    .join("\n");
  return withoutLineComments.replace(/\$([A-Za-z_]*)\$[\s\S]*?\$\1\$/g, "\n/* function-body */\n");
}

describe("pending migration apply-time DML guard (DOC-0331)", () => {
  it.each(PENDING_ADDITIVE)("additive-at-apply-time: %s has no top-level DML", (file) => {
    const sql = applyTimeSql(file);
    expect(DML_STATEMENT.test(sql)).toBe(false);
  });

  it("Gate 1B is the only pending migration with apply-time DML (exactly one UPDATE)", () => {
    const sql = applyTimeSql(GATE_1B);
    expect((sql.match(/^\s*update\b/gim) ?? [])).toHaveLength(1);
    expect(/^\s*(insert|delete|merge)\b/im.test(sql)).toBe(false);
  });

  it("documents the audited pending set (new pending migration must be re-audited)", () => {
    // If a migration is added with a version after the audited Gate 1B, this list is stale and
    // the execution package must be re-derived. Keeping it explicit forces that re-audit.
    const known = new Set([...PENDING_ADDITIVE, GATE_1B]);
    expect(known.size).toBe(8);
  });
});

// DOC-0331 Gate 1A/1B — static guard tests for the line_type migration split.
//
// These lock the invariant that made the split necessary: the Gate 1A migration installs
// dormant schema with ZERO row-mutating DML, and the Gate 1B migration performs ONLY the
// deterministic legacy backfill with no unrelated schema changes. They fail if a future edit
// reintroduces Gate 1B DML into Gate 1A (recombining the gates) or widens Gate 1B's scope.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATIONS = resolve(process.cwd(), "supabase/migrations");
const GATE_1A = "20260810180000_line_type_review_contract.sql";
const GATE_1B = "20260812090000_line_type_review_backfill.sql";

/** Strip SQL line comments so keywords inside `-- ...` prose don't trip the scanners. */
function sqlOnly(file: string): string {
  return readFileSync(resolve(MIGRATIONS, file), "utf8")
    .split(/\r?\n/)
    .map((line) => line.replace(/--.*$/, ""))
    .join("\n");
}

const DML = /\b(insert|update|delete|merge)\b/i;
const SCHEMA_DDL = /\b(create|alter|drop)\b/i;

describe("line_type migration gate split (DOC-0331)", () => {
  it("Gate 1A contains additive DDL and ZERO row-mutating DML", () => {
    const sql = sqlOnly(GATE_1A);
    expect(sql).toMatch(/add column if not exists line_type_review_status/i);
    expect(sql).toMatch(/add constraint transcript_utterances_line_type_review_status_check/i);
    // The invariant: no INSERT/UPDATE/DELETE/MERGE anywhere in the executable SQL.
    expect(DML.test(sql)).toBe(false);
  });

  it("Gate 1B contains ONLY the deterministic backfill and no schema changes", () => {
    const sql = sqlOnly(GATE_1B);
    const updates = sql.match(/\bupdate\b/gi) ?? [];
    expect(updates).toHaveLength(1); // exactly one statement, the backfill
    expect(sql).toMatch(/update\s+public\.transcript_utterances/i);
    expect(sql).toMatch(/set\s+line_type_review_status\s*=\s*'OVERRIDDEN'/i);
    expect(sql).toMatch(/where\s+manually_reassigned\s*=\s*true/i);
    // Idempotency guard must be present so re-running changes zero additional rows.
    expect(sql).toMatch(/line_type_review_status\s*=\s*'UNREVIEWED'/i);
    // No unrelated schema changes, no other DML verbs.
    expect(SCHEMA_DDL.test(sql)).toBe(false);
    expect(/\b(insert|delete|merge)\b/i.test(sql)).toBe(false);
    // Never mutates line_type itself — only the review-status column.
    expect(/set\s+line_type\s*=/i.test(sql)).toBe(false);
  });

  it("Gate 1B is ordered strictly after Gate 1A", () => {
    const ts = (name: string) => Number(name.slice(0, 14));
    expect(ts(GATE_1B)).toBeGreaterThan(ts(GATE_1A));
  });

  it("both migrations operate on the same table/column (consistent responsibility)", () => {
    expect(sqlOnly(GATE_1A)).toMatch(/transcript_utterances/i);
    expect(sqlOnly(GATE_1B)).toMatch(/transcript_utterances/i);
  });
});

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/20260722020816_enforce_certification_lock.sql",
    import.meta.url,
  ),
  "utf8",
);

const payloadMigration = readFileSync(
  new URL(
    "../../supabase/migrations/20260722022713_preserve_certification_payload.sql",
    import.meta.url,
  ),
  "utf8",
);


const atomicSaveMigration = readFileSync(
  new URL(
    "../../supabase/migrations/20260722024834_atomic_case_certification_save.sql",
    import.meta.url,
  ),
  "utf8",
);
describe("certification database lock", () => {
  it("makes a persisted certification immutable", () => {
    expect(migration).toContain("case_certifications_reject_unlock");
    expect(migration).toContain("before update or delete on public.case_certifications");
    expect(migration).toContain("certified transcript cannot be reopened without an audited transition");
  });

  it("prevents stale case payloads from clearing certification", () => {
    expect(migration).toContain("cases_preserve_certification_lock");
    expect(migration).toContain("{certification,certification_date}");
  });

  it("requires embedded certification data to match the canonical row", () => {
    expect(payloadMigration).toContain("locked_certification public.case_certifications%rowtype");
    expect(payloadMigration).toContain("certification_statement");
    expect(payloadMigration).toContain("incoming_certification -> 'checklist'");
    expect(payloadMigration).toContain("certified case payload must match the immutable certification record");
  });

  it.each([
    "transcripts",
    "transcript_speakers",
    "transcript_utterances",
    "transcript_words",
    "transcript_audit_log",
    "transcript_review_state",
    "transcript_suggestions",
    "speaker_resolution_current",
  ])("blocks mutation of %s after certification", (table) => {
    expect(migration).toContain(`${table}_reject_certified_mutation`);
  });

  it("persists the case payload and canonical certification in one transaction", () => {
    expect(atomicSaveMigration).toContain("save_case_with_certification");
    expect(atomicSaveMigration).toContain("insert into public.case_certifications");
    expect(atomicSaveMigration).toContain("insert into public.cases");
    expect(atomicSaveMigration).toContain("grant execute on function");
  });
});

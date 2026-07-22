import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/20260722014045_enforce_certification_lock.sql",
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
});

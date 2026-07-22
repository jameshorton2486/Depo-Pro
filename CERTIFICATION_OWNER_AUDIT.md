# Certification Owner Audit

## Scope

- Pull request: #4 — Certification Mutation Lock
- Owner: Certification
- Base: `origin/feature/stage3-workspace-core`
- Evidence date: 2026-07-21 (America/Chicago) / 2026-07-22 UTC

## Ownership

Certification owns:

- certification lifecycle and readiness;
- certification persistence and lock state;
- mutation authorization after certification;
- export authorization based on persisted certification.

Certification observes checklist completion and persisted browser status. Checklist readiness does not certify a transcript.

Certification does not own compiler semantics, geometry, rendering, editorial normalization, the export contract, formatter behavior, or Stage S measurement.

## Enforcement Model

Authenticated editor mutation routes check the persisted certification row before dispatch. A certified transcript receives HTTP 409, preserving a clear user-facing failure contract.

PostgreSQL independently enforces data integrity for stale clients, direct database writes, bulk operations, queued workers, and background AI work. These paths are rejected by database triggers using SQLSTATE `23514`; they are not required to express the rejection as HTTP 409.

The database boundary is authoritative. The HTTP boundary is an earlier user-experience guard.

## Protected Mutation Paths

The editor API guards:

- transcript working-text updates;
- review-state updates;
- speaker updates and additions;
- suggestion resolution;
- individual and bulk AI-suggestion actions;
- forced AI review dispatch.

Database triggers protect:

- `transcripts`;
- `transcript_speakers`;
- `transcript_utterances`;
- `transcript_words`;
- `transcript_audit_log`;
- `transcript_review_state`;
- `transcript_suggestions`;
- `speaker_resolution_current`.

The persisted certification row cannot be cleared, changed, or deleted after `certification_date` becomes non-null. A stale case payload cannot remove the persisted certification date. No implicit reopen path exists; a future reopen operation requires a separately authorized and audited transition.

## Export and Browser Authorization

- Checklist completion without `certification_date` does not permit TXT or JSON export.
- A persisted non-null `certification_date` permits the certified export flow.
- Case Browser certification status is derived from the persisted certification date, not checklist readiness or an incomplete certification row.

## Production Migration Evidence

- Supabase project: `Depo-Pro`
- Project reference: `lqxiuwlwzkofdfitxuqe`
- Region: `us-west-2`
- PostgreSQL: 17.6
- Repository migration: `20260722020816_enforce_certification_lock.sql`
- Remote migration: `20260722020816_enforce_certification_lock`
- Execution timestamp: 2026-07-22 02:08:16 UTC
- Execution result: successful

Catalog verification found ten expected triggers: two certification/case lock triggers and eight transcript mutation triggers.

A transactionally rolled-back synthetic verification established:

| Verification | Result |
| --- | --- |
| Transcript mutation after certification | Rejected |
| Clearing `certification_date` | Rejected |
| Stale case payload removing certification | Rejected |
| Synthetic rows retained | 0 |

The synthetic transaction used fabricated identifiers and content. It did not modify client transcript data.

Supabase security and performance advisors were run after migration. They reported existing project-level warnings and informational findings; no finding identified the new certification trigger functions, which use `SECURITY INVOKER` and a fixed empty `search_path`.

## Verification Gates

- Focused certification and database-lock regressions: passed.
- Full suite: 112 files, 709 tests passed.
- Typecheck: passed.
- Lint: passed.
- Production build: passed.
- `git diff --check`: passed.
- GitHub Verify: passed.
- Cursor Bugbot: passed.

## Conclusion

Certification is the sole owner of the durable certification transition and post-certification mutation authorization. The client, API, worker, and database enforcement layers agree on the persisted certification date. PR #4 satisfies the Certification Mutation Lock acceptance boundary without changing compiler, geometry, rendering, editorial, formatter, export-contract, or Stage S behavior.

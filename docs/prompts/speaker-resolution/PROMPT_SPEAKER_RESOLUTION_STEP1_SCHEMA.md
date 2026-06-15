# Codex Task — STEP 1: speaker-resolution overlay schema (additive, no behavior change)

**Mode: IMPLEMENTATION. One commit. Audit-first. BETA_FREEZE — schema exception explicitly
authorized for THIS task (the two new overlay tables only).**

This is Step 1 of the frozen `SPEAKER_RESOLUTION_ARCHITECTURE_DECISION`. It adds the overlay
tables ONLY. Nothing reads or writes them yet. With this commit applied, app behavior is
**completely unchanged** — it is pure additive schema plus types.

Frozen principles this implements:
- Raw Deepgram output (incl. `transcript_speakers`) is immutable; humans write overlays.
- Dedicated overlay tables, not a column on a raw table.
- Alias model (multiple raw labels → one participant); no merge.

---

## Task 0 — Audit first (read-only; report before writing the migration)

Report, with file:line:

1. **Migration conventions.** Examine existing migrations in `supabase/migrations/` (e.g. the
   core schema `20260603210000_create_core_schema.sql`, the case-files and owner-scoping
   migrations). Report: naming convention (timestamp prefix format), how tables are created,
   how RLS/owner-scoping is applied to new tables, whether `transcript_audit_log`'s
   append-only pattern (select+insert, no update/delete) is enforced via policy or trigger,
   and how `updated_at` triggers are attached. The new tables must match these conventions.
2. **The raw keys to reference.** Confirm the exact columns the overlay will key on:
   `transcript_speakers` primary key / `speaker_id`, and the `speaker_index` column on
   `transcript_speakers` / `transcript_utterances` / `transcript_words`. Report their types so
   the overlay foreign keys/columns match exactly.
3. **The participant target.** The decision references `participant_id`. Report whether a
   transcript-linked participant table exists yet, or whether participants currently live only
   in the case record model (`src/types/case.ts`). **If there is no relational participant
   table for the overlay to FK to**, report that — for Step 1 we will store `participant_id`
   as a stable identifier column WITHOUT a hard FK constraint yet (the participant-linkage
   table is a later step), OR follow whatever the audit shows is the existing pattern. Do not
   invent a participant table in this step; just report what exists so the column is typed
   correctly and we decide FK-or-not deliberately.
4. **Owner-scoping.** Since the project is owner-scoped under RLS, report how the new overlay
   tables should carry `owner_user_id` (or equivalent) to match the existing owner-scoped RLS
   pattern, so they're consistent from creation.

**Stop and report Task 0 findings.** Then write the migration to match reality. If anything
about the participant target or owner-scoping is ambiguous, surface it rather than guessing.

---

## Task 1 — Add the migration (additive, non-destructive)

Create ONE new migration file (matching the convention from Task 0) that creates two tables:

**`speaker_resolution_current`** — the live resolution (one row per resolved raw speaker):
- `transcript_id` (FK to transcripts, type per Task 0)
- `raw_speaker_index` (and/or `raw_speaker_id` — whichever the audit shows is the stable raw
  key; include both if both are needed to address a raw speaker unambiguously)
- `participant_id` (stable identifier; FK only if a participant table exists per Task 0)
- `resolved_role` (nullable)
- `resolved_label` (nullable)
- `resolved_by`
- `resolved_at` (default now())
- `owner_user_id` per the owner-scoping pattern
- a uniqueness constraint ensuring one CURRENT resolution per (transcript, raw speaker key)

**`speaker_resolution_history`** — append-only supersession record:
- `resolution_id` (PK)
- `transcript_id`
- `raw_speaker_index` / `raw_speaker_id` (matching current)
- `participant_id`
- `resolved_role`
- `resolved_label`
- `resolved_by`
- `resolved_at`
- `supersedes_resolution_id` (nullable, self-reference)
- `owner_user_id`

Requirements:
- **Apply owner-scoped RLS** to both tables matching the existing pattern from Task 0.
- **Make `speaker_resolution_history` append-only** (select + insert; no update/delete) the
  same way `transcript_audit_log` is enforced.
- **Additive only** — do NOT alter, drop, or modify any existing table, column, trigger, or
  policy. Do NOT touch raw tables. Do NOT migrate any data.
- Attach an `updated_at` trigger to `speaker_resolution_current` only if that matches the
  convention (history is append-only, so it should not need one).

## Task 2 — Types (no behavior change)

- Add TypeScript types for the two new tables in the appropriate types location (per Task 0's
  read of where DB types live). Do not wire them into any read/write path — types only.
- If the repo has a generated-types step for Supabase, follow it; otherwise add hand-written
  types matching the existing style. Note which you did.
- Do NOT add any service function, query, UI, or writer that uses these tables. That is Step 2+.

## Task 3 — Tests

- If the repo tests migrations or has a schema/type test, add a minimal check that the new
  types exist and are shaped correctly. If there's no migration-test harness, state that and
  rely on typecheck. Do not fabricate a test framework.

---

## Verification gate (report all — full block)
- `git rev-parse HEAD` before/after (one new commit). Include both.
- `git status --porcelain` after commit. Include it.
- `npm run typecheck` passing tail.
- `npm test` before/after counts (state both totals; capture baseline from a temp checkout if
  needed).
- Files changed (name everything; expected: one new migration file, the types file, maybe a
  type test).
- One-paragraph note confirming: **purely additive** — no existing table/column/trigger/policy
  altered, no raw table touched, no data migrated, no read/write path wired to the new tables;
  app behavior with this commit is unchanged; owner-scoped RLS applied to both tables; history
  table is append-only. State the participant_id FK decision (FK to existing table, or bare
  identifier column) and why, per Task 0.

## Commit

One commit. Suggested message:

```
feat(schema): add speaker-resolution overlay tables (additive, dark)

Step 1 of the speaker-resolution overlay architecture. Adds
speaker_resolution_current and append-only speaker_resolution_history with
owner-scoped RLS, matching existing migration conventions. Nothing reads or
writes them yet — purely additive, app behavior unchanged. Raw tables
untouched. Implements the dedicated-overlay-table decision (alias model);
the resolver, normalization, reassignment migration, and downstream readers
follow in later steps.
```

## Do NOT
- Do NOT alter, drop, or modify any existing table, column, trigger, or policy.
- Do NOT touch raw tables (`transcripts`, `transcript_speakers`, `transcript_utterances`,
  `transcript_words`).
- Do NOT migrate or backfill any data.
- Do NOT wire the new tables into any read or write path — schema + types only.
- Do NOT invent a participant table; report what exists and type `participant_id` accordingly.
- One concern, one commit. Include the full verification block.
```

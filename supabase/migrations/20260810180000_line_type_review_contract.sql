-- DOC-0325 line_type migration — Wave 1 (schema scaffolding). GATE 1A: strictly additive
-- dormant schema/DDL only. The deterministic legacy-state backfill that used to live here was
-- split out to a separate migration so Gate 1A (schema) and Gate 1B (data) can be authorized
-- and applied independently per DOC-0331 — see 20260812090000_line_type_review_backfill.sql.
-- NOT applied to production by this local implementation: applying is a Human Gate (DOC-0331
-- Gate 1A). This file contains ZERO row-mutating DML.
--
-- Adds the reviewed-structure contract on transcript_utterances so that one persisted,
-- reviewed structural authority can be shared by Workspace, UFM, certification and every
-- deliverable (the DOC-0325 / D7 invariant: "the reporter certifies exactly what she reviewed").
--
--   line_type               : canonical persisted structural authority (already added in
--                             20260627220500; here we only add the enum guard).
--   line_type_confidence    : structural-proposal confidence in [0,1].
--   line_type_reason        : short evidence string for the proposal (e.g. "role=WITNESS -> A").
--   line_type_review_status : human review state (UNREVIEWED | CONFIRMED | OVERRIDDEN).
--
-- ai_suggested_line_type (added in 20260627220500) is treated as the structural *proposal*.
-- It is deliberately NOT renamed to proposed_line_type: the deployed ai-review function writes
-- that column (supabase/functions/ai-review/index.ts), so a physical rename would break it until
-- redeploy. DOC-0325 §13 explicitly permits "rename or alias"; we alias.
--
-- Value space for line_type is the code-consistent short-code set (Q|A|SP|PN|HEADER|UNKNOWN),
-- matching src/lib/transcript/structuredTranscript.ts normalizePersistedLineType and the reader
-- in src/lib/export/exportAdapter.ts. This RECONCILES a plan-vs-code discrepancy: DOC-0325 §1
-- listed long names (COLLOQUY|PARENTHETICAL|SECTION_HEADER). Using long names would break the
-- existing persisted reader; the short codes are the real contract downstream binds to.

alter table public.transcript_utterances
  add column if not exists line_type_confidence real default null,
  add column if not exists line_type_reason text default null,
  add column if not exists line_type_review_status text not null default 'UNREVIEWED';

-- Review-state enum guard.
alter table public.transcript_utterances
  drop constraint if exists transcript_utterances_line_type_review_status_check;
alter table public.transcript_utterances
  add constraint transcript_utterances_line_type_review_status_check
  check (line_type_review_status in ('UNREVIEWED', 'CONFIRMED', 'OVERRIDDEN'));

-- line_type enum guard. Existing column; add NOT VALID first to avoid holding ACCESS EXCLUSIVE
-- for a full-table scan on apply, then validate under the lighter lock. NULL and the UNKNOWN
-- sentinel remain permitted (existing corpus is null/UNKNOWN only — DOC-0320).
alter table public.transcript_utterances
  drop constraint if exists transcript_utterances_line_type_check;
alter table public.transcript_utterances
  add constraint transcript_utterances_line_type_check
  check (line_type is null or line_type in ('Q', 'A', 'SP', 'PN', 'HEADER', 'UNKNOWN'))
  not valid;
alter table public.transcript_utterances
  validate constraint transcript_utterances_line_type_check;

-- GATE 1B (deterministic legacy-state backfill of line_type_review_status from
-- manually_reassigned) has been moved to 20260812090000_line_type_review_backfill.sql so it
-- carries its own Human authorization. This Gate 1A migration installs dormant schema only and
-- performs NO row mutation.

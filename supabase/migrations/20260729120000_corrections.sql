-- =============================================================================
-- ATIA §4.8 — CorrectionObject persistence (D8.2 / D8.3)
--
-- The CorrectionObject is the atomic unit of transcript intelligence: one
-- proposed change against the immutable canonical Deepgram baseline, produced by
-- a deterministic rule or an AI specialty/bridge prompt, reviewed by a human
-- court reporter. Schema of the JSONB payloads: schema/correction_object.schema.json.
--
-- Keys follow THIS repo's convention (text business keys transcript_id/case_id),
-- NOT the ATIA sample SQL's uuid `id` references. owner_user_id + RLS mirror the
-- owner-scoped pattern established in 20260606180508_owner_scoped_rls_policies.sql.
-- Additive and reversible: no existing table or row is touched.
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- corrections — one row per proposed change. `review` is a state machine
-- updated in place; every transition is also appended to correction_decisions.
-- ---------------------------------------------------------------------------
-- ---------------------------------------------------------------------------
-- correction_runs — one row per AI Review invocation. Cost accounting lives
-- HERE, not on each correction: a single bridge/specialty call emits many
-- corrections but has one token/latency measurement, so per-correction token
-- columns would overcount. context_hash makes a run replayable.
-- ---------------------------------------------------------------------------
create table if not exists public.correction_runs (
  id               uuid primary key default gen_random_uuid(),
  transcript_id    text not null references public.transcripts(transcript_id) on delete cascade,
  case_id          text not null references public.cases(case_id) on delete cascade,
  provider         text not null,
  model            text not null,
  prompt_version   text not null,
  context_hash     text not null,                    -- sha256:<hex> of the exact input
  tokens_used_in   integer not null default 0,
  tokens_used_out  integer not null default 0,
  latency_ms       integer not null default 0,
  correction_count integer not null default 0,       -- valid corrections persisted
  rejected_count   integer not null default 0,       -- schema-invalid, dropped
  owner_user_id    uuid not null default auth.uid(),
  created_at       timestamptz not null default now()
);

create index if not exists correction_runs_transcript_idx
  on public.correction_runs (transcript_id);
create index if not exists correction_runs_context_hash_idx
  on public.correction_runs (context_hash);

create table if not exists public.corrections (
  id                  text primary key,                                  -- corr_<ULID>
  run_id              uuid references public.correction_runs(id) on delete set null,
  transcript_id       text not null references public.transcripts(transcript_id) on delete cascade,
  case_id             text not null references public.cases(case_id) on delete cascade,
  specialty           text not null,
  prompt_version      text not null,
  -- Top-level, indexed copy of provenance.context_hash so replay/regression
  -- debugging is an index lookup, not a JSONB table scan.
  context_hash        text,
  location            jsonb not null,
  change              jsonb not null,
  reason              text not null,
  reason_kind         text not null,
  confidence          numeric(3,2) not null check (confidence >= 0 and confidence <= 1),
  confidence_source   text,
  provenance          jsonb not null,
  supporting_evidence jsonb,
  review              jsonb not null default '{"state":"pending"}'::jsonb,
  downstream          jsonb not null default '{"applied_to_working_transcript":false}'::jsonb,
  owner_user_id       uuid not null default auth.uid(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists corrections_transcript_idx
  on public.corrections (transcript_id);
create index if not exists corrections_case_idx
  on public.corrections (case_id);
create index if not exists corrections_context_hash_idx
  on public.corrections (context_hash);
-- Fast "pending corrections for this transcript" lookup (the workspace panel).
create index if not exists corrections_review_state_idx
  on public.corrections (transcript_id, (review ->> 'state'));

create trigger corrections_set_updated_at
  before update on public.corrections
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- correction_decisions — append-only audit of every state transition. This is
-- the feedback substrate the learning mechanisms read (ATIA §4.3): registry
-- promotion and dynamic few-shot both query accepted decisions per case.
-- ---------------------------------------------------------------------------
create table if not exists public.correction_decisions (
  id            uuid primary key default gen_random_uuid(),
  correction_id text not null references public.corrections(id) on delete cascade,
  transcript_id text not null references public.transcripts(transcript_id) on delete cascade,
  case_id       text not null references public.cases(case_id) on delete cascade,
  from_state    text not null,
  to_state      text not null,
  decided_by    uuid,
  decision_note text,
  final_value   jsonb,
  -- Decision CONTEXT — the prompt-tuning training substrate. Cheap to capture
  -- at decision time, impossible to reconstruct later. All nullable so a
  -- decision can be recorded even when the client doesn't supply telemetry.
  time_to_decide_ms      integer,   -- how long the card was on screen before the decision
  audio_played           boolean,   -- did the reporter play audio during review
  navigated_to_location  boolean,   -- did the reporter jump to the location in the transcript
  owner_user_id uuid not null default auth.uid(),
  decided_at    timestamptz not null default now()
);

create index if not exists correction_decisions_correction_idx
  on public.correction_decisions (correction_id);
create index if not exists correction_decisions_case_idx
  on public.correction_decisions (case_id, to_state);

-- ---------------------------------------------------------------------------
-- RLS — owner-scoped, mirroring the established pattern.
-- ---------------------------------------------------------------------------
alter table public.correction_runs enable row level security;
alter table public.corrections enable row level security;
alter table public.correction_decisions enable row level security;

create policy "correction_runs_select_owner" on public.correction_runs
  for select to authenticated
  using (owner_user_id = (select auth.uid()));
create policy "correction_runs_insert_owner" on public.correction_runs
  for insert to authenticated
  with check (owner_user_id = (select auth.uid()));

create policy "corrections_select_owner" on public.corrections
  for select to authenticated
  using (owner_user_id = (select auth.uid()));
create policy "corrections_insert_owner" on public.corrections
  for insert to authenticated
  with check (owner_user_id = (select auth.uid()));
create policy "corrections_update_owner" on public.corrections
  for update to authenticated
  using (owner_user_id = (select auth.uid()))
  with check (owner_user_id = (select auth.uid()));

create policy "correction_decisions_select_owner" on public.correction_decisions
  for select to authenticated
  using (owner_user_id = (select auth.uid()));
create policy "correction_decisions_insert_owner" on public.correction_decisions
  for insert to authenticated
  with check (owner_user_id = (select auth.uid()));

commit;

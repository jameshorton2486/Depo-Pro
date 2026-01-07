-- =============================================================================
-- AI QUALITY SCORING FOR TRANSCRIPTS
-- Applied: 2025-01-06
-- 
-- Measure AI usefulness, not blind trust
-- Track AI improvement over time
-- Detect hallucination risk
-- Prove AI compliance to clients
-- =============================================================================

-- =============================================================================
-- TRANSCRIPT AI SCORES TABLE
-- =============================================================================

create table if not exists transcript_ai_scores (
  id uuid primary key default gen_random_uuid(),
  transcript_id uuid not null references transcripts(id) on delete cascade,
  revision_id uuid references transcript_revisions(id) on delete set null,
  clarity_score int check (clarity_score between 1 and 5),
  accuracy_score int check (accuracy_score between 1 and 5),
  formatting_score int check (formatting_score between 1 and 5),
  overall_score numeric(3, 2) generated always as (
    (
      coalesce(clarity_score, 0) +
      coalesce(accuracy_score, 0) +
      coalesce(formatting_score, 0)
    ) / 3.0
  ) stored,
  notes text,
  scored_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists transcript_ai_scores_transcript_id_idx on transcript_ai_scores(transcript_id);
create index if not exists transcript_ai_scores_revision_id_idx on transcript_ai_scores(revision_id);
create index if not exists transcript_ai_scores_scored_by_idx on transcript_ai_scores(scored_by);
create index if not exists transcript_ai_scores_overall_score_idx on transcript_ai_scores(overall_score);
create index if not exists transcript_ai_scores_created_at_idx on transcript_ai_scores(created_at);

-- =============================================================================
-- RLS POLICIES FOR TRANSCRIPT AI SCORES
-- =============================================================================

alter table transcript_ai_scores enable row level security;

-- Users can read scores for transcripts they can access
drop policy if exists "read own transcript ai scores" on transcript_ai_scores;
drop policy if exists "admins read all transcript ai scores" on transcript_ai_scores;

create policy "read own transcript ai scores"
on transcript_ai_scores for select
using (
  exists (
    select 1
    from transcripts
    where transcripts.id = transcript_ai_scores.transcript_id
      and (
        transcripts.created_by = auth.uid()
        or transcripts.firm_id = (
          select firm_id from profiles where id = auth.uid()
        )
        or exists (
          select 1
          from cases
          where cases.id = transcripts.case_id
            and cases.owner_id = auth.uid()
        )
      )
  )
);

create policy "admins read all transcript ai scores"
on transcript_ai_scores for select
using (is_admin());

-- Users can create scores for transcripts they can access
drop policy if exists "create own transcript ai scores" on transcript_ai_scores;

create policy "create own transcript ai scores"
on transcript_ai_scores for insert
with check (
  scored_by = auth.uid()
  and exists (
    select 1
    from transcripts
    where transcripts.id = transcript_ai_scores.transcript_id
      and (
        transcripts.created_by = auth.uid()
        or transcripts.firm_id = (
          select firm_id from profiles where id = auth.uid()
        )
        or exists (
          select 1
          from cases
          where cases.id = transcripts.case_id
            and cases.owner_id = auth.uid()
        )
      )
  )
);

-- Users can update their own scores
drop policy if exists "update own transcript ai scores" on transcript_ai_scores;

create policy "update own transcript ai scores"
on transcript_ai_scores for update
using (scored_by = auth.uid());

-- =============================================================================
-- AI QUALITY METRICS VIEW
-- =============================================================================

create or replace view admin_ai_quality_metrics as
select
  date_trunc('day', tas.created_at) as day,
  avg(tas.clarity_score) as avg_clarity_score,
  avg(tas.accuracy_score) as avg_accuracy_score,
  avg(tas.formatting_score) as avg_formatting_score,
  avg(tas.overall_score) as avg_overall_score,
  count(*) as total_scores,
  count(*) filter (where tas.overall_score >= 4.0) as high_quality_count,
  count(*) filter (where tas.overall_score < 3.0) as low_quality_count
from transcript_ai_scores tas
group by day
order by day desc;

-- =============================================================================
-- NOTES
-- =============================================================================

-- Scores help:
-- - Track AI improvement over time
-- - Detect hallucination risk
-- - Prove AI compliance to clients
-- - Measure AI usefulness

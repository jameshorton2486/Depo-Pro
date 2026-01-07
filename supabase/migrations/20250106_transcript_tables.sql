-- =============================================================================
-- TRANSCRIPT TABLES & RLS POLICIES
-- Applied: 2025-01-06
-- 
-- Transcripts and revisions with AI support
-- All changes are auditable and reversible
-- =============================================================================

-- =============================================================================
-- TRANSCRIPTS TABLE
-- =============================================================================

create table if not exists transcripts (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  job_id uuid references jobs(id) on delete set null,
  content text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  version integer not null default 1
);

create index if not exists transcripts_case_id_idx on transcripts(case_id);
create index if not exists transcripts_job_id_idx on transcripts(job_id);
create index if not exists transcripts_created_by_idx on transcripts(created_by);
create index if not exists transcripts_created_at_idx on transcripts(created_at);

-- =============================================================================
-- TRANSCRIPT_REVISIONS TABLE
-- =============================================================================

create table if not exists transcript_revisions (
  id uuid primary key default gen_random_uuid(),
  transcript_id uuid not null references transcripts(id) on delete cascade,
  revised_content text not null,
  source text not null check (source in ('ai', 'user')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  metadata jsonb,
  -- Track what changed
  diff_summary text,
  -- Whether this revision was applied
  applied boolean default false,
  applied_at timestamptz,
  applied_by uuid references auth.users(id) on delete set null
);

create index if not exists transcript_revisions_transcript_id_idx on transcript_revisions(transcript_id);
create index if not exists transcript_revisions_created_by_idx on transcript_revisions(created_by);
create index if not exists transcript_revisions_source_idx on transcript_revisions(source);
create index if not exists transcript_revisions_applied_idx on transcript_revisions(applied);
create index if not exists transcript_revisions_created_at_idx on transcript_revisions(created_at);

-- =============================================================================
-- RLS POLICIES FOR TRANSCRIPTS
-- =============================================================================

alter table transcripts enable row level security;

-- Users can read transcripts for their own cases/jobs
drop policy if exists "read own transcripts" on transcripts;
drop policy if exists "admins read all transcripts" on transcripts;

create policy "read own transcripts"
on transcripts for select
using (
  exists (
    select 1
    from cases
    where cases.id = transcripts.case_id
      and cases.owner_id = auth.uid()
  )
  or exists (
    select 1
    from jobs
    where jobs.id = transcripts.job_id
      and jobs.created_by_id = auth.uid()
  )
  or transcripts.created_by = auth.uid()
);

create policy "admins read all transcripts"
on transcripts for select
using (is_admin());

-- Users can create transcripts for their own cases/jobs
drop policy if exists "create own transcripts" on transcripts;

create policy "create own transcripts"
on transcripts for insert
with check (
  exists (
    select 1
    from cases
    where cases.id = transcripts.case_id
      and cases.owner_id = auth.uid()
  )
  or exists (
    select 1
    from jobs
    where jobs.id = transcripts.job_id
      and jobs.created_by_id = auth.uid()
  )
  or transcripts.created_by = auth.uid()
);

-- Users can update their own transcripts
drop policy if exists "update own transcripts" on transcripts;
drop policy if exists "admins update transcripts" on transcripts;

create policy "update own transcripts"
on transcripts for update
using (
  created_by = auth.uid()
  or exists (
    select 1
    from cases
    where cases.id = transcripts.case_id
      and cases.owner_id = auth.uid()
  )
);

create policy "admins update transcripts"
on transcripts for update
using (is_admin());

-- =============================================================================
-- RLS POLICIES FOR TRANSCRIPT_REVISIONS
-- =============================================================================

alter table transcript_revisions enable row level security;

-- Users can read revisions for their own transcripts
drop policy if exists "read own transcript revisions" on transcript_revisions;
drop policy if exists "admins read all transcript revisions" on transcript_revisions;

create policy "read own transcript revisions"
on transcript_revisions for select
using (
  exists (
    select 1
    from transcripts
    where transcripts.id = transcript_revisions.transcript_id
      and (
        transcripts.created_by = auth.uid()
        or exists (
          select 1
          from cases
          where cases.id = transcripts.case_id
            and cases.owner_id = auth.uid()
        )
      )
  )
);

create policy "admins read all transcript revisions"
on transcript_revisions for select
using (is_admin());

-- Users can create revisions for their own transcripts
drop policy if exists "create own transcript revisions" on transcript_revisions;

create policy "create own transcript revisions"
on transcript_revisions for insert
with check (
  created_by = auth.uid()
  and exists (
    select 1
    from transcripts
    where transcripts.id = transcript_revisions.transcript_id
      and (
        transcripts.created_by = auth.uid()
        or exists (
          select 1
          from cases
          where cases.id = transcripts.case_id
            and cases.owner_id = auth.uid()
        )
      )
  )
);

-- Users can update their own revisions (to mark as applied)
drop policy if exists "update own transcript revisions" on transcript_revisions;

create policy "update own transcript revisions"
on transcript_revisions for update
using (created_by = auth.uid() OR applied_by = auth.uid());

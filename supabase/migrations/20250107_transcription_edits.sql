-- =============================================================================
-- TRANSCRIPTION EDITS TABLE
-- Applied: 2025-01-07
-- 
-- Tracks individual word-level edits to transcriptions
-- Used for flagged words review and correction tracking
-- =============================================================================

-- =============================================================================
-- TRANSCRIPTION_EDITS TABLE
-- =============================================================================

create table if not exists transcription_edits (
  id uuid primary key default gen_random_uuid(),
  transcription_id uuid not null references transcripts(id) on delete cascade,
  word_index integer not null,
  edited_text text,
  edit_type text not null check (edit_type in ('correction', 'accept', 'reject', 'flag')),
  editor_id uuid references auth.users(id) on delete set null,
  editor_role text,
  original_text text,
  created_at timestamptz default now(),
  -- Ensure one edit per word_index per transcription
  unique(transcription_id, word_index)
);

create index if not exists transcription_edits_transcription_id_idx on transcription_edits(transcription_id);
create index if not exists transcription_edits_word_index_idx on transcription_edits(word_index);
create index if not exists transcription_edits_editor_id_idx on transcription_edits(editor_id);
create index if not exists transcription_edits_edit_type_idx on transcription_edits(edit_type);
create index if not exists transcription_edits_created_at_idx on transcription_edits(created_at);

-- =============================================================================
-- RLS POLICIES FOR TRANSCRIPTION_EDITS
-- =============================================================================

alter table transcription_edits enable row level security;

-- Users can read edits for their own transcriptions
drop policy if exists "read own transcription edits" on transcription_edits;
drop policy if exists "admins read all transcription edits" on transcription_edits;

create policy "read own transcription edits"
on transcription_edits for select
using (
  exists (
    select 1
    from transcripts
    where transcripts.id = transcription_edits.transcription_id
      and (
        transcripts.created_by = auth.uid()
        or exists (
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
      )
  )
);

create policy "admins read all transcription edits"
on transcription_edits for select
using (is_admin());

-- Users can create edits for their own transcriptions
drop policy if exists "create own transcription edits" on transcription_edits;

create policy "create own transcription edits"
on transcription_edits for insert
with check (
  editor_id = auth.uid()
  and exists (
    select 1
    from transcripts
    where transcripts.id = transcription_edits.transcription_id
      and (
        transcripts.created_by = auth.uid()
        or exists (
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
      )
  )
);

-- Users can update their own edits
drop policy if exists "update own transcription edits" on transcription_edits;
drop policy if exists "admins update transcription edits" on transcription_edits;

create policy "update own transcription edits"
on transcription_edits for update
using (editor_id = auth.uid());

create policy "admins update transcription edits"
on transcription_edits for update
using (is_admin());

-- Users can delete their own edits
drop policy if exists "delete own transcription edits" on transcription_edits;
drop policy if exists "admins delete transcription edits" on transcription_edits;

create policy "delete own transcription edits"
on transcription_edits for delete
using (editor_id = auth.uid());

create policy "admins delete transcription edits"
on transcription_edits for delete
using (is_admin());

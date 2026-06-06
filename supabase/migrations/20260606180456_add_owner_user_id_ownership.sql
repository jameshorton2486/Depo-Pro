-- =============================================================================
-- Auth / RLS hardening — ownership columns
-- Adds owner_user_id to every application table and clears disposable fixture
-- rows first so the column can be strict not-null with auth.uid() defaults.
--
-- Phase 0 audit confirmed the linked project contains fixture / verification
-- data only. This migration intentionally deletes those rows rather than
-- backfilling a fake owner.
-- =============================================================================

begin;

delete from public.transcript_words;
delete from public.transcript_utterances;
delete from public.transcript_speakers;
delete from public.transcript_suggestions;
delete from public.transcript_review_state;
delete from public.transcript_audit_log;
delete from public.case_exhibits;
delete from public.case_certifications;
delete from public.exports;
delete from public.case_audio;
delete from public.case_files;
delete from public.transcripts;
delete from public.field_provenance;
delete from public.contacts;
delete from public.cases;

alter table if exists public.contacts
  add column if not exists owner_user_id uuid references auth.users(id);
alter table if exists public.contacts
  alter column owner_user_id set default auth.uid(),
  alter column owner_user_id set not null;
create index if not exists contacts_owner_idx on public.contacts (owner_user_id);

alter table if exists public.field_provenance
  add column if not exists owner_user_id uuid references auth.users(id);
alter table if exists public.field_provenance
  alter column owner_user_id set default auth.uid(),
  alter column owner_user_id set not null;
create index if not exists field_provenance_owner_idx on public.field_provenance (owner_user_id);

alter table if exists public.cases
  add column if not exists owner_user_id uuid references auth.users(id);
alter table if exists public.cases
  alter column owner_user_id set default auth.uid(),
  alter column owner_user_id set not null;
create index if not exists cases_owner_idx on public.cases (owner_user_id);

alter table if exists public.case_audio
  add column if not exists owner_user_id uuid references auth.users(id);
alter table if exists public.case_audio
  alter column owner_user_id set default auth.uid(),
  alter column owner_user_id set not null;
create index if not exists case_audio_owner_idx on public.case_audio (owner_user_id);

alter table if exists public.case_files
  add column if not exists owner_user_id uuid references auth.users(id);
alter table if exists public.case_files
  alter column owner_user_id set default auth.uid(),
  alter column owner_user_id set not null;
create index if not exists case_files_owner_idx on public.case_files (owner_user_id);

alter table if exists public.transcripts
  add column if not exists owner_user_id uuid references auth.users(id);
alter table if exists public.transcripts
  alter column owner_user_id set default auth.uid(),
  alter column owner_user_id set not null;
create index if not exists transcripts_owner_idx on public.transcripts (owner_user_id);

alter table if exists public.transcript_speakers
  add column if not exists owner_user_id uuid references auth.users(id);
alter table if exists public.transcript_speakers
  alter column owner_user_id set default auth.uid(),
  alter column owner_user_id set not null;
create index if not exists transcript_speakers_owner_idx on public.transcript_speakers (owner_user_id);

alter table if exists public.transcript_utterances
  add column if not exists owner_user_id uuid references auth.users(id);
alter table if exists public.transcript_utterances
  alter column owner_user_id set default auth.uid(),
  alter column owner_user_id set not null;
create index if not exists transcript_utterances_owner_idx on public.transcript_utterances (owner_user_id);

alter table if exists public.transcript_words
  add column if not exists owner_user_id uuid references auth.users(id);
alter table if exists public.transcript_words
  alter column owner_user_id set default auth.uid(),
  alter column owner_user_id set not null;
create index if not exists transcript_words_owner_idx on public.transcript_words (owner_user_id);

alter table if exists public.transcript_audit_log
  add column if not exists owner_user_id uuid references auth.users(id);
alter table if exists public.transcript_audit_log
  alter column owner_user_id set default auth.uid(),
  alter column owner_user_id set not null;
create index if not exists transcript_audit_log_owner_idx on public.transcript_audit_log (owner_user_id);

alter table if exists public.transcript_review_state
  add column if not exists owner_user_id uuid references auth.users(id);
alter table if exists public.transcript_review_state
  alter column owner_user_id set default auth.uid(),
  alter column owner_user_id set not null;
create index if not exists transcript_review_state_owner_idx on public.transcript_review_state (owner_user_id);

alter table if exists public.transcript_suggestions
  add column if not exists owner_user_id uuid references auth.users(id);
alter table if exists public.transcript_suggestions
  alter column owner_user_id set default auth.uid(),
  alter column owner_user_id set not null;
create index if not exists transcript_suggestions_owner_idx on public.transcript_suggestions (owner_user_id);

alter table if exists public.case_exhibits
  add column if not exists owner_user_id uuid references auth.users(id);
alter table if exists public.case_exhibits
  alter column owner_user_id set default auth.uid(),
  alter column owner_user_id set not null;
create index if not exists case_exhibits_owner_idx on public.case_exhibits (owner_user_id);

alter table if exists public.case_certifications
  add column if not exists owner_user_id uuid references auth.users(id);
alter table if exists public.case_certifications
  alter column owner_user_id set default auth.uid(),
  alter column owner_user_id set not null;
create index if not exists case_certifications_owner_idx on public.case_certifications (owner_user_id);

alter table if exists public.exports
  add column if not exists owner_user_id uuid references auth.users(id);
alter table if exists public.exports
  alter column owner_user_id set default auth.uid(),
  alter column owner_user_id set not null;
create index if not exists exports_owner_idx on public.exports (owner_user_id);

commit;

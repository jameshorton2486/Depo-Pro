-- =============================================================================
-- Auth / RLS hardening — owner-scoped policies
-- Replaces permissive authenticated policies with owner_user_id-scoped policies.
-- Uses (select auth.uid()) everywhere for initPlan caching.
-- =============================================================================

begin;

drop policy if exists "Authenticated users can read contacts" on public.contacts;
drop policy if exists "Authenticated users can insert contacts" on public.contacts;
drop policy if exists "Authenticated users can update contacts" on public.contacts;

create policy "contacts_select_owner" on public.contacts
  for select to authenticated
  using (owner_user_id = (select auth.uid()));
create policy "contacts_insert_owner" on public.contacts
  for insert to authenticated
  with check (owner_user_id = (select auth.uid()));
create policy "contacts_update_owner" on public.contacts
  for update to authenticated
  using (owner_user_id = (select auth.uid()))
  with check (owner_user_id = (select auth.uid()));

drop policy if exists "Authenticated users can read provenance" on public.field_provenance;
drop policy if exists "Authenticated users can insert provenance" on public.field_provenance;

create policy "field_provenance_select_owner" on public.field_provenance
  for select to authenticated
  using (owner_user_id = (select auth.uid()));
create policy "field_provenance_insert_owner" on public.field_provenance
  for insert to authenticated
  with check (owner_user_id = (select auth.uid()));

drop policy if exists "cases_select_authenticated" on public.cases;
drop policy if exists "cases_insert_authenticated" on public.cases;
drop policy if exists "cases_update_authenticated" on public.cases;

create policy "cases_select_owner" on public.cases
  for select to authenticated
  using (owner_user_id = (select auth.uid()));
create policy "cases_insert_owner" on public.cases
  for insert to authenticated
  with check (owner_user_id = (select auth.uid()));
create policy "cases_update_owner" on public.cases
  for update to authenticated
  using (owner_user_id = (select auth.uid()))
  with check (owner_user_id = (select auth.uid()));

drop policy if exists "case_audio_select_authenticated" on public.case_audio;
drop policy if exists "case_audio_insert_authenticated" on public.case_audio;
drop policy if exists "case_audio_update_authenticated" on public.case_audio;

create policy "case_audio_select_owner" on public.case_audio
  for select to authenticated
  using (owner_user_id = (select auth.uid()));
create policy "case_audio_insert_owner" on public.case_audio
  for insert to authenticated
  with check (owner_user_id = (select auth.uid()));
create policy "case_audio_update_owner" on public.case_audio
  for update to authenticated
  using (owner_user_id = (select auth.uid()))
  with check (owner_user_id = (select auth.uid()));

drop policy if exists "case_files_select_authenticated" on public.case_files;
drop policy if exists "case_files_insert_authenticated" on public.case_files;
drop policy if exists "case_files_update_authenticated" on public.case_files;

create policy "case_files_select_owner" on public.case_files
  for select to authenticated
  using (owner_user_id = (select auth.uid()));
create policy "case_files_insert_owner" on public.case_files
  for insert to authenticated
  with check (owner_user_id = (select auth.uid()));
create policy "case_files_update_owner" on public.case_files
  for update to authenticated
  using (owner_user_id = (select auth.uid()))
  with check (owner_user_id = (select auth.uid()));

drop policy if exists "transcripts_select_authenticated" on public.transcripts;
drop policy if exists "transcripts_insert_authenticated" on public.transcripts;
drop policy if exists "transcripts_update_authenticated" on public.transcripts;

create policy "transcripts_select_owner" on public.transcripts
  for select to authenticated
  using (owner_user_id = (select auth.uid()));
create policy "transcripts_insert_owner" on public.transcripts
  for insert to authenticated
  with check (owner_user_id = (select auth.uid()));
create policy "transcripts_update_owner" on public.transcripts
  for update to authenticated
  using (owner_user_id = (select auth.uid()))
  with check (owner_user_id = (select auth.uid()));

drop policy if exists "transcript_speakers_select_authenticated" on public.transcript_speakers;
drop policy if exists "transcript_speakers_insert_authenticated" on public.transcript_speakers;
drop policy if exists "transcript_speakers_update_authenticated" on public.transcript_speakers;
drop policy if exists "transcript_speakers_delete_incomplete_jobs" on public.transcript_speakers;

create policy "transcript_speakers_select_owner" on public.transcript_speakers
  for select to authenticated
  using (owner_user_id = (select auth.uid()));
create policy "transcript_speakers_insert_owner" on public.transcript_speakers
  for insert to authenticated
  with check (owner_user_id = (select auth.uid()));
create policy "transcript_speakers_update_owner" on public.transcript_speakers
  for update to authenticated
  using (owner_user_id = (select auth.uid()))
  with check (owner_user_id = (select auth.uid()));
create policy "transcript_speakers_delete_owner" on public.transcript_speakers
  for delete to authenticated
  using (owner_user_id = (select auth.uid()));

drop policy if exists "transcript_utterances_select_authenticated" on public.transcript_utterances;
drop policy if exists "transcript_utterances_insert_authenticated" on public.transcript_utterances;
drop policy if exists "transcript_utterances_update_authenticated" on public.transcript_utterances;
drop policy if exists "transcript_utterances_delete_incomplete_jobs" on public.transcript_utterances;

create policy "transcript_utterances_select_owner" on public.transcript_utterances
  for select to authenticated
  using (owner_user_id = (select auth.uid()));
create policy "transcript_utterances_insert_owner" on public.transcript_utterances
  for insert to authenticated
  with check (owner_user_id = (select auth.uid()));
create policy "transcript_utterances_update_owner" on public.transcript_utterances
  for update to authenticated
  using (owner_user_id = (select auth.uid()))
  with check (owner_user_id = (select auth.uid()));
create policy "transcript_utterances_delete_owner" on public.transcript_utterances
  for delete to authenticated
  using (owner_user_id = (select auth.uid()));

drop policy if exists "transcript_words_select_authenticated" on public.transcript_words;
drop policy if exists "transcript_words_insert_authenticated" on public.transcript_words;
drop policy if exists "transcript_words_update_authenticated" on public.transcript_words;
drop policy if exists "transcript_words_delete_incomplete_jobs" on public.transcript_words;

create policy "transcript_words_select_owner" on public.transcript_words
  for select to authenticated
  using (owner_user_id = (select auth.uid()));
create policy "transcript_words_insert_owner" on public.transcript_words
  for insert to authenticated
  with check (owner_user_id = (select auth.uid()));
create policy "transcript_words_update_owner" on public.transcript_words
  for update to authenticated
  using (owner_user_id = (select auth.uid()))
  with check (owner_user_id = (select auth.uid()));
create policy "transcript_words_delete_owner" on public.transcript_words
  for delete to authenticated
  using (owner_user_id = (select auth.uid()));

drop policy if exists "transcript_audit_log_select_authenticated" on public.transcript_audit_log;
drop policy if exists "transcript_audit_log_insert_authenticated" on public.transcript_audit_log;
drop policy if exists "transcript_audit_log_delete_incomplete_jobs" on public.transcript_audit_log;

create policy "transcript_audit_log_select_owner" on public.transcript_audit_log
  for select to authenticated
  using (owner_user_id = (select auth.uid()));
create policy "transcript_audit_log_insert_owner" on public.transcript_audit_log
  for insert to authenticated
  with check (owner_user_id = (select auth.uid()));

drop policy if exists "transcript_review_state_select_authenticated" on public.transcript_review_state;
drop policy if exists "transcript_review_state_insert_authenticated" on public.transcript_review_state;
drop policy if exists "transcript_review_state_update_authenticated" on public.transcript_review_state;

create policy "transcript_review_state_select_owner" on public.transcript_review_state
  for select to authenticated
  using (owner_user_id = (select auth.uid()));
create policy "transcript_review_state_insert_owner" on public.transcript_review_state
  for insert to authenticated
  with check (owner_user_id = (select auth.uid()));
create policy "transcript_review_state_update_owner" on public.transcript_review_state
  for update to authenticated
  using (owner_user_id = (select auth.uid()))
  with check (owner_user_id = (select auth.uid()));

drop policy if exists "transcript_suggestions_select_authenticated" on public.transcript_suggestions;
drop policy if exists "transcript_suggestions_insert_authenticated" on public.transcript_suggestions;
drop policy if exists "transcript_suggestions_update_authenticated" on public.transcript_suggestions;

create policy "transcript_suggestions_select_owner" on public.transcript_suggestions
  for select to authenticated
  using (owner_user_id = (select auth.uid()));
create policy "transcript_suggestions_insert_owner" on public.transcript_suggestions
  for insert to authenticated
  with check (owner_user_id = (select auth.uid()));
create policy "transcript_suggestions_update_owner" on public.transcript_suggestions
  for update to authenticated
  using (owner_user_id = (select auth.uid()))
  with check (owner_user_id = (select auth.uid()));

drop policy if exists "case_exhibits_select_authenticated" on public.case_exhibits;
drop policy if exists "case_exhibits_insert_authenticated" on public.case_exhibits;
drop policy if exists "case_exhibits_update_authenticated" on public.case_exhibits;

create policy "case_exhibits_select_owner" on public.case_exhibits
  for select to authenticated
  using (owner_user_id = (select auth.uid()));
create policy "case_exhibits_insert_owner" on public.case_exhibits
  for insert to authenticated
  with check (owner_user_id = (select auth.uid()));
create policy "case_exhibits_update_owner" on public.case_exhibits
  for update to authenticated
  using (owner_user_id = (select auth.uid()))
  with check (owner_user_id = (select auth.uid()));

drop policy if exists "case_certifications_select_authenticated" on public.case_certifications;
drop policy if exists "case_certifications_insert_authenticated" on public.case_certifications;
drop policy if exists "case_certifications_update_authenticated" on public.case_certifications;

create policy "case_certifications_select_owner" on public.case_certifications
  for select to authenticated
  using (owner_user_id = (select auth.uid()));
create policy "case_certifications_insert_owner" on public.case_certifications
  for insert to authenticated
  with check (owner_user_id = (select auth.uid()));
create policy "case_certifications_update_owner" on public.case_certifications
  for update to authenticated
  using (owner_user_id = (select auth.uid()))
  with check (owner_user_id = (select auth.uid()));

drop policy if exists "exports_select_authenticated" on public.exports;
drop policy if exists "exports_insert_authenticated" on public.exports;
drop policy if exists "exports_update_authenticated" on public.exports;

create policy "exports_select_owner" on public.exports
  for select to authenticated
  using (owner_user_id = (select auth.uid()));
create policy "exports_insert_owner" on public.exports
  for insert to authenticated
  with check (owner_user_id = (select auth.uid()));
create policy "exports_update_owner" on public.exports
  for update to authenticated
  using (owner_user_id = (select auth.uid()))
  with check (owner_user_id = (select auth.uid()));

commit;

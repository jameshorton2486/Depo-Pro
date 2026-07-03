begin;

drop policy if exists "speaker_resolution_current_select_authenticated" on public.speaker_resolution_current;
drop policy if exists "speaker_resolution_current_insert_authenticated" on public.speaker_resolution_current;
drop policy if exists "speaker_resolution_current_update_authenticated" on public.speaker_resolution_current;

create policy "speaker_resolution_current_select_owner" on public.speaker_resolution_current
  for select to authenticated
  using (
    exists (
      select 1
      from public.transcripts
      where transcripts.transcript_id = speaker_resolution_current.transcript_id
        and transcripts.owner_user_id = (select auth.uid())
    )
  );

create policy "speaker_resolution_current_insert_owner" on public.speaker_resolution_current
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.transcripts
      where transcripts.transcript_id = speaker_resolution_current.transcript_id
        and transcripts.owner_user_id = (select auth.uid())
    )
  );

create policy "speaker_resolution_current_update_owner" on public.speaker_resolution_current
  for update to authenticated
  using (
    exists (
      select 1
      from public.transcripts
      where transcripts.transcript_id = speaker_resolution_current.transcript_id
        and transcripts.owner_user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.transcripts
      where transcripts.transcript_id = speaker_resolution_current.transcript_id
        and transcripts.owner_user_id = (select auth.uid())
    )
  );

commit;

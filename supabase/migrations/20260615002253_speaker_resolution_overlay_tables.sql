create table if not exists public.speaker_resolution_current (
  id uuid primary key default gen_random_uuid(),
  transcript_id text not null references public.transcripts(transcript_id) on delete cascade,
  raw_speaker_id text not null,
  raw_speaker_index integer not null,
  participant_id text not null,
  resolved_role text,
  resolved_label text,
  resolved_by uuid not null default auth.uid() references auth.users(id),
  resolved_at timestamptz not null default now(),
  owner_user_id uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (transcript_id, raw_speaker_id),
  unique (transcript_id, raw_speaker_index),
  foreign key (transcript_id, raw_speaker_id)
    references public.transcript_speakers (transcript_id, speaker_id)
    on delete cascade
);

create index if not exists speaker_resolution_current_owner_idx
  on public.speaker_resolution_current (owner_user_id);

create index if not exists speaker_resolution_current_transcript_participant_idx
  on public.speaker_resolution_current (transcript_id, participant_id);

create trigger speaker_resolution_current_set_updated_at
  before update on public.speaker_resolution_current
  for each row execute function public.set_updated_at();

alter table public.speaker_resolution_current enable row level security;

create policy "speaker_resolution_current_select_owner" on public.speaker_resolution_current
  for select to authenticated
  using (owner_user_id = (select auth.uid()));

create policy "speaker_resolution_current_insert_owner" on public.speaker_resolution_current
  for insert to authenticated
  with check (owner_user_id = (select auth.uid()));

create policy "speaker_resolution_current_update_owner" on public.speaker_resolution_current
  for update to authenticated
  using (owner_user_id = (select auth.uid()))
  with check (owner_user_id = (select auth.uid()));

create table if not exists public.speaker_resolution_history (
  resolution_id uuid primary key default gen_random_uuid(),
  transcript_id text not null references public.transcripts(transcript_id) on delete cascade,
  raw_speaker_id text not null,
  raw_speaker_index integer not null,
  participant_id text not null,
  resolved_role text,
  resolved_label text,
  resolved_by uuid not null default auth.uid() references auth.users(id),
  resolved_at timestamptz not null default now(),
  supersedes_resolution_id uuid references public.speaker_resolution_history(resolution_id),
  owner_user_id uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  foreign key (transcript_id, raw_speaker_id)
    references public.transcript_speakers (transcript_id, speaker_id)
    on delete cascade
);

create index if not exists speaker_resolution_history_owner_idx
  on public.speaker_resolution_history (owner_user_id);

create index if not exists speaker_resolution_history_transcript_raw_idx
  on public.speaker_resolution_history (transcript_id, raw_speaker_id, resolved_at desc);

create index if not exists speaker_resolution_history_transcript_participant_idx
  on public.speaker_resolution_history (transcript_id, participant_id, resolved_at desc);

alter table public.speaker_resolution_history enable row level security;

create policy "speaker_resolution_history_select_owner" on public.speaker_resolution_history
  for select to authenticated
  using (owner_user_id = (select auth.uid()));

create policy "speaker_resolution_history_insert_owner" on public.speaker_resolution_history
  for insert to authenticated
  with check (owner_user_id = (select auth.uid()));

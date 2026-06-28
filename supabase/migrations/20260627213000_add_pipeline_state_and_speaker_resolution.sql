alter table public.transcripts
  add column if not exists pipeline_state text not null default 'PENDING',
  add column if not exists speaker_map_verified boolean not null default false;

create table if not exists public.speaker_resolution_current (
  id uuid primary key default gen_random_uuid(),
  transcript_id text not null references public.transcripts(transcript_id) on delete cascade,
  speaker_id text not null,
  proposed_display_name text not null default '',
  proposed_role text,
  confidence numeric(5,4) not null default 0,
  evidence text not null default '',
  authority text not null default '',
  ai_suggested boolean not null default true,
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (transcript_id, speaker_id)
);

alter table public.speaker_resolution_current
  add column if not exists proposed_display_name text not null default '',
  add column if not exists proposed_role text,
  add column if not exists confidence numeric(5,4) not null default 0,
  add column if not exists evidence text not null default '',
  add column if not exists authority text not null default '',
  add column if not exists ai_suggested boolean not null default true,
  add column if not exists verified boolean not null default false,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists speaker_resolution_current_set_updated_at on public.speaker_resolution_current;

create trigger speaker_resolution_current_set_updated_at
  before update on public.speaker_resolution_current
  for each row execute function public.set_updated_at();

alter table public.speaker_resolution_current enable row level security;

drop policy if exists "speaker_resolution_current_select_authenticated" on public.speaker_resolution_current;
drop policy if exists "speaker_resolution_current_insert_authenticated" on public.speaker_resolution_current;
drop policy if exists "speaker_resolution_current_update_authenticated" on public.speaker_resolution_current;

create policy "speaker_resolution_current_select_authenticated" on public.speaker_resolution_current
  for select to authenticated using (true);

create policy "speaker_resolution_current_insert_authenticated" on public.speaker_resolution_current
  for insert to authenticated with check (true);

create policy "speaker_resolution_current_update_authenticated" on public.speaker_resolution_current
  for update to authenticated using (true) with check (true);

create index if not exists speaker_resolution_current_transcript_idx
  on public.speaker_resolution_current (transcript_id, verified, ai_suggested);

alter table public.transcript_words
  add column if not exists ai_suggestion text default null,
  add column if not exists ai_suggestion_reason text default null,
  add column if not exists ai_confidence double precision default null,
  add column if not exists ai_suggestion_status text default null
    check (ai_suggestion_status in ('pending', 'accepted', 'rejected'));

alter table public.transcripts
  add column if not exists ai_review_meta jsonb default null;

create index if not exists idx_transcript_words_ai_pending
  on public.transcript_words (transcript_id, ai_suggestion_status)
  where ai_suggestion_status = 'pending';

comment on column public.transcript_words.ai_suggestion is
  'AI-proposed correction. NULL = no suggestion. Displayed as overlay until accepted/rejected.';

comment on column public.transcript_words.ai_suggestion_status is
  'pending = awaiting Miah review | accepted = written to working_text | rejected = discarded';

comment on column public.transcripts.ai_review_meta is
  'Versioning: {completed, prompt_version, model, transcript_revision, completed_at}';

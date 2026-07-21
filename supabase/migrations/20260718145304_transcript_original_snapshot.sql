-- Two-copy transcript model.
--
-- Each deposition keeps exactly two transcripts:
--   1. Original  — an immutable JSON snapshot of the structured transcript as the
--                  pipeline first produced it (captured once at ingest).
--   2. Working   — the editable transcript rows (transcript_words/utterances/...),
--                  mutated in place. Never copied per save.
--
-- These columns record where the immutable Original snapshot lives. The Working
-- copy remains the existing transcript_* rows.

alter table public.transcripts
  add column if not exists original_storage_path text,
  add column if not exists original_checksum text,
  add column if not exists original_captured_at timestamptz;

comment on column public.transcripts.original_storage_path is
  'Path in the case-files bucket to the immutable Original snapshot JSON captured at ingest.';

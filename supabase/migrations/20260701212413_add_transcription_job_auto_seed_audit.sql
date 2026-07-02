ALTER TABLE transcription_jobs
  ADD COLUMN IF NOT EXISTS auto_seed_audit jsonb;

COMMENT ON COLUMN transcription_jobs.auto_seed_audit IS
  'Audit log for case-record auto-seeded Deepgram keyterms: added, already present, and dropped-for-cap terms.';

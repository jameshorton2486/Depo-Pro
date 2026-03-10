-- transcript_access_log — who viewed a transcript and when
-- Phase B: audit trail for transcript access

CREATE TABLE IF NOT EXISTS transcript_access_log (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcription_id UUID NOT NULL REFERENCES transcriptions(id) ON DELETE CASCADE,
  firm_id          UUID NOT NULL REFERENCES firms(id) ON DELETE RESTRICT,
  accessed_by      UUID NOT NULL REFERENCES profiles(id),
  access_type      TEXT NOT NULL,
  -- 'REVIEW_OPEN' | 'EXPORT_DOWNLOAD' | 'SHARE_VIEW' | 'ATTORNEY_VIEW'
  ip_address       TEXT,
  user_agent       TEXT,
  accessed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE transcript_access_log ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'transcript_access_log'
      AND policyname = 'access_log_firm'
  ) THEN
    CREATE POLICY "access_log_firm" ON transcript_access_log
      FOR ALL
      USING (
        firm_id = (SELECT firm_id FROM profiles WHERE id = auth.uid())
      )
      WITH CHECK (
        firm_id = (SELECT firm_id FROM profiles WHERE id = auth.uid())
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tal_transcription
  ON transcript_access_log(transcription_id, accessed_at DESC);

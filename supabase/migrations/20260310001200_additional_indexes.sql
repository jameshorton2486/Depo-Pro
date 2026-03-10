-- Phase B: editor performance, progress RPC, and assignment tracking

ALTER TABLE transcript_words
  ADD COLUMN IF NOT EXISTS confidence_class TEXT GENERATED ALWAYS AS (
    CASE
      WHEN confidence >= 0.90 THEN 'HIGH'
      WHEN confidence >= 0.80 THEN 'MEDIUM'
      WHEN confidence >= 0.70 THEN 'LOW'
      ELSE 'CRITICAL'
    END
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_tw_confidence_class
  ON transcript_words(transcription_id, confidence_class)
  WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_tw_audio_nav
  ON transcript_words(transcription_id, start_time, end_time)
  WHERE is_deleted = FALSE;

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_tw_word_trgm
  ON transcript_words
  USING gin(word gin_trgm_ops);

CREATE TABLE IF NOT EXISTS proofreading_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcription_id UUID NOT NULL REFERENCES transcriptions(id) ON DELETE CASCADE,
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE RESTRICT,
  scopist_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  notes TEXT,
  UNIQUE(transcription_id, scopist_id)
);

ALTER TABLE proofreading_assignments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'proofreading_assignments'
      AND policyname = 'firm_isolation'
  ) THEN
    CREATE POLICY "firm_isolation" ON proofreading_assignments
      FOR ALL
      USING (
        firm_id = (
          SELECT firm_id FROM profiles WHERE id = auth.uid()
        )
      )
      WITH CHECK (
        firm_id = (
          SELECT firm_id FROM profiles WHERE id = auth.uid()
        )
      );
  END IF;
END $$;

ALTER TABLE transcript_words
  ALTER COLUMN start_time TYPE NUMERIC(12,3),
  ALTER COLUMN end_time TYPE NUMERIC(12,3);

CREATE OR REPLACE FUNCTION get_review_progress(
  p_transcription_id UUID,
  p_firm_id UUID
)
RETURNS JSONB AS $$
SELECT jsonb_build_object(
  'total', COUNT(*),
  'pending', COUNT(*) FILTER (WHERE fw.status = 'PENDING'),
  'corrected', COUNT(*) FILTER (WHERE fw.status = 'CORRECTED'),
  'confirmed', COUNT(*) FILTER (WHERE fw.status = 'CONFIRMED'),
  'skipped', COUNT(*) FILTER (WHERE fw.status = 'SKIPPED'),
  'reviewed', COUNT(*) FILTER (WHERE fw.status != 'PENDING'),
  'percentComplete', COALESCE(
    ROUND(
      COUNT(*) FILTER (WHERE fw.status != 'PENDING')::NUMERIC
      / NULLIF(COUNT(*), 0) * 100
    ),
    0
  ),
  'verifyTagsUnresolved', 0,
  'lowConfidenceUnreviewed', COUNT(*) FILTER (
    WHERE fw.status = 'PENDING'
      AND fw.confidence < 0.80
  )
)
FROM flagged_words fw
JOIN transcriptions t ON t.id = fw.transcription_id
JOIN jobs j ON j.id = t.job_id
WHERE fw.transcription_id = p_transcription_id
  AND j.firm_id = p_firm_id;
$$ LANGUAGE SQL STABLE;

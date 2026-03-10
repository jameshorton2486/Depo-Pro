-- Phase B: certification records for legal discovery and export workflow
-- Note: export_id removed until exports table exists; transcription_id is primary link

CREATE TABLE IF NOT EXISTS export_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcription_id UUID NOT NULL REFERENCES transcriptions(id) ON DELETE CASCADE,
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE RESTRICT,
  certified_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  export_format TEXT NOT NULL DEFAULT 'DOCX',
  certification_body TEXT,
  certification_state CHAR(2),
  certified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_export_certifications_transcription
  ON export_certifications(transcription_id, certified_at);

ALTER TABLE export_certifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'export_certifications'
      AND policyname = 'firm_isolation'
  ) THEN
    CREATE POLICY "firm_isolation" ON export_certifications
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

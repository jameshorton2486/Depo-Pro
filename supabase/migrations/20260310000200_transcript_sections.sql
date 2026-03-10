-- Phase B: transcript section markers for editor navigation and examination indexing

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'transcript_section_type'
  ) THEN
    CREATE TYPE transcript_section_type AS ENUM (
      'DIRECT',
      'CROSS',
      'REDIRECT',
      'RECROSS',
      'COLLOQUY',
      'OFF_RECORD',
      'CLOSING'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS transcript_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcription_id UUID NOT NULL REFERENCES transcriptions(id) ON DELETE CASCADE,
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE RESTRICT,
  section_type transcript_section_type NOT NULL,
  title TEXT,
  start_paragraph_index INTEGER,
  end_paragraph_index INTEGER,
  start_page INTEGER,
  end_page INTEGER,
  speaker_index INTEGER,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ts_transcription
  ON transcript_sections(transcription_id, section_type, start_paragraph_index);

ALTER TABLE transcript_sections ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'transcript_sections'
      AND policyname = 'firm_isolation'
  ) THEN
    CREATE POLICY "firm_isolation" ON transcript_sections
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

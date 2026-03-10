-- Migration 020: transcript_words table
-- Normalized word-level storage for formatter pipeline.
-- Pipeline stores in transcriptions.words (JSONB); hydrateWords() populates this table.
-- DROP first if table exists with incompatible schema (from partial prior migration).

DROP TABLE IF EXISTS transcript_words CASCADE;

CREATE TABLE transcript_words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcription_id UUID NOT NULL REFERENCES transcriptions(id) ON DELETE CASCADE,
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE RESTRICT,
  position_index INTEGER NOT NULL,
  original_word TEXT NOT NULL,
  word TEXT NOT NULL,
  punctuated_word TEXT NOT NULL,
  display_word TEXT NOT NULL,
  corrected_word TEXT,
  start_time NUMERIC(12,3) NOT NULL,
  end_time NUMERIC(12,3) NOT NULL,
  confidence NUMERIC(4,3) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  speaker_index INTEGER NOT NULL DEFAULT 0,
  is_corrected BOOLEAN NOT NULL DEFAULT FALSE,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  is_filler BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(transcription_id, position_index)
);

-- confidence_class generated column (Phase 1 formatter requirement)
ALTER TABLE transcript_words
  ADD COLUMN IF NOT EXISTS confidence_class TEXT GENERATED ALWAYS AS (
    CASE
      WHEN confidence >= 0.90 THEN 'HIGH'
      WHEN confidence >= 0.80 THEN 'MEDIUM'
      WHEN confidence >= 0.70 THEN 'LOW'
      ELSE 'CRITICAL'
    END
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_tw_transcription ON transcript_words(transcription_id);
CREATE INDEX IF NOT EXISTS idx_tw_position ON transcript_words(transcription_id, position_index);
CREATE INDEX IF NOT EXISTS idx_tw_confidence_class ON transcript_words(transcription_id, confidence_class)
  WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_tw_audio_nav ON transcript_words(transcription_id, start_time, end_time)
  WHERE is_deleted = FALSE;

ALTER TABLE transcript_words ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "transcript_words_firm_isolation" ON transcript_words;
CREATE POLICY "transcript_words_firm_isolation" ON transcript_words
  FOR ALL
  USING (firm_id = (SELECT firm_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (firm_id = (SELECT firm_id FROM profiles WHERE id = auth.uid()));

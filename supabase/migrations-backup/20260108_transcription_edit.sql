-- ═══════════════════════════════════════════════════════════════════════════
-- TRANSCRIPTION EDIT TABLE
-- Stores scopist corrections to low-confidence words
-- Applied: 2026-01-08
-- ═══════════════════════════════════════════════════════════════════════════

-- Drop existing transcription_edits if it exists with old schema (will recreate)
-- Note: In production, use ALTER TABLE instead of DROP
-- For now, we'll add missing columns to existing table

-- Add missing columns if they don't exist
ALTER TABLE transcription_edits 
ADD COLUMN IF NOT EXISTS confidence_before DECIMAL(4,3),
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Update edit_type constraint to match requirements
ALTER TABLE transcription_edits 
DROP CONSTRAINT IF EXISTS transcription_edits_edit_type_check;

ALTER TABLE transcription_edits 
ADD CONSTRAINT transcription_edits_edit_type_check 
CHECK (edit_type IN ('WORD_CORRECTION', 'SPEAKER_CHANGE', 'PUNCTUATION', 'DELETE', 'correction', 'accept', 'reject', 'flag'));

-- Update editor_id and editor_role to be NOT NULL if not already
ALTER TABLE transcription_edits 
ALTER COLUMN editor_id SET NOT NULL,
ALTER COLUMN editor_role SET NOT NULL;

-- Ensure unique constraint exists
CREATE UNIQUE INDEX IF NOT EXISTS unique_word_edit 
ON transcription_edits(transcription_id, word_index);

-- Performance indexes (if not already exist)
CREATE INDEX IF NOT EXISTS idx_transcription_edit_transcription_id 
ON transcription_edits(transcription_id);

CREATE INDEX IF NOT EXISTS idx_transcription_edit_editor_id 
ON transcription_edits(editor_id);

CREATE INDEX IF NOT EXISTS idx_transcription_edit_created_at 
ON transcription_edits(created_at DESC);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_transcription_edit_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS transcription_edit_updated ON transcription_edits;
CREATE TRIGGER transcription_edit_updated
BEFORE UPDATE ON transcription_edits
FOR EACH ROW EXECUTE FUNCTION update_transcription_edit_timestamp();

-- ═══════════════════════════════════════════════════════════════════════════
-- COMMENT
-- ═══════════════════════════════════════════════════════════════════════════
COMMENT ON TABLE transcription_edits IS 'Stores scopist corrections to low-confidence words in transcriptions';

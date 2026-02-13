-- Accuracy Intelligence Plan - Step 2: Correction Logging Table
-- CRITICAL FOUNDATION: Enables Steps 3, 5, 6, 7, and 8
-- This table captures every correction/confirmation/skip for pattern analysis

CREATE TABLE IF NOT EXISTS public.transcription_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys
  transcription_id UUID NOT NULL REFERENCES public.transcriptions(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  firm_id UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- Word data
  word_index INTEGER NOT NULL,
  original_word TEXT NOT NULL,
  corrected_word TEXT, -- NULL if confirmed (no change needed)
  action TEXT NOT NULL CHECK (action IN ('CORRECTED', 'CONFIRMED', 'SKIPPED')),

  -- Context
  confidence_at_time NUMERIC NOT NULL, -- Deepgram confidence when flagged
  category TEXT, -- 'medical', 'proper_noun', 'number_date', 'legal', 'general'
  speaker_label TEXT, -- speaker ID from Deepgram
  audio_position_seconds NUMERIC, -- timestamp in audio

  -- Surrounding words (for pattern detection)
  context_before TEXT, -- 3 words before
  context_after TEXT, -- 3 words after

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for pattern analysis and vocabulary learning
CREATE INDEX IF NOT EXISTS idx_corrections_firm ON public.transcription_corrections(firm_id);
CREATE INDEX IF NOT EXISTS idx_corrections_transcription ON public.transcription_corrections(transcription_id);
CREATE INDEX IF NOT EXISTS idx_corrections_original ON public.transcription_corrections(original_word);
CREATE INDEX IF NOT EXISTS idx_corrections_corrected ON public.transcription_corrections(corrected_word);
CREATE INDEX IF NOT EXISTS idx_corrections_category ON public.transcription_corrections(category);
CREATE INDEX IF NOT EXISTS idx_corrections_speaker ON public.transcription_corrections(speaker_label);
CREATE INDEX IF NOT EXISTS idx_corrections_confidence ON public.transcription_corrections(confidence_at_time);

-- Composite index for vocabulary learning queries
CREATE INDEX IF NOT EXISTS idx_corrections_firm_original
  ON public.transcription_corrections(firm_id, original_word, corrected_word)
  WHERE action = 'CORRECTED';

-- Composite index for speaker analysis
CREATE INDEX IF NOT EXISTS idx_corrections_speaker_firm
  ON public.transcription_corrections(speaker_label, firm_id, confidence_at_time);

-- RLS policies
ALTER TABLE public.transcription_corrections ENABLE ROW LEVEL SECURITY;

-- Users can view corrections from their own firm
CREATE POLICY "Users can view firm corrections"
  ON public.transcription_corrections
  FOR SELECT
  USING (
    firm_id IN (
      SELECT firm_id FROM public.users WHERE id = auth.uid()
    )
  );

-- Users can insert their own corrections
CREATE POLICY "Users can insert corrections"
  ON public.transcription_corrections
  FOR INSERT
  WITH CHECK (reviewer_id = auth.uid());

-- Admins can view all corrections
CREATE POLICY "Admins can view all corrections"
  ON public.transcription_corrections
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

-- Comments
COMMENT ON TABLE public.transcription_corrections IS 'Logs every word correction/confirmation/skip for accuracy analytics and vocabulary learning';
COMMENT ON COLUMN public.transcription_corrections.action IS 'CORRECTED = word was changed, CONFIRMED = word was verified as correct, SKIPPED = word was not reviewed';
COMMENT ON COLUMN public.transcription_corrections.category IS 'Word category: medical, proper_noun, number_date, legal, general (from categorizeWord())';
COMMENT ON COLUMN public.transcription_corrections.context_before IS '3 words before for pattern detection';
COMMENT ON COLUMN public.transcription_corrections.context_after IS '3 words after for pattern detection';
COMMENT ON INDEX idx_corrections_firm_original IS 'Optimized for vocabulary learning queries: find frequently corrected words per firm';
COMMENT ON INDEX idx_corrections_speaker_firm IS 'Optimized for speaker accuracy analysis: confidence variance by speaker';

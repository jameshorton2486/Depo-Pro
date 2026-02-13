-- Review Session Duration Tracking (Feature 5)
-- Workflow Intelligence Plan - Phase A
-- Tracks actual review time and behavior for adaptive modeling (Phase B)

CREATE TABLE IF NOT EXISTS public.review_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Foreign keys
  transcription_id UUID NOT NULL REFERENCES public.transcriptions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,

  -- Session timing
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  active_duration_seconds INTEGER DEFAULT 0, -- Excludes idle time
  total_duration_seconds INTEGER DEFAULT 0,  -- Includes idle time

  -- Review activity
  words_reviewed INTEGER DEFAULT 0,        -- Words corrected/confirmed/skipped
  words_corrected INTEGER DEFAULT 0,       -- Subset: words corrected
  audio_replays INTEGER DEFAULT 0,         -- Number of audio seek/replay actions
  filters_used JSONB DEFAULT '[]',         -- Array of filter types used: ["critical", "medical", "numbers"]

  -- Metadata for adaptive modeling (Phase B)
  risk_score INTEGER,                      -- Risk score at start of session
  flagged_count INTEGER,                   -- Total flagged words at start
  completion_rate NUMERIC(5,2),            -- % of flagged words addressed (0-100)

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_review_sessions_transcription ON public.review_sessions(transcription_id);
CREATE INDEX IF NOT EXISTS idx_review_sessions_user ON public.review_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_review_sessions_job ON public.review_sessions(job_id);
CREATE INDEX IF NOT EXISTS idx_review_sessions_started ON public.review_sessions(started_at DESC);

-- RLS policies
ALTER TABLE public.review_sessions ENABLE ROW LEVEL SECURITY;

-- Users can view their own review sessions
CREATE POLICY "Users can view own review sessions"
  ON public.review_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own review sessions
CREATE POLICY "Users can insert own review sessions"
  ON public.review_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own review sessions
CREATE POLICY "Users can update own review sessions"
  ON public.review_sessions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Admins can view all review sessions
CREATE POLICY "Admins can view all review sessions"
  ON public.review_sessions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_review_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER review_sessions_updated_at
  BEFORE UPDATE ON public.review_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_review_sessions_updated_at();

-- Comments
COMMENT ON TABLE public.review_sessions IS 'Tracks scopist review sessions for time estimation and adaptive modeling';
COMMENT ON COLUMN public.review_sessions.active_duration_seconds IS 'Active review time, excluding idle periods > 60 seconds';
COMMENT ON COLUMN public.review_sessions.total_duration_seconds IS 'Total elapsed time from start to end';
COMMENT ON COLUMN public.review_sessions.filters_used IS 'Array of filter shortcuts used during session (e.g., ["critical", "medical"])';
COMMENT ON COLUMN public.review_sessions.completion_rate IS 'Percentage of flagged words addressed during this session (0-100)';

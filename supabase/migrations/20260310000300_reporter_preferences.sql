-- Phase B: reporter playback and editor preferences

CREATE TABLE IF NOT EXISTS reporter_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE RESTRICT,
  playback_speed NUMERIC(4,2) NOT NULL DEFAULT 1.00,
  show_fillers BOOLEAN NOT NULL DEFAULT TRUE,
  auto_scroll BOOLEAN NOT NULL DEFAULT TRUE,
  highlight_confidence BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(profile_id)
);

CREATE INDEX IF NOT EXISTS idx_reporter_preferences_profile
  ON reporter_preferences(profile_id, firm_id);

ALTER TABLE reporter_preferences ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'reporter_preferences'
      AND policyname = 'firm_isolation'
  ) THEN
    CREATE POLICY "firm_isolation" ON reporter_preferences
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

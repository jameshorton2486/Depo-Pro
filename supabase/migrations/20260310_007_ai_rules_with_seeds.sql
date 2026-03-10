-- Phase B: rule catalog for AI/editor validations

CREATE TABLE IF NOT EXISTS ai_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID REFERENCES firms(id) ON DELETE CASCADE,
  rule_code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'WARNING',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  applies_to TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(firm_id, rule_code)
);

CREATE INDEX IF NOT EXISTS idx_ai_rules_active
  ON ai_rules(is_active, severity);

ALTER TABLE ai_rules ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ai_rules'
      AND policyname = 'firm_isolation'
  ) THEN
    CREATE POLICY "firm_isolation" ON ai_rules
      FOR ALL
      USING (
        firm_id IS NULL OR firm_id = (
          SELECT firm_id FROM profiles WHERE id = auth.uid()
        )
      )
      WITH CHECK (
        firm_id IS NULL OR firm_id = (
          SELECT firm_id FROM profiles WHERE id = auth.uid()
        )
      );
  END IF;
END $$;

INSERT INTO ai_rules (firm_id, rule_code, title, description, severity, applies_to)
VALUES
  (NULL, 'COURT_REPORTER_LABEL', 'Normalize court reporter label', 'Use THE REPORTER instead of THE COURT REPORTER.', 'WARNING', ARRAY['speaker_label']),
  (NULL, 'EM_DASH_REPLACEMENT', 'Replace em dash', 'Replace all em dash characters with double hyphens.', 'WARNING', ARRAY['paragraph_text']),
  (NULL, 'DATE_FORMAT_FIX', 'Normalize time and date formatting', 'Normalize time/date formatting for Texas transcript output.', 'WARNING', ARRAY['paragraph_text']),
  (NULL, 'VERIFY_TAG_REQUIRED', 'Unresolved verify tags block export', 'Any unresolved VERIFY tag must be resolved before export.', 'ERROR', ARRAY['quality_gate'])
ON CONFLICT (firm_id, rule_code) DO NOTHING;

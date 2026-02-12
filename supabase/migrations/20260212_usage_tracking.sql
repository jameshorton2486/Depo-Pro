-- Security Audit D.9 - Cost-Control Safeguards
-- Prevents runaway Deepgram/Anthropic costs

CREATE TABLE IF NOT EXISTS usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  usage_type TEXT NOT NULL, -- 'transcription_minutes', 'ai_extraction', 'export'
  quantity NUMERIC NOT NULL DEFAULT 0,
  period_start DATE NOT NULL DEFAULT date_trunc('month', CURRENT_DATE),
  period_end DATE NOT NULL DEFAULT (date_trunc('month', CURRENT_DATE) + interval '1 month')::date,
  metadata JSONB DEFAULT '{}', -- Additional context (job_id, file_size, etc.)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(firm_id, usage_type, period_start)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_usage_tracking_firm ON usage_tracking(firm_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_period ON usage_tracking(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_type ON usage_tracking(usage_type);

-- Enable RLS
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

-- Admins can see their firm's usage
CREATE POLICY usage_tracking_select ON usage_tracking
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.firm_id = usage_tracking.firm_id
    AND p.role = 'ADMIN'::user_role
  )
);

-- Only service role can insert/update (via API routes)
CREATE POLICY usage_tracking_insert ON usage_tracking
FOR INSERT WITH CHECK (false);

CREATE POLICY usage_tracking_update ON usage_tracking
FOR UPDATE USING (false);

-- Function to increment usage (called from API routes)
CREATE OR REPLACE FUNCTION increment_usage(
  p_firm_id UUID,
  p_usage_type TEXT,
  p_quantity NUMERIC,
  p_metadata JSONB DEFAULT '{}'
) RETURNS BOOLEAN AS $$
DECLARE
  v_period_start DATE := date_trunc('month', CURRENT_DATE);
  v_period_end DATE := (date_trunc('month', CURRENT_DATE) + interval '1 month')::date;
BEGIN
  INSERT INTO usage_tracking (firm_id, usage_type, quantity, period_start, period_end, metadata)
  VALUES (p_firm_id, p_usage_type, p_quantity, v_period_start, v_period_end, p_metadata)
  ON CONFLICT (firm_id, usage_type, period_start)
  DO UPDATE SET
    quantity = usage_tracking.quantity + p_quantity,
    metadata = usage_tracking.metadata || p_metadata,
    updated_at = NOW();

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if firm is over limit
CREATE OR REPLACE FUNCTION check_usage_limit(
  p_firm_id UUID,
  p_usage_type TEXT,
  p_limit NUMERIC
) RETURNS JSONB AS $$
DECLARE
  v_current NUMERIC := 0;
  v_period_start DATE := date_trunc('month', CURRENT_DATE);
BEGIN
  SELECT COALESCE(quantity, 0) INTO v_current
  FROM usage_tracking
  WHERE firm_id = p_firm_id
    AND usage_type = p_usage_type
    AND period_start = v_period_start;

  RETURN jsonb_build_object(
    'allowed', v_current < p_limit,
    'current', v_current,
    'limit', p_limit,
    'remaining', GREATEST(0, p_limit - v_current)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON TABLE usage_tracking IS 'Tracks API usage for cost control (Security Audit D.9)';
COMMENT ON FUNCTION increment_usage IS 'Atomically increments usage for a firm/type/period';
COMMENT ON FUNCTION check_usage_limit IS 'Checks if firm is over monthly limit';

-- ============================================================================
-- Add Confidence Analytics to Transcriptions
-- Feature Deep Dive v2: Enhancement 1.2 & 1.3
-- ============================================================================

-- Add metadata column to store confidence analytics and risk scores
ALTER TABLE transcriptions
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Add index for querying by risk score
CREATE INDEX IF NOT EXISTS idx_transcriptions_risk_score
ON transcriptions ((metadata->>'risk_score'));

-- Add index for querying by flagged percentage
CREATE INDEX IF NOT EXISTS idx_transcriptions_flagged_percentage
ON transcriptions ((metadata->>'flagged_percentage'));

COMMENT ON COLUMN transcriptions.metadata IS
'Stores confidence analytics, risk scores, and other computed metadata. Schema: { confidence_analytics: ConfidenceAnalytics, risk_score_result: RiskScoreResult, audio_quality_score?: number }';

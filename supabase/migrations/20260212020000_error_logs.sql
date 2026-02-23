-- Security Audit D.12 - Error Observability
-- Lightweight error tracking without Sentry dependency

CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route TEXT NOT NULL, -- e.g., '/api/jobs/[id]/transcribe'
  method TEXT NOT NULL, -- GET, POST, PATCH, DELETE
  status_code INTEGER, -- HTTP status code (500, 400, etc.)
  firm_id UUID REFERENCES firms(id) ON DELETE SET NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  error_message TEXT NOT NULL, -- High-level error message (no PHI)
  error_code TEXT, -- Application error code (e.g., 'TRANSCRIPTION_FAILED')
  stack TEXT, -- Stack trace (truncated for storage)
  metadata JSONB DEFAULT '{}', -- Additional context (request_id, job_id, etc.)
  ip_address INET, -- Client IP address
  user_agent TEXT, -- Client user agent
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_error_logs_created ON error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_route ON error_logs(route);
CREATE INDEX IF NOT EXISTS idx_error_logs_firm ON error_logs(firm_id) WHERE firm_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_error_logs_user ON error_logs(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_error_logs_status ON error_logs(status_code);

-- Enable RLS
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view error logs
CREATE POLICY error_logs_select ON error_logs
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role = 'ADMIN'::user_role
  )
);

-- No direct insert/update via client (only via service role in API routes)
CREATE POLICY error_logs_insert ON error_logs
FOR INSERT WITH CHECK (false);

CREATE POLICY error_logs_update ON error_logs
FOR UPDATE USING (false);

CREATE POLICY error_logs_delete ON error_logs
FOR DELETE USING (false);

-- Function to automatically clean old error logs (keep 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_error_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM error_logs
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule cleanup (run via cron or manually)
COMMENT ON FUNCTION cleanup_old_error_logs IS 'Delete error logs older than 90 days (Security Audit D.12)';

-- Create view for recent errors (last 24 hours)
CREATE OR REPLACE VIEW recent_errors AS
SELECT
  id,
  route,
  method,
  status_code,
  firm_id,
  user_id,
  error_message,
  error_code,
  LEFT(stack, 500) AS stack_preview, -- First 500 chars only
  metadata,
  created_at
FROM error_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 100;

-- Grant access to view
GRANT SELECT ON recent_errors TO authenticated;

-- Comments
COMMENT ON TABLE error_logs IS 'Application error tracking for observability (Security Audit D.12)';
COMMENT ON VIEW recent_errors IS 'Last 24 hours of errors (max 100)';

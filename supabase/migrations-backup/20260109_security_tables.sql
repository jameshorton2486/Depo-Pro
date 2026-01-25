-- ═══════════════════════════════════════════════════════════════════════════
-- SECURITY TABLES MIGRATION
-- Creates audit logging and session tracking tables
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- AUDIT LOG TABLE
-- Comprehensive audit trail for compliance and security
-- ═══════════════════════════════════════════════════════════════════════════

-- Create audit_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS "audit_logs" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES "profiles"(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  old_value JSONB,
  new_value JSONB,
  metadata JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  firm_id UUID REFERENCES "firms"(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON "audit_logs"(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON "audit_logs"(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON "audit_logs"(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_resource ON "audit_logs"(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_firm_id ON "audit_logs"(firm_id);

-- RLS Policies
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;

-- Admins can view all audit logs
CREATE POLICY "Admins can view audit logs"
ON "audit_logs" FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM "profiles" p 
    WHERE p.id = auth.uid() 
    AND p.role = 'ADMIN'
  )
);

-- Users can view their own audit logs
CREATE POLICY "Users can view own audit logs"
ON "audit_logs" FOR SELECT
USING (user_id = auth.uid());

-- Firm admins can view firm audit logs
CREATE POLICY "Firm admins can view firm audit logs"
ON "audit_logs" FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM "profiles" p 
    WHERE p.id = auth.uid() 
    AND p.role IN ('AGENCY_ADMIN', 'FIRM_ADMIN')
    AND p.firm_id = "audit_logs".firm_id
  )
);

-- No insert/update/delete for regular users (only system can insert)
CREATE POLICY "System can insert audit logs"
ON "audit_logs" FOR INSERT
WITH CHECK (true); -- Service role bypasses RLS

-- ═══════════════════════════════════════════════════════════════════════════
-- USER SESSION TABLE
-- Tracks active user sessions for security monitoring
-- ═══════════════════════════════════════════════════════════════════════════

-- Create user_sessions table if it doesn't exist
CREATE TABLE IF NOT EXISTS "user_sessions" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES "profiles"(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON "user_sessions"(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON "user_sessions"(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON "user_sessions"(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON "user_sessions"(expires_at) WHERE expires_at IS NOT NULL;

-- RLS Policies
ALTER TABLE "user_sessions" ENABLE ROW LEVEL SECURITY;

-- Users can view their own sessions
CREATE POLICY "Users can view own sessions"
ON "user_sessions" FOR SELECT
USING (user_id = auth.uid());

-- Users can update their own sessions
CREATE POLICY "Users can update own sessions"
ON "user_sessions" FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Users can delete their own sessions
CREATE POLICY "Users can delete own sessions"
ON "user_sessions" FOR DELETE
USING (user_id = auth.uid());

-- System can insert sessions (for auth flow)
CREATE POLICY "System can insert sessions"
ON "user_sessions" FOR INSERT
WITH CHECK (true); -- Service role bypasses RLS

-- ═══════════════════════════════════════════════════════════════════════════
-- COMMENTS
-- ═══════════════════════════════════════════════════════════════════════════

COMMENT ON TABLE "audit_logs" IS 'Comprehensive audit trail for compliance and security monitoring';
COMMENT ON TABLE "user_sessions" IS 'Tracks active user sessions for security monitoring and session management';

COMMENT ON COLUMN "audit_logs".action IS 'Type of action performed (e.g., USER_LOGIN, JOB_CREATED)';
COMMENT ON COLUMN "audit_logs".resource_type IS 'Type of resource affected (e.g., job, transcript, file)';
COMMENT ON COLUMN "audit_logs".resource_id IS 'ID of the resource affected';
COMMENT ON COLUMN "audit_logs".old_value IS 'Previous state of the resource (for updates)';
COMMENT ON COLUMN "audit_logs".new_value IS 'New state of the resource (for updates)';
COMMENT ON COLUMN "audit_logs".metadata IS 'Additional context about the action';
COMMENT ON COLUMN "audit_logs".ip_address IS 'IP address of the client that performed the action';
COMMENT ON COLUMN "audit_logs".user_agent IS 'User agent string of the client';

COMMENT ON COLUMN "user_sessions".session_token IS 'Unique session token identifier';
COMMENT ON COLUMN "user_sessions".is_active IS 'Whether the session is currently active';
COMMENT ON COLUMN "user_sessions".expires_at IS 'When the session expires (if applicable)';

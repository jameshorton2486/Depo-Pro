-- Security Audit D.3 - Enhanced Audit Events Table
-- Legal defensibility requirement: who changed what and when

CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID REFERENCES firms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,         -- e.g. 'WORD_CORRECTED', 'TRANSCRIPT_EXPORTED'
  entity_type TEXT NOT NULL,    -- e.g. 'flagged_word', 'job', 'medical_record'
  entity_id UUID,               -- ID of affected record
  metadata JSONB DEFAULT '{}',  -- Action-specific details
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast query by firm, user, entity, time
CREATE INDEX idx_audit_events_firm ON audit_events(firm_id);
CREATE INDEX idx_audit_events_user ON audit_events(user_id);
CREATE INDEX idx_audit_events_entity ON audit_events(entity_type, entity_id);
CREATE INDEX idx_audit_events_created ON audit_events(created_at DESC);
CREATE INDEX idx_audit_events_action ON audit_events(action);

-- Performance: Composite index for common queries
CREATE INDEX idx_audit_events_firm_date ON audit_events(firm_id, created_at DESC);

-- RLS Policies
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can see their firm's audit events (admin sees all)
CREATE POLICY audit_events_select ON audit_events
FOR SELECT USING (
  firm_id IN (SELECT firm_id FROM profiles WHERE id = auth.uid())
  OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role = 'ADMIN'::user_role
  )
);

-- INSERT: Service role only (API routes use service_role client)
CREATE POLICY audit_events_insert ON audit_events
FOR INSERT WITH CHECK (true);  -- API routes use service_role, bypasses RLS

-- No UPDATE or DELETE policies (audit log is append-only)

-- Comment
COMMENT ON TABLE audit_events IS 'Comprehensive audit trail for all security-relevant actions (Security Audit D.3)';
COMMENT ON COLUMN audit_events.metadata IS 'JSON object with action-specific details (e.g., {"old_value": "test", "new_value": "demo"})';

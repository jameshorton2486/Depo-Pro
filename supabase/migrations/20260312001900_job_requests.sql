-- Migration 019: Job Request Workflow

CREATE TABLE IF NOT EXISTS transcript_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  submitted_by UUID NOT NULL REFERENCES profiles(id),
  submitted_by_role TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
  approved_job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  document_id UUID REFERENCES deposition_documents(id) ON DELETE SET NULL,
  job_title TEXT NOT NULL,
  case_name TEXT,
  case_number TEXT,
  cause_number TEXT,
  case_style TEXT,
  deponent_name TEXT,
  deposition_date DATE,
  start_time TIME,
  timezone TEXT DEFAULT 'America/Chicago',
  location TEXT,
  is_remote BOOLEAN DEFAULT FALSE,
  remote_platform TEXT,
  zoom_link TEXT,
  ordering_attorney TEXT,
  ordering_firm TEXT,
  ordering_email TEXT,
  ordering_phone TEXT,
  audio_processing TEXT DEFAULT 'automated',
  notes TEXT,
  court_name TEXT,
  court_number TEXT,
  county TEXT,
  state TEXT DEFAULT 'Texas',
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  admin_notes TEXT,
  decline_reason TEXT,
  admin_overrides JSONB,
  extracted_data JSONB,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE transcript_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "submitter_view_own_requests" ON transcript_requests;
CREATE POLICY "submitter_view_own_requests" ON transcript_requests
  FOR SELECT USING (submitted_by = auth.uid());

DROP POLICY IF EXISTS "submitter_insert_own_requests" ON transcript_requests;
CREATE POLICY "submitter_insert_own_requests" ON transcript_requests
  FOR INSERT WITH CHECK (submitted_by = auth.uid());

DROP POLICY IF EXISTS "admin_view_all_requests" ON transcript_requests;
CREATE POLICY "admin_view_all_requests" ON transcript_requests
  FOR ALL USING (
    firm_id = (SELECT firm_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'ADMIN'
  );

CREATE INDEX IF NOT EXISTS idx_requests_status ON transcript_requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_firm_id ON transcript_requests(firm_id);
CREATE INDEX IF NOT EXISTS idx_requests_submitted_by ON transcript_requests(submitted_by);
CREATE INDEX IF NOT EXISTS idx_requests_reviewed_by ON transcript_requests(reviewed_by) WHERE reviewed_by IS NOT NULL;

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS source_request_id UUID REFERENCES transcript_requests(id),
  ADD COLUMN IF NOT EXISTS created_by_role TEXT;

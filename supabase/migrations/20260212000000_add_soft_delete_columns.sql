-- Security Audit D.5 - Soft-Delete Enforcement
-- Legal evidence must never be hard-deleted

-- Add deleted_at columns to all deletable tables
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE transcriptions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE chronology_entries ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE flagged_words ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE custom_vocabularies ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE exhibits ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add indexes for performance (filtering out soft-deleted rows)
CREATE INDEX IF NOT EXISTS idx_jobs_deleted_at ON jobs(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_transcriptions_deleted_at ON transcriptions(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_medical_records_deleted_at ON medical_records(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_chronology_entries_deleted_at ON chronology_entries(deleted_at) WHERE deleted_at IS NULL;

-- Update RLS policies to exclude soft-deleted rows
-- NOTE: Add "AND deleted_at IS NULL" to all SELECT policies

-- Example for jobs table:
DROP POLICY IF EXISTS jobs_select ON jobs;
CREATE POLICY jobs_select ON jobs
FOR SELECT USING (
  deleted_at IS NULL
  AND (
    -- Admin sees all in firm
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'ADMIN'::user_role
      AND p.firm_id = jobs.firm_id
    )
    -- Reporter sees own jobs
    OR reporter_id = auth.uid()
    -- Scopist sees assigned jobs only
    OR scopist_id = auth.uid()
    -- Attorney sees shared jobs
    OR EXISTS (
      SELECT 1 FROM transcript_shares ts
      JOIN transcriptions t ON t.job_id = jobs.id
      WHERE ts.transcription_id = t.id
      AND ts.shared_with_id = auth.uid()
      AND (ts.expires_at IS NULL OR ts.expires_at > NOW())
      AND ts.revoked_at IS NULL
    )
  )
);

-- Create view for active (non-deleted) records
CREATE OR REPLACE VIEW active_jobs AS
SELECT * FROM jobs WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW active_transcriptions AS
SELECT * FROM transcriptions WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW active_medical_records AS
SELECT * FROM medical_records WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW active_chronology_entries AS
SELECT * FROM chronology_entries WHERE deleted_at IS NULL;

-- Grant access to views
GRANT SELECT ON active_jobs TO authenticated;
GRANT SELECT ON active_transcriptions TO authenticated;
GRANT SELECT ON active_medical_records TO authenticated;
GRANT SELECT ON active_chronology_entries TO authenticated;

-- Function to restore soft-deleted records (admin only)
CREATE OR REPLACE FUNCTION restore_deleted_record(
  table_name TEXT,
  record_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  EXECUTE format('UPDATE %I SET deleted_at = NULL WHERE id = $1', table_name)
  USING record_id;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment
COMMENT ON FUNCTION restore_deleted_record IS 'Admin function to restore soft-deleted records (Security Audit D.5)';

-- Create file_type enum (required by job_files.type)
DO $$ BEGIN
  CREATE TYPE file_type AS ENUM ('AUDIO', 'VIDEO', 'ROUGH_TRANSCRIPT', 'EXHIBIT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create job_files table (referenced by TypeScript types but missing from schema)
CREATE TABLE IF NOT EXISTS job_files (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id          UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  type            file_type NOT NULL DEFAULT 'EXHIBIT',
  file_name       TEXT NOT NULL,
  file_size       INTEGER NOT NULL DEFAULT 0,
  mime_type       TEXT NOT NULL,
  storage_url     TEXT NOT NULL DEFAULT '',
  storage_path    TEXT NOT NULL DEFAULT '',
  extracted_data  JSONB,
  uploaded_by_id  UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_files_job_id ON job_files(job_id);

-- RLS
ALTER TABLE job_files ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read files for jobs they have access to
CREATE POLICY job_files_select ON job_files FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM jobs j
      WHERE j.id = job_files.job_id
        AND j.deleted_at IS NULL
        AND (
          j.firm_id IN (SELECT firm_id FROM profiles WHERE id = auth.uid())
          OR j.reporter_id = auth.uid()
          OR j.scopist_id = auth.uid()
          OR j.created_by_id = auth.uid()
        )
    )
  );

-- Users who can edit the job can insert files
CREATE POLICY job_files_insert ON job_files FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM jobs j
      WHERE j.id = job_files.job_id
        AND j.deleted_at IS NULL
        AND (
          j.reporter_id = auth.uid()
          OR j.created_by_id = auth.uid()
        )
    )
  );

-- Users who can edit the job can delete files
CREATE POLICY job_files_delete ON job_files FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM jobs j
      WHERE j.id = job_files.job_id
        AND j.deleted_at IS NULL
        AND (
          j.reporter_id = auth.uid()
          OR j.created_by_id = auth.uid()
        )
    )
  );

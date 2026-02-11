-- ═══════════════════════════════════════════════════════════════
-- Phase 10: Medical Document Intake & AI Chronology
-- supabase/migrations/20260211_medical_records_chronology.sql
-- ═══════════════════════════════════════════════════════════════

-- Medical record status enum
DO $$ BEGIN
  CREATE TYPE medical_record_status AS ENUM (
    'UPLOADED',
    'PROCESSING',
    'EXTRACTED',
    'FAILED',
    'ARCHIVED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Chronology entry source type enum
DO $$ BEGIN
  CREATE TYPE chronology_source_type AS ENUM (
    'AI_EXTRACTED',
    'MANUAL',
    'EDITED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Medical Records Table ──────────────────────────────────────
-- Stores uploaded medical PDFs linked to a job/case
CREATE TABLE IF NOT EXISTS medical_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,

  -- File metadata
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size_bytes INTEGER NOT NULL DEFAULT 0,
  mime_type TEXT NOT NULL DEFAULT 'application/pdf',
  page_count INTEGER,

  -- Processing state
  status medical_record_status NOT NULL DEFAULT 'UPLOADED',
  error_message TEXT,

  -- Extraction metadata (populated after Claude processing)
  document_type TEXT,          -- e.g., 'Hospital Records', 'Radiology Report', 'Physical Therapy Notes'
  provider_name TEXT,          -- e.g., 'Dr. Smith', 'Memorial Hospital'
  facility_name TEXT,          -- e.g., 'Memorial Hospital', 'Austin Radiology Center'
  date_range_start DATE,       -- Earliest date found in document
  date_range_end DATE,         -- Latest date found in document
  patient_name TEXT,           -- Patient name extracted from document
  extraction_summary TEXT,     -- Brief AI-generated summary of document contents
  extraction_raw_json JSONB,   -- Full Claude API response for audit/debugging

  -- Tracking
  uploaded_by_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- ── Chronology Entries Table ──────────────────────────────────
-- Individual dated events extracted from medical records
CREATE TABLE IF NOT EXISTS chronology_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  medical_record_id UUID REFERENCES medical_records(id) ON DELETE SET NULL,

  -- Event data
  event_date DATE NOT NULL,
  event_date_end DATE,          -- For date ranges (e.g., hospitalization 1/5 - 1/12)
  date_precision TEXT NOT NULL DEFAULT 'DAY', -- DAY, MONTH, YEAR (for imprecise dates)

  -- Content
  provider TEXT,                -- Provider/facility for this specific entry
  category TEXT NOT NULL,       -- e.g., 'Visit', 'Surgery', 'Imaging', 'Lab', 'Prescription', 'Diagnosis'
  summary TEXT NOT NULL,        -- One-line summary of the event
  details TEXT,                 -- Expanded details/findings
  page_reference TEXT,          -- Page number(s) in source document

  -- Source tracking
  source_type chronology_source_type NOT NULL DEFAULT 'AI_EXTRACTED',
  source_document_name TEXT,    -- Original file name for reference
  confidence REAL DEFAULT 1.0,  -- AI confidence score (0.0-1.0)

  -- Edit tracking
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  verified_by_id UUID REFERENCES users(id),
  verified_at TIMESTAMPTZ,

  -- Tracking
  created_by_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_medical_records_job_id ON medical_records(job_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_status ON medical_records(status);
CREATE INDEX IF NOT EXISTS idx_medical_records_uploaded_by ON medical_records(uploaded_by_id);

CREATE INDEX IF NOT EXISTS idx_chronology_entries_job_id ON chronology_entries(job_id);
CREATE INDEX IF NOT EXISTS idx_chronology_entries_medical_record ON chronology_entries(medical_record_id);
CREATE INDEX IF NOT EXISTS idx_chronology_entries_event_date ON chronology_entries(event_date);
CREATE INDEX IF NOT EXISTS idx_chronology_entries_category ON chronology_entries(category);

-- ── Updated_at triggers ───────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_medical_records_updated_at ON medical_records;
CREATE TRIGGER trg_medical_records_updated_at
  BEFORE UPDATE ON medical_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_chronology_entries_updated_at ON chronology_entries;
CREATE TRIGGER trg_chronology_entries_updated_at
  BEFORE UPDATE ON chronology_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── RLS Policies ──────────────────────────────────────────────
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE chronology_entries ENABLE ROW LEVEL SECURITY;

-- Medical records: accessible by job participants and admins
CREATE POLICY medical_records_select ON medical_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM jobs j
      WHERE j.id = medical_records.job_id
      AND (
        j."reporterId" = auth.uid()
        OR j."scopistId" = auth.uid()
        OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'ADMIN')
      )
    )
  );

CREATE POLICY medical_records_insert ON medical_records
  FOR INSERT WITH CHECK (
    uploaded_by_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM jobs j
      WHERE j.id = medical_records.job_id
      AND (
        j."reporterId" = auth.uid()
        OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'ADMIN')
      )
    )
  );

CREATE POLICY medical_records_update ON medical_records
  FOR UPDATE USING (
    uploaded_by_id = auth.uid()
    OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'ADMIN')
  );

CREATE POLICY medical_records_delete ON medical_records
  FOR DELETE USING (
    uploaded_by_id = auth.uid()
    OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'ADMIN')
  );

-- Chronology entries: same access as medical records
CREATE POLICY chronology_entries_select ON chronology_entries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM jobs j
      WHERE j.id = chronology_entries.job_id
      AND (
        j."reporterId" = auth.uid()
        OR j."scopistId" = auth.uid()
        OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'ADMIN')
      )
    )
  );

CREATE POLICY chronology_entries_insert ON chronology_entries
  FOR INSERT WITH CHECK (
    created_by_id = auth.uid()
  );

CREATE POLICY chronology_entries_update ON chronology_entries
  FOR UPDATE USING (
    created_by_id = auth.uid()
    OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'ADMIN')
  );

CREATE POLICY chronology_entries_delete ON chronology_entries
  FOR DELETE USING (
    created_by_id = auth.uid()
    OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'ADMIN')
  );

-- ── Comments ──────────────────────────────────────────────────
COMMENT ON TABLE medical_records IS 'Uploaded medical PDFs linked to jobs for AI chronology extraction';
COMMENT ON TABLE chronology_entries IS 'Dated medical events extracted from records, forming case chronology';
COMMENT ON COLUMN medical_records.extraction_raw_json IS 'Full Claude API response stored for audit trail';
COMMENT ON COLUMN chronology_entries.date_precision IS 'DAY=exact date, MONTH=only month known, YEAR=only year known';
COMMENT ON COLUMN chronology_entries.confidence IS 'AI extraction confidence 0.0-1.0, 1.0 for manual entries';

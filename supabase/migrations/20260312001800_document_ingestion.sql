-- Migration 018: Document Ingestion Pipeline

CREATE TABLE IF NOT EXISTS deposition_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  uploaded_by UUID NOT NULL REFERENCES profiles(id),
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size_bytes INTEGER,
  mime_type TEXT,
  source_url TEXT,
  document_type TEXT,
  parse_status TEXT NOT NULL DEFAULT 'pending',
  parse_error TEXT,
  parsed_at TIMESTAMPTZ,
  extraction_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE deposition_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "firm_isolation_deposition_documents" ON deposition_documents;
CREATE POLICY "firm_isolation_deposition_documents" ON deposition_documents
  USING (firm_id = (SELECT firm_id FROM profiles WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_depdocs_job_id ON deposition_documents(job_id) WHERE job_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_depdocs_firm_id ON deposition_documents(firm_id);
CREATE INDEX IF NOT EXISTS idx_depdocs_status ON deposition_documents(parse_status);

CREATE TABLE IF NOT EXISTS case_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  document_id UUID REFERENCES deposition_documents(id) ON DELETE CASCADE,
  cause_number TEXT,
  case_style TEXT,
  court_name TEXT,
  court_number TEXT,
  county TEXT,
  state TEXT DEFAULT 'Texas',
  court_reporter_firm TEXT,
  court_reporter_name TEXT,
  videographer TEXT,
  raw_extraction JSONB,
  confidence_score NUMERIC(3,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE case_metadata ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "firm_isolation_case_metadata" ON case_metadata;
CREATE POLICY "firm_isolation_case_metadata" ON case_metadata
  USING (firm_id = (SELECT firm_id FROM profiles WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_casemeta_job_id ON case_metadata(job_id) WHERE job_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_casemeta_cause ON case_metadata(cause_number) WHERE cause_number IS NOT NULL;

CREATE TABLE IF NOT EXISTS case_parties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  case_metadata_id UUID NOT NULL REFERENCES case_metadata(id) ON DELETE CASCADE,
  party_name TEXT NOT NULL,
  party_type TEXT NOT NULL,
  is_deponent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE case_parties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "firm_isolation_case_parties" ON case_parties;
CREATE POLICY "firm_isolation_case_parties" ON case_parties
  USING (firm_id = (SELECT firm_id FROM profiles WHERE id = auth.uid()));

CREATE TABLE IF NOT EXISTS case_attorneys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  case_metadata_id UUID NOT NULL REFERENCES case_metadata(id) ON DELETE CASCADE,
  attorney_name TEXT NOT NULL,
  law_firm TEXT,
  role TEXT,
  represents TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  phone TEXT,
  fax TEXT,
  email TEXT,
  delivery_format TEXT,
  is_rush BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE case_attorneys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "firm_isolation_case_attorneys" ON case_attorneys;
CREATE POLICY "firm_isolation_case_attorneys" ON case_attorneys
  USING (firm_id = (SELECT firm_id FROM profiles WHERE id = auth.uid()));

CREATE TABLE IF NOT EXISTS deposition_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  case_metadata_id UUID NOT NULL REFERENCES case_metadata(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  deponent_name TEXT NOT NULL,
  deposition_date DATE,
  start_time TIME,
  end_time TIME,
  timezone TEXT DEFAULT 'America/Chicago',
  location TEXT,
  is_remote BOOLEAN DEFAULT FALSE,
  remote_platform TEXT,
  remote_link TEXT,
  is_videotaped BOOLEAN DEFAULT FALSE,
  includes_duces_tecum BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE deposition_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "firm_isolation_deposition_sessions" ON deposition_sessions;
CREATE POLICY "firm_isolation_deposition_sessions" ON deposition_sessions
  USING (firm_id = (SELECT firm_id FROM profiles WHERE id = auth.uid()));

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS case_metadata_id UUID REFERENCES case_metadata(id),
  ADD COLUMN IF NOT EXISTS intake_document_id UUID REFERENCES deposition_documents(id);

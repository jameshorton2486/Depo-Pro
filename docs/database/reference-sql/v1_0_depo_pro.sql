-- ============================================================================
-- Depo-Pro Supabase Schema v1.0
-- ============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
CREATE TYPE firm_role AS ENUM (
  'ADMIN',
  'ATTORNEY',
  'PARALEGAL',
  'COURT_REPORTER',
  'SCOPIST'
);

CREATE TYPE demand_status AS ENUM (
  'DRAFT',
  'FINAL'
);

-- ============================================================================
-- Core Tables
-- ============================================================================

-- Firms
CREATE TABLE firms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE firms IS 'Tenant table for law firms or legal organizations.';

-- Users (profile table tied to auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX users_email_unique ON users(email);
COMMENT ON TABLE users IS 'Application profile for authenticated users (linked to auth.users).';

-- Firm memberships
CREATE TABLE firm_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role firm_role NOT NULL,
  title TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (firm_id, user_id)
);

CREATE INDEX idx_firm_memberships_firm ON firm_memberships(firm_id);
CREATE INDEX idx_firm_memberships_user ON firm_memberships(user_id);
COMMENT ON TABLE firm_memberships IS 'User-to-firm role assignments with tenant isolation.';

-- Matters
CREATE TABLE matters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  matter_number TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'OPEN',
  opened_at DATE,
  closed_at DATE,
  created_by UUID REFERENCES users(id),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_matters_firm ON matters(firm_id);
COMMENT ON TABLE matters IS 'Legal matters/cases belonging to a firm.';

-- Depositions
CREATE TABLE depositions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id UUID NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
  deponent_name TEXT NOT NULL,
  deposition_date DATE,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'SCHEDULED',
  created_by UUID REFERENCES users(id),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_depositions_matter ON depositions(matter_id);
COMMENT ON TABLE depositions IS 'Depositions scheduled under a legal matter.';

-- Transcripts
CREATE TABLE transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deposition_id UUID NOT NULL REFERENCES depositions(id) ON DELETE CASCADE,
  matter_id UUID NOT NULL REFERENCES matters(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  version INTEGER NOT NULL DEFAULT 1,
  transcript_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  segments JSONB NOT NULL DEFAULT '[]'::jsonb,
  speakers JSONB NOT NULL DEFAULT '[]'::jsonb,
  full_text TEXT,
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finalized_at TIMESTAMPTZ
);

CREATE INDEX idx_transcripts_deposition ON transcripts(deposition_id);
CREATE INDEX idx_transcripts_matter ON transcripts(matter_id);
COMMENT ON TABLE transcripts IS 'Structured deposition transcripts with JSONB storage for segments and speakers.';

-- Exhibits
CREATE TABLE exhibits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id UUID NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
  deposition_id UUID REFERENCES depositions(id) ON DELETE SET NULL,
  label TEXT NOT NULL,
  description TEXT,
  file_url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_exhibits_matter ON exhibits(matter_id);
CREATE INDEX idx_exhibits_deposition ON exhibits(deposition_id);
COMMENT ON TABLE exhibits IS 'Exhibit metadata and file references tied to matters/depositions.';

-- Transcript ↔ Exhibit references
CREATE TABLE transcript_exhibit_refs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcript_id UUID NOT NULL REFERENCES transcripts(id) ON DELETE CASCADE,
  exhibit_id UUID NOT NULL REFERENCES exhibits(id) ON DELETE CASCADE,
  page_number INTEGER,
  line_number INTEGER,
  note TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tx_exhibit_transcript ON transcript_exhibit_refs(transcript_id);
CREATE INDEX idx_tx_exhibit_exhibit ON transcript_exhibit_refs(exhibit_id);
COMMENT ON TABLE transcript_exhibit_refs IS 'Links exhibits to transcript pages/lines.';

-- Medical records
CREATE TABLE medical_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id UUID NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
  provider TEXT,
  record_date DATE,
  document_url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_medical_records_matter ON medical_records(matter_id);
COMMENT ON TABLE medical_records IS 'Medical records tied to a legal matter.';

-- Medical chronology
CREATE TABLE medical_chronology (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id UUID NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
  record_id UUID REFERENCES medical_records(id) ON DELETE SET NULL,
  entry_date DATE,
  summary TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_medical_chronology_matter ON medical_chronology(matter_id);
CREATE INDEX idx_medical_chronology_record ON medical_chronology(record_id);
COMMENT ON TABLE medical_chronology IS 'Chronology entries derived from medical records.';

-- Demands
CREATE TABLE demands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id UUID NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
  status demand_status NOT NULL DEFAULT 'DRAFT',
  amount NUMERIC(12,2),
  currency TEXT NOT NULL DEFAULT 'USD',
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finalized_at TIMESTAMPTZ
);

CREATE INDEX idx_demands_matter ON demands(matter_id);
COMMENT ON TABLE demands IS 'Demand packages and settlement demand drafts.';

-- Audit logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_firm ON audit_logs(firm_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
COMMENT ON TABLE audit_logs IS 'Immutable audit events for legal defensibility.';

-- ============================================================================
-- Utility Functions
-- ============================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION current_user_firm_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
AS $$
  SELECT fm.firm_id
  FROM firm_memberships fm
  WHERE fm.user_id = auth.uid()
    AND fm.is_active = TRUE
$$;

CREATE OR REPLACE FUNCTION is_firm_member(target_firm_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM firm_memberships fm
    WHERE fm.firm_id = target_firm_id
      AND fm.user_id = auth.uid()
      AND fm.is_active = TRUE
  )
$$;

CREATE OR REPLACE FUNCTION has_firm_role(target_firm_id UUID, target_role firm_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM firm_memberships fm
    WHERE fm.firm_id = target_firm_id
      AND fm.user_id = auth.uid()
      AND fm.is_active = TRUE
      AND fm.role = target_role
  )
$$;

-- Audit logging
CREATE OR REPLACE FUNCTION log_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entity_id UUID;
  v_firm_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_entity_id := OLD.id;
  ELSE
    v_entity_id := NEW.id;
  END IF;

  v_firm_id := CASE TG_TABLE_NAME
    WHEN 'firms' THEN COALESCE(NEW.id, OLD.id)
    WHEN 'firm_memberships' THEN COALESCE(NEW.firm_id, OLD.firm_id)
    WHEN 'matters' THEN COALESCE(NEW.firm_id, OLD.firm_id)
    WHEN 'depositions' THEN (
      SELECT m.firm_id FROM matters m WHERE m.id = COALESCE(NEW.matter_id, OLD.matter_id)
    )
    WHEN 'transcripts' THEN (
      SELECT m.firm_id FROM matters m WHERE m.id = COALESCE(NEW.matter_id, OLD.matter_id)
    )
    WHEN 'exhibits' THEN (
      SELECT m.firm_id FROM matters m WHERE m.id = COALESCE(NEW.matter_id, OLD.matter_id)
    )
    WHEN 'medical_records' THEN (
      SELECT m.firm_id FROM matters m WHERE m.id = COALESCE(NEW.matter_id, OLD.matter_id)
    )
    WHEN 'medical_chronology' THEN (
      SELECT m.firm_id FROM matters m WHERE m.id = COALESCE(NEW.matter_id, OLD.matter_id)
    )
    WHEN 'demands' THEN (
      SELECT m.firm_id FROM matters m WHERE m.id = COALESCE(NEW.matter_id, OLD.matter_id)
    )
    WHEN 'transcript_exhibit_refs' THEN (
      SELECT m.firm_id
      FROM transcripts t
      JOIN matters m ON m.id = t.matter_id
      WHERE t.id = COALESCE(NEW.transcript_id, OLD.transcript_id)
    )
    WHEN 'audit_logs' THEN COALESCE(NEW.firm_id, OLD.firm_id)
    ELSE NULL
  END;

  IF v_firm_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  INSERT INTO audit_logs (
    firm_id,
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata,
    created_at
  ) VALUES (
    v_firm_id,
    COALESCE(
      auth.uid(),
      (to_jsonb(NEW)->>'updated_by')::uuid,
      (to_jsonb(NEW)->>'created_by')::uuid,
      (to_jsonb(OLD)->>'updated_by')::uuid,
      (to_jsonb(OLD)->>'created_by')::uuid
    ),
    TG_OP,
    TG_TABLE_NAME,
    v_entity_id,
    jsonb_build_object(
      'table', TG_TABLE_NAME,
      'action', TG_OP
    ),
    NOW()
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ============================================================================
-- Updated-at triggers
-- ============================================================================

CREATE TRIGGER trg_firms_updated_at
  BEFORE UPDATE ON firms
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_firm_memberships_updated_at
  BEFORE UPDATE ON firm_memberships
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_matters_updated_at
  BEFORE UPDATE ON matters
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_depositions_updated_at
  BEFORE UPDATE ON depositions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_transcripts_updated_at
  BEFORE UPDATE ON transcripts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_exhibits_updated_at
  BEFORE UPDATE ON exhibits
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_medical_records_updated_at
  BEFORE UPDATE ON medical_records
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_medical_chronology_updated_at
  BEFORE UPDATE ON medical_chronology
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_demands_updated_at
  BEFORE UPDATE ON demands
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- Audit triggers (all main tables)
-- ============================================================================

CREATE TRIGGER trg_audit_firms
  AFTER INSERT OR UPDATE OR DELETE ON firms
  FOR EACH ROW EXECUTE FUNCTION log_audit();

CREATE TRIGGER trg_audit_firm_memberships
  AFTER INSERT OR UPDATE OR DELETE ON firm_memberships
  FOR EACH ROW EXECUTE FUNCTION log_audit();

CREATE TRIGGER trg_audit_matters
  AFTER INSERT OR UPDATE OR DELETE ON matters
  FOR EACH ROW EXECUTE FUNCTION log_audit();

CREATE TRIGGER trg_audit_depositions
  AFTER INSERT OR UPDATE OR DELETE ON depositions
  FOR EACH ROW EXECUTE FUNCTION log_audit();

CREATE TRIGGER trg_audit_transcripts
  AFTER INSERT OR UPDATE OR DELETE ON transcripts
  FOR EACH ROW EXECUTE FUNCTION log_audit();

CREATE TRIGGER trg_audit_exhibits
  AFTER INSERT OR UPDATE OR DELETE ON exhibits
  FOR EACH ROW EXECUTE FUNCTION log_audit();

CREATE TRIGGER trg_audit_transcript_exhibit_refs
  AFTER INSERT OR UPDATE OR DELETE ON transcript_exhibit_refs
  FOR EACH ROW EXECUTE FUNCTION log_audit();

CREATE TRIGGER trg_audit_medical_records
  AFTER INSERT OR UPDATE OR DELETE ON medical_records
  FOR EACH ROW EXECUTE FUNCTION log_audit();

CREATE TRIGGER trg_audit_medical_chronology
  AFTER INSERT OR UPDATE OR DELETE ON medical_chronology
  FOR EACH ROW EXECUTE FUNCTION log_audit();

CREATE TRIGGER trg_audit_demands
  AFTER INSERT OR UPDATE OR DELETE ON demands
  FOR EACH ROW EXECUTE FUNCTION log_audit();

-- ============================================================================
-- Row Level Security
-- ============================================================================

ALTER TABLE firms ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE firm_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE matters ENABLE ROW LEVEL SECURITY;
ALTER TABLE depositions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE exhibits ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcript_exhibit_refs ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_chronology ENABLE ROW LEVEL SECURITY;
ALTER TABLE demands ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Firms
CREATE POLICY firms_select ON firms
  FOR SELECT USING (is_firm_member(id));

CREATE POLICY firms_insert ON firms
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY firms_update ON firms
  FOR UPDATE USING (has_firm_role(id, 'ADMIN'));

CREATE POLICY firms_delete ON firms
  FOR DELETE USING (has_firm_role(id, 'ADMIN'));

-- Users
CREATE POLICY users_select ON users
  FOR SELECT USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM firm_memberships fm
      JOIN firm_memberships self_fm ON self_fm.firm_id = fm.firm_id
      WHERE fm.user_id = users.id
        AND self_fm.user_id = auth.uid()
        AND fm.is_active = TRUE
        AND self_fm.is_active = TRUE
    )
  );

CREATE POLICY users_update ON users
  FOR UPDATE USING (id = auth.uid());

-- Firm memberships
CREATE POLICY firm_memberships_select ON firm_memberships
  FOR SELECT USING (firm_id IN (SELECT * FROM current_user_firm_ids()));

CREATE POLICY firm_memberships_insert ON firm_memberships
  FOR INSERT WITH CHECK (has_firm_role(firm_id, 'ADMIN'));

CREATE POLICY firm_memberships_update ON firm_memberships
  FOR UPDATE USING (has_firm_role(firm_id, 'ADMIN'));

CREATE POLICY firm_memberships_delete ON firm_memberships
  FOR DELETE USING (has_firm_role(firm_id, 'ADMIN'));

-- Matters
CREATE POLICY matters_select ON matters
  FOR SELECT USING (firm_id IN (SELECT * FROM current_user_firm_ids()));

CREATE POLICY matters_insert ON matters
  FOR INSERT WITH CHECK (firm_id IN (SELECT * FROM current_user_firm_ids()));

CREATE POLICY matters_update ON matters
  FOR UPDATE USING (firm_id IN (SELECT * FROM current_user_firm_ids()));

CREATE POLICY matters_delete ON matters
  FOR DELETE USING (firm_id IN (SELECT * FROM current_user_firm_ids()));

-- Depositions
CREATE POLICY depositions_select ON depositions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM matters m
      WHERE m.id = depositions.matter_id
        AND m.firm_id IN (SELECT * FROM current_user_firm_ids())
    )
  );

CREATE POLICY depositions_insert ON depositions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM matters m
      WHERE m.id = depositions.matter_id
        AND m.firm_id IN (SELECT * FROM current_user_firm_ids())
    )
  );

CREATE POLICY depositions_update ON depositions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM matters m
      WHERE m.id = depositions.matter_id
        AND m.firm_id IN (SELECT * FROM current_user_firm_ids())
    )
  );

CREATE POLICY depositions_delete ON depositions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM matters m
      WHERE m.id = depositions.matter_id
        AND m.firm_id IN (SELECT * FROM current_user_firm_ids())
    )
  );

-- Transcripts
CREATE POLICY transcripts_select ON transcripts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM matters m
      WHERE m.id = transcripts.matter_id
        AND m.firm_id IN (SELECT * FROM current_user_firm_ids())
    )
  );

CREATE POLICY transcripts_insert ON transcripts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM matters m
      WHERE m.id = transcripts.matter_id
        AND (
          has_firm_role(m.firm_id, 'COURT_REPORTER')
          OR has_firm_role(m.firm_id, 'SCOPIST')
          OR has_firm_role(m.firm_id, 'ADMIN')
        )
    )
  );

CREATE POLICY transcripts_update ON transcripts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM matters m
      WHERE m.id = transcripts.matter_id
        AND (
          has_firm_role(m.firm_id, 'COURT_REPORTER')
          OR has_firm_role(m.firm_id, 'SCOPIST')
          OR has_firm_role(m.firm_id, 'ADMIN')
        )
    )
  );

CREATE POLICY transcripts_delete ON transcripts
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM matters m
      WHERE m.id = transcripts.matter_id
        AND (
          has_firm_role(m.firm_id, 'COURT_REPORTER')
          OR has_firm_role(m.firm_id, 'SCOPIST')
          OR has_firm_role(m.firm_id, 'ADMIN')
        )
    )
  );

-- Exhibits
CREATE POLICY exhibits_select ON exhibits
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM matters m
      WHERE m.id = exhibits.matter_id
        AND m.firm_id IN (SELECT * FROM current_user_firm_ids())
    )
  );

CREATE POLICY exhibits_insert ON exhibits
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM matters m
      WHERE m.id = exhibits.matter_id
        AND m.firm_id IN (SELECT * FROM current_user_firm_ids())
    )
  );

CREATE POLICY exhibits_update ON exhibits
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM matters m
      WHERE m.id = exhibits.matter_id
        AND m.firm_id IN (SELECT * FROM current_user_firm_ids())
    )
  );

CREATE POLICY exhibits_delete ON exhibits
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM matters m
      WHERE m.id = exhibits.matter_id
        AND m.firm_id IN (SELECT * FROM current_user_firm_ids())
    )
  );

-- Transcript ↔ Exhibit references
CREATE POLICY transcript_exhibit_refs_select ON transcript_exhibit_refs
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM transcripts t
      JOIN matters m ON m.id = t.matter_id
      WHERE t.id = transcript_exhibit_refs.transcript_id
        AND m.firm_id IN (SELECT * FROM current_user_firm_ids())
    )
  );

CREATE POLICY transcript_exhibit_refs_insert ON transcript_exhibit_refs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM transcripts t
      JOIN matters m ON m.id = t.matter_id
      WHERE t.id = transcript_exhibit_refs.transcript_id
        AND m.firm_id IN (SELECT * FROM current_user_firm_ids())
    )
  );

CREATE POLICY transcript_exhibit_refs_update ON transcript_exhibit_refs
  FOR UPDATE USING (
    EXISTS (
      SELECT 1
      FROM transcripts t
      JOIN matters m ON m.id = t.matter_id
      WHERE t.id = transcript_exhibit_refs.transcript_id
        AND m.firm_id IN (SELECT * FROM current_user_firm_ids())
    )
  );

CREATE POLICY transcript_exhibit_refs_delete ON transcript_exhibit_refs
  FOR DELETE USING (
    EXISTS (
      SELECT 1
      FROM transcripts t
      JOIN matters m ON m.id = t.matter_id
      WHERE t.id = transcript_exhibit_refs.transcript_id
        AND m.firm_id IN (SELECT * FROM current_user_firm_ids())
    )
  );

-- Medical records
CREATE POLICY medical_records_select ON medical_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM matters m
      WHERE m.id = medical_records.matter_id
        AND m.firm_id IN (SELECT * FROM current_user_firm_ids())
    )
  );

CREATE POLICY medical_records_insert ON medical_records
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM matters m
      WHERE m.id = medical_records.matter_id
        AND m.firm_id IN (SELECT * FROM current_user_firm_ids())
    )
  );

CREATE POLICY medical_records_update ON medical_records
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM matters m
      WHERE m.id = medical_records.matter_id
        AND m.firm_id IN (SELECT * FROM current_user_firm_ids())
    )
  );

CREATE POLICY medical_records_delete ON medical_records
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM matters m
      WHERE m.id = medical_records.matter_id
        AND m.firm_id IN (SELECT * FROM current_user_firm_ids())
    )
  );

-- Medical chronology
CREATE POLICY medical_chronology_select ON medical_chronology
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM matters m
      WHERE m.id = medical_chronology.matter_id
        AND m.firm_id IN (SELECT * FROM current_user_firm_ids())
    )
  );

CREATE POLICY medical_chronology_insert ON medical_chronology
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM matters m
      WHERE m.id = medical_chronology.matter_id
        AND m.firm_id IN (SELECT * FROM current_user_firm_ids())
    )
  );

CREATE POLICY medical_chronology_update ON medical_chronology
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM matters m
      WHERE m.id = medical_chronology.matter_id
        AND m.firm_id IN (SELECT * FROM current_user_firm_ids())
    )
  );

CREATE POLICY medical_chronology_delete ON medical_chronology
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM matters m
      WHERE m.id = medical_chronology.matter_id
        AND m.firm_id IN (SELECT * FROM current_user_firm_ids())
    )
  );

-- Demands
CREATE POLICY demands_select ON demands
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM matters m
      WHERE m.id = demands.matter_id
        AND m.firm_id IN (SELECT * FROM current_user_firm_ids())
    )
  );

CREATE POLICY demands_insert ON demands
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM matters m
      WHERE m.id = demands.matter_id
        AND (
          has_firm_role(m.firm_id, 'ATTORNEY')
          OR has_firm_role(m.firm_id, 'PARALEGAL')
          OR has_firm_role(m.firm_id, 'ADMIN')
        )
    )
  );

CREATE POLICY demands_update ON demands
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM matters m
      WHERE m.id = demands.matter_id
        AND (
          has_firm_role(m.firm_id, 'ATTORNEY')
          OR has_firm_role(m.firm_id, 'ADMIN')
        )
    )
  );

CREATE POLICY demands_delete ON demands
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM matters m
      WHERE m.id = demands.matter_id
        AND (
          has_firm_role(m.firm_id, 'ATTORNEY')
          OR has_firm_role(m.firm_id, 'ADMIN')
        )
    )
  );

-- Audit logs
CREATE POLICY audit_logs_select ON audit_logs
  FOR SELECT USING (has_firm_role(firm_id, 'ADMIN'));

CREATE POLICY audit_logs_insert ON audit_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

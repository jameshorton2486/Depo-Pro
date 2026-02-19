-- ═══════════════════════════════════════════════════════════════════════
-- DEPO-PRO v2.2 — TARGETED MULTI-TENANT MIGRATION
-- Based on ACTUAL schema audit of 87 existing tables
-- ═══════════════════════════════════════════════════════════════════════
--
-- WHAT THIS DOES:
--   ✅ Creates 4 NEW tables: organizations, organization_memberships,
--      org_connections, tasks
--   ✅ Extends the existing user_role enum with new roles
--   ✅ Adds columns to existing jobs table
--   ✅ Adds RLS policies to new tables
--   ✅ Creates triggers and functions for new tables
--   ✅ Creates indexes for new tables
--
-- WHAT THIS DOES NOT DO:
--   ❌ Does NOT recreate existing tables (Case, Invoice, calendar_events, etc.)
--   ❌ Does NOT modify frozen systems (transcriptions, flagged_words, etc.)
--   ❌ Does NOT drop any columns or tables
--   ❌ Does NOT modify existing RLS policies
--
-- EXISTING TABLES CONFIRMED PRESENT (DO NOT RECREATE):
--   PascalCase: Case, CaseAttorney, CaseDocument, CaseMembership,
--     Invoice, InvoiceLineItem, Notification, JobAssignment, Exhibit,
--     AttorneyProfile, BillingAccount, BillingRate, TranscriptAccess, etc.
--   snake_case: profiles, firms, jobs, transcriptions, flagged_words,
--     calendar_events, event_participants, audit_log, etc.
--
-- EXECUTION ORDER:
--   Part 1: Extend user_role enum + add new enums
--   Part 2: Create organizations table
--   Part 3: Create organization_memberships table
--   Part 4: Create org_connections table
--   Part 5: Create tasks table
--   Part 6: Extend jobs table (add columns)
--   Part 7: Triggers & Functions
--   Part 8: Indexes
--   Part 9: RLS Policies (new tables ONLY)
--   Part 10: Data Migration (firms → organizations)
--
-- ⚠️  BACK UP BEFORE RUNNING. TEST ON STAGING FIRST.
-- ═══════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────
-- PART 1: EXTEND ENUMS
-- ─────────────────────────────────────────────────────────────────────

-- Extend existing user_role enum with new roles for multi-tenant
-- PostgreSQL does not support IF NOT EXISTS for ALTER TYPE, so we
-- use a DO block with exception handling.

DO $$ BEGIN
  ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'AGENCY_OWNER';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'AGENCY_MANAGER';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'REPORTER';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'VIDEOGRAPHER';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'INTERPRETER';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'FIRM_OWNER';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'FIRM_MANAGER';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'PARALEGAL';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- New enums for multi-tenant tables
DO $$ BEGIN
  CREATE TYPE org_type AS ENUM ('AGENCY', 'FIRM');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE membership_status AS ENUM (
    'ACTIVE', 'INACTIVE', 'PENDING_APPROVAL', 'SUSPENDED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE relationship_type AS ENUM ('EMPLOYEE', 'CONTRACTOR');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE connection_status AS ENUM (
    'PENDING', 'ACTIVE', 'SUSPENDED', 'TERMINATED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE task_type AS ENUM ('AUTO', 'MANUAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE task_status AS ENUM (
    'PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'BLOCKED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE task_priority AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE billing_plan AS ENUM (
    'FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ─────────────────────────────────────────────────────────────────────
-- PART 2: ORGANIZATIONS TABLE
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS organizations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type          org_type NOT NULL,
  name          TEXT NOT NULL,
  slug          TEXT UNIQUE,
  owner_id      UUID REFERENCES auth.users(id),
  billing_email TEXT,
  billing_plan  billing_plan DEFAULT 'FREE',
  phone         TEXT,
  address_line1 TEXT,
  address_city  TEXT,
  address_state TEXT,
  address_zip   TEXT,
  logo_url      TEXT,
  settings      JSONB DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);


-- ─────────────────────────────────────────────────────────────────────
-- PART 3: ORGANIZATION MEMBERSHIPS TABLE
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS organization_memberships (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id            UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role              user_role NOT NULL,
  is_primary        BOOLEAN DEFAULT false,
  relationship_type relationship_type DEFAULT 'EMPLOYEE',
  status            membership_status DEFAULT 'ACTIVE',
  rate_sheet        JSONB,
  joined_at         TIMESTAMPTZ DEFAULT now(),
  left_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, org_id)
);


-- ─────────────────────────────────────────────────────────────────────
-- PART 4: ORG CONNECTIONS TABLE
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS org_connections (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id       UUID NOT NULL REFERENCES organizations(id),
  agency_id     UUID NOT NULL REFERENCES organizations(id),
  status        connection_status DEFAULT 'PENDING',
  initiated_by  UUID REFERENCES auth.users(id),
  accepted_by   UUID REFERENCES auth.users(id),
  accepted_at   TIMESTAMPTZ,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(firm_id, agency_id)
);


-- ─────────────────────────────────────────────────────────────────────
-- PART 5: TASKS TABLE
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tasks (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              UUID NOT NULL REFERENCES organizations(id),
  job_id              UUID REFERENCES jobs(id) ON DELETE CASCADE,
  title               TEXT NOT NULL,
  description         TEXT,
  type                task_type DEFAULT 'MANUAL',
  status              task_status DEFAULT 'PENDING',
  priority            task_priority DEFAULT 'NORMAL',
  assigned_to         UUID REFERENCES auth.users(id),
  assigned_by         UUID REFERENCES auth.users(id),
  depends_on_task_id  UUID REFERENCES tasks(id),
  due_date            TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  blocks_status       TEXT,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);


-- ─────────────────────────────────────────────────────────────────────
-- PART 6: EXTEND EXISTING JOBS TABLE
-- ─────────────────────────────────────────────────────────────────────
-- These columns support multi-tenant job routing.
-- All added as NULLABLE to avoid breaking existing data.

DO $$ BEGIN
  ALTER TABLE jobs ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
EXCEPTION WHEN undefined_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE jobs ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES organizations(id);
EXCEPTION WHEN undefined_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE jobs ADD COLUMN IF NOT EXISTS connection_id UUID REFERENCES org_connections(id);
EXCEPTION WHEN undefined_column THEN NULL;
END $$;

-- The following columns may already exist from v1.3.
-- ADD COLUMN IF NOT EXISTS is safe to run.
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS is_remote BOOLEAN DEFAULT false;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS meeting_link TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS videographer_id UUID;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS interpreter_id UUID;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS interpreter_language TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS estimated_duration_hrs DECIMAL;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS actual_duration_hrs DECIMAL;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS page_count INTEGER;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add org_id to profiles for the transition period
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);


-- ─────────────────────────────────────────────────────────────────────
-- PART 7: TRIGGERS & FUNCTIONS
-- ─────────────────────────────────────────────────────────────────────

-- Auto-update updated_at on new tables
CREATE OR REPLACE FUNCTION update_updated_at_v2()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['organizations', 'tasks'])
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS set_updated_at_v2 ON %I;
       CREATE TRIGGER set_updated_at_v2 BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION update_updated_at_v2();',
      tbl, tbl
    );
  END LOOP;
END $$;

-- Enforce single is_primary per user
CREATE OR REPLACE FUNCTION enforce_single_primary_membership()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_primary = true THEN
    UPDATE organization_memberships
    SET is_primary = false
    WHERE user_id = NEW.user_id
      AND id != NEW.id
      AND is_primary = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_primary ON organization_memberships;
CREATE TRIGGER enforce_primary
  BEFORE INSERT OR UPDATE ON organization_memberships
  FOR EACH ROW
  EXECUTE FUNCTION enforce_single_primary_membership();

-- Enforce org_connections type correctness
CREATE OR REPLACE FUNCTION validate_connection_org_types()
RETURNS TRIGGER AS $$
DECLARE
  f_type org_type;
  a_type org_type;
BEGIN
  SELECT type INTO f_type FROM organizations WHERE id = NEW.firm_id;
  SELECT type INTO a_type FROM organizations WHERE id = NEW.agency_id;
  IF f_type != 'FIRM' THEN
    RAISE EXCEPTION 'firm_id must reference a FIRM organization';
  END IF;
  IF a_type != 'AGENCY' THEN
    RAISE EXCEPTION 'agency_id must reference an AGENCY organization';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_conn_types ON org_connections;
CREATE TRIGGER validate_conn_types
  BEFORE INSERT OR UPDATE ON org_connections
  FOR EACH ROW
  EXECUTE FUNCTION validate_connection_org_types();

-- Enforce task dependencies
CREATE OR REPLACE FUNCTION enforce_task_dependency()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'IN_PROGRESS' AND NEW.depends_on_task_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = NEW.depends_on_task_id AND t.status = 'COMPLETED'
    ) THEN
      RAISE EXCEPTION 'Cannot start task: dependency (%) not completed', NEW.depends_on_task_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_task_dep ON tasks;
CREATE TRIGGER enforce_task_dep
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION enforce_task_dependency();


-- ─────────────────────────────────────────────────────────────────────
-- PART 8: INDEXES
-- ─────────────────────────────────────────────────────────────────────

-- Organizations
CREATE INDEX IF NOT EXISTS idx_organizations_type ON organizations(type);
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_owner ON organizations(owner_id);

-- Memberships (critical — used in every org-scoped query)
CREATE INDEX IF NOT EXISTS idx_org_memberships_user_org
  ON organization_memberships(user_id, org_id);
CREATE INDEX IF NOT EXISTS idx_org_memberships_org_status
  ON organization_memberships(org_id, status);
CREATE INDEX IF NOT EXISTS idx_org_memberships_user_primary
  ON organization_memberships(user_id, is_primary) WHERE is_primary = true;

-- Connections
CREATE INDEX IF NOT EXISTS idx_connections_firm ON org_connections(firm_id);
CREATE INDEX IF NOT EXISTS idx_connections_agency ON org_connections(agency_id);
CREATE INDEX IF NOT EXISTS idx_connections_status ON org_connections(status);

-- Tasks
CREATE INDEX IF NOT EXISTS idx_tasks_org ON tasks(org_id);
CREATE INDEX IF NOT EXISTS idx_tasks_job ON tasks(job_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_dep ON tasks(depends_on_task_id);

-- Jobs (extend existing indexes for new columns)
CREATE INDEX IF NOT EXISTS idx_jobs_org ON jobs(org_id);
CREATE INDEX IF NOT EXISTS idx_jobs_agency ON jobs(agency_id);
CREATE INDEX IF NOT EXISTS idx_jobs_connection ON jobs(connection_id);


-- ─────────────────────────────────────────────────────────────────────
-- PART 9: RLS POLICIES (NEW TABLES ONLY)
-- ─────────────────────────────────────────────────────────────────────
-- Existing tables (jobs, profiles, firms, calendar_events, etc.)
-- already have RLS from v1.3. DO NOT overwrite them.

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- ── Organizations ──────────────────────────────────────────────────

CREATE POLICY org_select ON organizations FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM organization_memberships om
    WHERE om.user_id = auth.uid()
      AND om.org_id = organizations.id
      AND om.status = 'ACTIVE'
  )
);

CREATE POLICY org_insert ON organizations FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY org_update ON organizations FOR UPDATE USING (
  auth.uid() = owner_id
);

-- ── Organization Memberships ───────────────────────────────────────

CREATE POLICY membership_select ON organization_memberships FOR SELECT USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM organization_memberships om2
    WHERE om2.user_id = auth.uid()
      AND om2.org_id = organization_memberships.org_id
      AND om2.status = 'ACTIVE'
  )
);

CREATE POLICY membership_insert ON organization_memberships FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      WHERE om.user_id = auth.uid()
        AND om.org_id = organization_memberships.org_id
        AND om.status = 'ACTIVE'
        AND om.role IN ('AGENCY_OWNER', 'AGENCY_MANAGER', 'FIRM_OWNER', 'FIRM_MANAGER', 'ADMIN')
    )
    OR user_id = auth.uid()
  );

CREATE POLICY membership_update ON organization_memberships FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM organization_memberships om
    WHERE om.user_id = auth.uid()
      AND om.org_id = organization_memberships.org_id
      AND om.status = 'ACTIVE'
      AND om.role IN ('AGENCY_OWNER', 'AGENCY_MANAGER', 'FIRM_OWNER', 'FIRM_MANAGER', 'ADMIN')
  )
);

-- ── Organization Connections ───────────────────────────────────────

CREATE POLICY connection_select ON org_connections FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM organization_memberships om
    WHERE om.user_id = auth.uid()
      AND om.status = 'ACTIVE'
      AND (om.org_id = org_connections.firm_id OR om.org_id = org_connections.agency_id)
  )
);

CREATE POLICY connection_insert ON org_connections FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      WHERE om.user_id = auth.uid()
        AND om.status = 'ACTIVE'
        AND (om.org_id = org_connections.firm_id OR om.org_id = org_connections.agency_id)
        AND om.role IN ('AGENCY_OWNER', 'AGENCY_MANAGER', 'FIRM_OWNER', 'FIRM_MANAGER', 'ADMIN')
    )
  );

CREATE POLICY connection_update ON org_connections FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM organization_memberships om
    WHERE om.user_id = auth.uid()
      AND om.status = 'ACTIVE'
      AND (om.org_id = org_connections.firm_id OR om.org_id = org_connections.agency_id)
      AND om.role IN ('AGENCY_OWNER', 'AGENCY_MANAGER', 'FIRM_OWNER', 'FIRM_MANAGER', 'ADMIN')
  )
);

-- ── Tasks ──────────────────────────────────────────────────────────

CREATE POLICY task_select ON tasks FOR SELECT USING (
  assigned_to = auth.uid()
  OR EXISTS (
    SELECT 1 FROM organization_memberships om
    WHERE om.user_id = auth.uid()
      AND om.org_id = tasks.org_id
      AND om.status = 'ACTIVE'
  )
);

CREATE POLICY task_insert ON tasks FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM organization_memberships om
    WHERE om.user_id = auth.uid()
      AND om.org_id = tasks.org_id
      AND om.status = 'ACTIVE'
      AND om.role IN ('AGENCY_OWNER', 'AGENCY_MANAGER', 'FIRM_OWNER', 'FIRM_MANAGER', 'ADMIN')
  )
);

CREATE POLICY task_update ON tasks FOR UPDATE USING (
  assigned_to = auth.uid()
  OR EXISTS (
    SELECT 1 FROM organization_memberships om
    WHERE om.user_id = auth.uid()
      AND om.org_id = tasks.org_id
      AND om.status = 'ACTIVE'
      AND om.role IN ('AGENCY_OWNER', 'AGENCY_MANAGER', 'FIRM_OWNER', 'FIRM_MANAGER', 'ADMIN')
  )
);


-- ─────────────────────────────────────────────────────────────────────
-- PART 10: DATA MIGRATION
-- ─────────────────────────────────────────────────────────────────────
-- ⚠️  UNCOMMENT AND RUN ONE BLOCK AT A TIME.
-- ⚠️  VERIFY COUNTS AFTER EACH BLOCK.

-- Step 10A: Pre-migration snapshot
/*
SELECT 'firms' AS tbl, COUNT(*) FROM firms
UNION ALL SELECT 'profiles', COUNT(*) FROM profiles
UNION ALL SELECT 'jobs', COUNT(*) FROM jobs
UNION ALL SELECT 'transcriptions', COUNT(*) FROM transcriptions
UNION ALL SELECT 'flagged_words', COUNT(*) FROM flagged_words;
*/

-- Step 10B: Migrate existing firms → organizations
-- Preserves firm.id as organization.id so existing FKs stay valid.
/*
INSERT INTO organizations (id, type, name, owner_id, phone, billing_email, settings, created_at)
SELECT
  f.id,
  'FIRM'::org_type,
  f.name,
  (SELECT p.id FROM profiles p WHERE p.firm_id = f.id AND p.role = 'ADMIN' LIMIT 1),
  f.phone,
  f.email,
  f.settings,
  f.created_at
FROM firms f
WHERE f.is_active = true
ON CONFLICT (id) DO NOTHING;
*/

-- Step 10C: Create memberships from existing profiles
/*
INSERT INTO organization_memberships (user_id, org_id, role, is_primary, status, joined_at)
SELECT
  p.id,
  p.firm_id,
  p.role::text::user_role,  -- Cast existing role to enum
  true,
  'ACTIVE'::membership_status,
  p.created_at
FROM profiles p
WHERE p.firm_id IS NOT NULL
  AND p.is_active = true
ON CONFLICT (user_id, org_id) DO NOTHING;
*/

-- Step 10D: Backfill jobs.org_id from jobs.firm_id
/*
UPDATE jobs
SET org_id = firm_id
WHERE org_id IS NULL AND firm_id IS NOT NULL;
*/

-- Step 10E: Verify migration
/*
SELECT 'organizations' AS tbl, COUNT(*) FROM organizations
UNION ALL SELECT 'memberships', COUNT(*) FROM organization_memberships
UNION ALL SELECT 'jobs_with_org', COUNT(*) FROM jobs WHERE org_id IS NOT NULL
UNION ALL SELECT 'jobs_without_org', COUNT(*) FROM jobs WHERE org_id IS NULL;
*/


-- ═══════════════════════════════════════════════════════════════════════
-- END OF v2.2 MIGRATION
-- ═══════════════════════════════════════════════════════════════════════
--
-- WHAT DID NOT CHANGE (existing tables preserved):
--   profiles, firms, jobs (core columns), transcriptions, flagged_words,
--   calendar_events, event_participants, Case, CaseAttorney, CaseDocument,
--   CaseMembership, Invoice, InvoiceLineItem, Notification, JobAssignment,
--   AttorneyProfile, BillingAccount, BillingRate, Exhibit, audit_log,
--   transcript_shares, all WKT tables, all medical tables, etc.
--
-- ROLE TRANSITION NOTE:
--   The user_role enum now has BOTH old values (ADMIN, COURT_REPORTER,
--   SCOPIST, ATTORNEY) and new values (AGENCY_OWNER, REPORTER, etc.).
--   Old profiles keep their old roles. New memberships use new roles.
--   The app code should handle BOTH during transition via LEGACY_ROLE_MAP.
-- ═══════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════
-- DEPO-PRO — RLS POLICY PACK (Full Audit + Hardening)
-- ═══════════════════════════════════════════════════════════════════════
--
-- This file has TWO sections:
--   Section A: RLS AUDIT QUERIES (run these to see current state)
--   Section B: NEW POLICIES for v2.2 tables (from migration file)
--   Section C: HARDENING POLICIES for existing PascalCase CRM tables
--
-- The core transcription tables (profiles, firms, jobs, transcriptions,
-- flagged_words, audit_log, etc.) already have comprehensive RLS from
-- v1.3 schema. DO NOT modify those policies.
--
-- The PascalCase CRM tables (Case, Invoice, Notification, etc.) may
-- or may not have RLS. This file audits and fills gaps.
-- ═══════════════════════════════════════════════════════════════════════


-- ═════════════════════════════════════════════════════════════════════
-- SECTION A: RLS AUDIT QUERIES (Read-Only — Run First)
-- ═════════════════════════════════════════════════════════════════════

-- A1: Which tables have RLS enabled?
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY rowsecurity DESC, tablename;

-- A2: List ALL existing policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- A3: Tables WITHOUT RLS (security gaps)
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = false
ORDER BY tablename;

-- A4: Tables WITH RLS but NO policies (locked out!)
SELECT t.tablename
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
WHERE t.schemaname = 'public'
  AND t.rowsecurity = true
  AND p.policyname IS NULL
ORDER BY t.tablename;


-- ═════════════════════════════════════════════════════════════════════
-- SECTION B: v2.2 NEW TABLE POLICIES
-- (Already included in migration file — repeated here for reference)
-- ═════════════════════════════════════════════════════════════════════

-- See depo-pro-v2.2-migration-CORRECTED.sql Part 9 for:
--   organizations, organization_memberships, org_connections, tasks


-- ═════════════════════════════════════════════════════════════════════
-- SECTION C: HARDENING POLICIES FOR EXISTING PASCALCASE CRM TABLES
-- ═════════════════════════════════════════════════════════════════════
-- These tables were created for CRM features but may lack RLS.
-- Run Section A first to identify which tables need policies.
-- Only run the policies below for tables where RLS is NOT enabled.
--
-- IMPORTANT: The "firmId" columns in PascalCase tables reference
-- the firms.id (which after migration = organizations.id).
-- During transition, check BOTH firm_id on profiles AND org_id.
-- ═════════════════════════════════════════════════════════════════════

-- Helper function: Check if user belongs to a firm/org
CREATE OR REPLACE FUNCTION user_belongs_to_firm(check_firm_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND firm_id = check_firm_id
      AND is_active = true
  ) OR EXISTS (
    SELECT 1 FROM organization_memberships
    WHERE user_id = auth.uid()
      AND org_id = check_firm_id
      AND status = 'ACTIVE'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;


-- ── Case (PascalCase) ──────────────────────────────────────────────
-- Already has CaseStatus enum. firmId scoped.

DO $$ BEGIN
  ALTER TABLE "Case" ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY case_select_rls ON "Case" FOR SELECT USING (
    user_belongs_to_firm("firmId")
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY case_insert_rls ON "Case" FOR INSERT WITH CHECK (
    user_belongs_to_firm("firmId")
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY case_update_rls ON "Case" FOR UPDATE USING (
    user_belongs_to_firm("firmId")
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ── CaseAttorney ──────────────────────────────────────────────────

DO $$ BEGIN
  ALTER TABLE "CaseAttorney" ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY case_attorney_rls ON "CaseAttorney" FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "Case" c
      WHERE c.id = "CaseAttorney"."caseId"
        AND user_belongs_to_firm(c."firmId")
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ── CaseDocument ──────────────────────────────────────────────────

DO $$ BEGIN
  ALTER TABLE "CaseDocument" ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY case_document_rls ON "CaseDocument" FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "Case" c
      WHERE c.id = "CaseDocument"."caseId"
        AND user_belongs_to_firm(c."firmId")
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ── CaseMembership ────────────────────────────────────────────────

DO $$ BEGIN
  ALTER TABLE "CaseMembership" ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY case_membership_rls ON "CaseMembership" FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "Case" c
      WHERE c.id = "CaseMembership"."caseId"
        AND user_belongs_to_firm(c."firmId")
    )
    OR "CaseMembership"."userId" = auth.uid()::text
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ── Invoice (PascalCase) ──────────────────────────────────────────
-- billingAccountId scoped. Both from-org and to-org should see.

DO $$ BEGIN
  ALTER TABLE "Invoice" ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY invoice_rls ON "Invoice" FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "BillingAccount" ba
      WHERE ba.id = "Invoice"."billingAccountId"
        AND user_belongs_to_firm(ba."firmId")
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ── InvoiceLineItem ───────────────────────────────────────────────

DO $$ BEGIN
  ALTER TABLE "InvoiceLineItem" ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY line_item_rls ON "InvoiceLineItem" FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "Invoice" i
      JOIN "BillingAccount" ba ON ba.id = i."billingAccountId"
      WHERE i.id = "InvoiceLineItem"."invoiceId"
        AND user_belongs_to_firm(ba."firmId")
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ── Notification (PascalCase) ─────────────────────────────────────
-- User-scoped only.

DO $$ BEGIN
  ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY notification_rls ON "Notification" FOR SELECT USING (
    "userId" = auth.uid()::text
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY notification_update_rls ON "Notification" FOR UPDATE USING (
    "userId" = auth.uid()::text
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ── JobAssignment ─────────────────────────────────────────────────

DO $$ BEGIN
  ALTER TABLE "JobAssignment" ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY job_assignment_rls ON "JobAssignment" FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM jobs j
      WHERE j.id = "JobAssignment"."jobId"::uuid
        AND (j.reporter_id = auth.uid() OR j.scopist_id = auth.uid()
             OR user_belongs_to_firm(j.firm_id))
    )
    OR "JobAssignment"."assigneeId" = auth.uid()::text
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ── AttorneyProfile ───────────────────────────────────────────────

DO $$ BEGIN
  ALTER TABLE "AttorneyProfile" ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY attorney_profile_rls ON "AttorneyProfile" FOR SELECT USING (
    "userId" = auth.uid()::text
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY attorney_profile_update_rls ON "AttorneyProfile" FOR UPDATE USING (
    "userId" = auth.uid()::text
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ── Exhibit ───────────────────────────────────────────────────────

DO $$ BEGIN
  ALTER TABLE "Exhibit" ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY exhibit_rls ON "Exhibit" FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "Case" c
      WHERE c.id = "Exhibit"."caseId"
        AND user_belongs_to_firm(c."firmId")
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ── BillingAccount / BillingRate ──────────────────────────────────

DO $$ BEGIN
  ALTER TABLE "BillingAccount" ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY billing_account_rls ON "BillingAccount" FOR SELECT USING (
    user_belongs_to_firm("firmId")
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "BillingRate" ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY billing_rate_rls ON "BillingRate" FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "BillingAccount" ba
      WHERE ba.id = "BillingRate"."billingAccountId"
        AND user_belongs_to_firm(ba."firmId")
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ── Message ───────────────────────────────────────────────────────

DO $$ BEGIN
  ALTER TABLE "Message" ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY message_rls ON "Message" FOR SELECT USING (
    "senderId" = auth.uid()::text
    OR "recipientId" = auth.uid()::text
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ═════════════════════════════════════════════════════════════════════
-- VERIFICATION: Run after applying policies
-- ═════════════════════════════════════════════════════════════════════

-- Confirm all CRM tables now have RLS:
/*
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'Case', 'CaseAttorney', 'CaseDocument', 'CaseMembership',
    'Invoice', 'InvoiceLineItem', 'Notification', 'JobAssignment',
    'AttorneyProfile', 'Exhibit', 'BillingAccount', 'BillingRate',
    'Message', 'organizations', 'organization_memberships',
    'org_connections', 'tasks'
  )
ORDER BY tablename;
-- All should show rowsecurity = true
*/

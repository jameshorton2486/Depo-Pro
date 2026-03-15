-- ============================================================
-- Corrective Migration: Schema Corrections
-- Addresses findings from docs/SCHEMA_AUDIT_REPORT.md
--
-- 1. Extend job_status enum with lifecycle statuses used by the app
-- 2. Extend user_role enum with v2.2 roles used by lib/enums/roles.ts
-- 3. Add missing columns to jobs table (zoom_link, audio_processing_mode)
-- 4. Fix transcript_shares RLS column name mismatch (shared_with_id → shared_with)
-- 5. Add completed_at to jobs if missing
-- ============================================================

-- ============================================================
-- 1. Extend job_status enum
-- Base schema has: DRAFT, PENDING, PROCESSING, AI_COMPLETE, IN_REVIEW,
--   SCOPIST_COMPLETE, FINAL_REVIEW, COMPLETED, ARCHIVED, FAILED
-- App uses additional statuses from 02_JOB_LIFECYCLE_AND_NOTIFICATIONS.md
-- ============================================================
DO $$ BEGIN
  ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'CREATED';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'FILES_UPLOADED';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'ENHANCING_AUDIO';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'TRANSCRIBING';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'AI_REVIEWING';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'READY_FOR_EDIT';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'ASSIGNED';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'IN_EDIT';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'SUBMITTED_FOR_REVIEW';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'REVIEW_COMPLETE';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'CANCELLED';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 2. Extend user_role enum with v2.2 roles
-- Base schema has: ADMIN, COURT_REPORTER, SCOPIST, ATTORNEY
-- lib/enums/roles.ts defines 13 roles
-- ============================================================
DO $$ BEGIN
  ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'REPORTER';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'AGENCY_OWNER';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'AGENCY_MANAGER';
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

-- ============================================================
-- 3. Add missing columns to jobs table
-- zoom_link and audio_processing_mode are used in lib/intake/workflow.ts
-- but were never added to the jobs table in any migration
-- ============================================================
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS zoom_link TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS audio_processing_mode TEXT DEFAULT 'AUTOMATED';
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- ============================================================
-- 4. Fix transcript_shares RLS — column name mismatch
-- The soft-delete migration (20260212000000) references ts.shared_with_id
-- and ts.transcription_id, but the actual columns are shared_with and job_id.
-- This corrects the jobs_select policy to use the correct column names.
-- ============================================================

-- Drop and recreate the jobs_select policy that may have wrong column refs
-- Only recreate if the policy exists and references the wrong columns
DO $$
BEGIN
  -- Check if the problematic policy exists
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'jobs' AND policyname = 'jobs_select'
  ) THEN
    DROP POLICY IF EXISTS jobs_select ON jobs;

    CREATE POLICY jobs_select ON jobs FOR SELECT USING (
      -- Admin sees jobs in their firm
      EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
        AND p.role = 'ADMIN'
        AND p.firm_id = jobs.firm_id
      )
      OR
      -- Reporter sees own jobs
      jobs.reporter_id = auth.uid()
      OR
      jobs.created_by_id = auth.uid()
      OR
      -- Scopist sees assigned jobs
      jobs.scopist_id = auth.uid()
      OR
      -- Attorney sees jobs shared with them (correct column: shared_with, not shared_with_id)
      EXISTS (
        SELECT 1 FROM transcript_shares ts
        WHERE ts.job_id = jobs.id
        AND ts.shared_with = auth.uid()
        AND (ts.expires_at IS NULL OR ts.expires_at > NOW())
        AND ts.revoked_at IS NULL
      )
    );
  END IF;
END $$;

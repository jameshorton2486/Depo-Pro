-- ═══════════════════════════════════════════════════════════════════════
-- DEPO-PRO — SOFT DELETE MIGRATION
-- ═══════════════════════════════════════════════════════════════════════
-- Legal systems must never physically delete records.
-- jobs.deleted_at was already added in v2.2 migration.
-- This file adds deleted_at to transcriptions and flagged_words,
-- plus completed_at/completed_by to transcriptions for clean querying.
-- Safe to run multiple times (IF NOT EXISTS / IF NOT EXISTS).
-- ═══════════════════════════════════════════════════════════════════════

BEGIN;

-- ── transcriptions ────────────────────────────────────────────────────
ALTER TABLE transcriptions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE transcriptions ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE transcriptions ADD COLUMN IF NOT EXISTS completed_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transcriptions_not_deleted
  ON transcriptions(id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_transcriptions_completed
  ON transcriptions(completed_at) WHERE completed_at IS NOT NULL;

-- ── flagged_words ─────────────────────────────────────────────────────
ALTER TABLE flagged_words ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_flagged_words_not_deleted
  ON flagged_words(id) WHERE deleted_at IS NULL;

-- ── jobs (already has deleted_at from v2.2 migration — add index only) ──
CREATE INDEX IF NOT EXISTS idx_jobs_not_deleted
  ON jobs(id) WHERE deleted_at IS NULL;

COMMIT;

-- ── Verification ──────────────────────────────────────────────────────
/*
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name IN ('deleted_at', 'completed_at', 'completed_by')
  AND table_name IN ('jobs', 'transcriptions', 'flagged_words')
ORDER BY table_name, column_name;
*/

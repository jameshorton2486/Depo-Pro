-- =============================================================================
-- PHASE 4 MIGRATION: Policy and Version Models
-- prisma/migrations/add_policy_and_version_models.sql
--
-- Phase 4A-1: Policy model for policy-driven permissions
-- Phase 4B-1: TranscriptVersion model for versioned history
-- =============================================================================

-- Policy model for policy-driven permissions
CREATE TABLE IF NOT EXISTS "Policy" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "condition" JSONB NOT NULL,
  "action" TEXT NOT NULL,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Policy_pkey" PRIMARY KEY ("id")
);

-- Policy evaluation log
CREATE TABLE IF NOT EXISTS "PolicyEvaluation" (
  "id" TEXT NOT NULL,
  "policyId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "context" JSONB NOT NULL,
  "result" TEXT NOT NULL,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PolicyEvaluation_pkey" PRIMARY KEY ("id")
);

-- Transcript version model
CREATE TABLE IF NOT EXISTS "TranscriptVersion" (
  "id" TEXT NOT NULL,
  "transcriptionId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "versionType" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "contentJson" JSONB,
  "wordCount" INTEGER,
  "flaggedCount" INTEGER,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "metadata" JSONB,

  CONSTRAINT "TranscriptVersion_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX IF NOT EXISTS "PolicyEvaluation_policyId_idx" ON "PolicyEvaluation"("policyId");
CREATE INDEX IF NOT EXISTS "PolicyEvaluation_userId_idx" ON "PolicyEvaluation"("userId");
CREATE INDEX IF NOT EXISTS "PolicyEvaluation_createdAt_idx" ON "PolicyEvaluation"("createdAt");

CREATE UNIQUE INDEX IF NOT EXISTS "TranscriptVersion_transcriptionId_version_key" ON "TranscriptVersion"("transcriptionId", "version");
CREATE INDEX IF NOT EXISTS "TranscriptVersion_transcriptionId_idx" ON "TranscriptVersion"("transcriptionId");
CREATE INDEX IF NOT EXISTS "TranscriptVersion_createdBy_idx" ON "TranscriptVersion"("createdBy");

-- Foreign keys
ALTER TABLE "PolicyEvaluation" ADD CONSTRAINT "PolicyEvaluation_policyId_fkey" 
  FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PolicyEvaluation" ADD CONSTRAINT "PolicyEvaluation_userId_fkey" 
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TranscriptVersion" ADD CONSTRAINT "TranscriptVersion_transcriptionId_fkey" 
  FOREIGN KEY ("transcriptionId") REFERENCES "Transcription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TranscriptVersion" ADD CONSTRAINT "TranscriptVersion_createdBy_fkey" 
  FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

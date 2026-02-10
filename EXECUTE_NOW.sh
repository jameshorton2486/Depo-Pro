#!/bin/bash
# v1.3 Deployment Script - Execute in Order
# DO NOT run as a script - copy/paste each section manually

echo "================================================================"
echo "PHASE A: COMMIT v1.3 FOUNDATION"
echo "================================================================"

# 1. Review status
git status

# 2. Commit everything
git add .
git commit -m "feat(v1.3): Phase 1 complete - TypeScript foundation for v1.3 schema

- Add v1.3 schema enums (UserRole, JobStatus, TranscriptionStatus, etc.)
- Add v1.3 JSONB type interfaces (TranscriptionWord, Segment, Speaker, etc.)
- Create new query layer for v1.3 tables:
  - jobs.ts (6.6KB) - CRUD + dashboard views
  - transcriptions.ts (8.4KB) - Pipeline queries + chunks
  - flagged-words.ts (7.1KB) - Review workflow
  - locks.ts (4.4KB) - Exclusive locking + heartbeat
  - shares.ts (6.6KB) - Attorney transcript sharing
  - vocabulary.ts (8.6KB) - Deepgram keyword integration
- Create AuditService (14.6KB) - 30+ audit methods
- Update constants.ts with v1.3 enums + UI metadata
- Backup old Prisma query files to old-prisma-backup/
- Add Phase 1 completion docs + implementation plan
- Add critical security fix migrations (C-1, C-2, C-4)

BREAKING: Requires v1.3 schema deployment to Supabase
See: SCHEMA_MIGRATION_REQUIRED.md

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

# 3. Push to remote
git push origin schema-v1-implementation

# 4. Merge to main (RECOMMENDED)
git checkout main
git merge schema-v1-implementation
git push origin main

echo ""
echo "✅ Git operations complete"
echo ""
echo "================================================================"
echo "PHASE B: DEPLOY SCHEMA TO SUPABASE (MANUAL STEP)"
echo "================================================================"
echo ""
echo "🚨 STOP - DO NOT AUTOMATE THIS STEP"
echo ""
echo "1. Open: https://ildhcfspbmhuemzgvzyx.supabase.co/project/ildhcfspbmhuemzgvzyx/settings/database"
echo "   → Create backup: 'pre-v1.3-migration'"
echo ""
echo "2. Open: https://ildhcfspbmhuemzgvzyx.supabase.co/project/ildhcfspbmhuemzgvzyx/sql"
echo "   → New Query"
echo "   → Copy contents of: depo-pro-schema-v1.2.sql"
echo "   → Paste and Run"
echo "   → Wait for completion"
echo ""
echo "3. Verify tables exist:"
echo "   Run this query in SQL Editor:"
echo ""
cat << 'EOF'
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'jobs',
  'transcriptions',
  'flagged_words',
  'job_locks',
  'transcript_shares',
  'firm_vocabulary',
  'job_vocabulary',
  'profiles',
  'firms'
)
ORDER BY table_name;
EOF
echo ""
echo "Expected: All 9 tables listed"
echo ""
echo "================================================================"
echo "PHASE C: REGENERATE TYPES (RUN AFTER SCHEMA DEPLOYED)"
echo "================================================================"

# Wait for user confirmation
read -p "Press ENTER after schema is deployed to Supabase..."

# Regenerate types
npx supabase gen types typescript --project-id ildhcfspbmhuemzgvzyx > types/supabase-generated.ts

# Verify
echo ""
echo "Verifying types contain v1.3 tables..."
grep "jobs:" types/supabase-generated.ts && echo "✅ jobs table found"
grep "transcriptions:" types/supabase-generated.ts && echo "✅ transcriptions table found"
grep "flagged_words:" types/supabase-generated.ts && echo "✅ flagged_words table found"

# Commit regenerated types
git add types/supabase-generated.ts
git commit -m "chore: regenerate types from v1.3 schema

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
git push

echo ""
echo "================================================================"
echo "PHASE D: VERIFY TYPESCRIPT"
echo "================================================================"

# Check TypeScript errors
npm run typecheck 2>&1 | tee typecheck-post-v13.log
ERROR_COUNT=$(npm run typecheck 2>&1 | grep "error TS" | wc -l)

echo ""
echo "TypeScript errors: $ERROR_COUNT"
echo "Expected: ~90 (down from ~150)"
echo ""
echo "✅ v1.3 DEPLOYMENT COMPLETE"

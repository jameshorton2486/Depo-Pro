# 🚀 Deploy v1.3 Schema - Execution Checklist

**Status:** Ready to Execute
**Date:** 2026-02-09
**Branch:** `schema-v1-implementation`

---

## ✅ PHASE A: COMMIT v1.3 FOUNDATION (Safe - Do Now)

### 1. Review what's being committed
```bash
cd "C:\Users\james\depo-pro"
git status
```

**Expected new files:**
- ✅ `types/schema-enums.ts` - v1.3 enums
- ✅ `types/transcription.ts` - JSONB interfaces
- ✅ `types/supabase-generated.ts` - Generated types (will regenerate after schema deploy)
- ✅ `lib/supabase/queries/*.ts` - New query layer (7 files)
- ✅ `lib/services/audit.ts` - Audit service
- ✅ `lib/constants.ts` - Updated constants
- ✅ `docs/*.md` - Implementation docs
- ✅ `SCHEMA_MIGRATION_REQUIRED.md` - This guide
- ✅ `supabase/migrations/*.sql` - Critical fixes

### 2. Commit everything
```bash
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
```

### 3. Push to remote
```bash
git push origin schema-v1-implementation
```

### 4. (Optional) Merge to main now
```bash
# Only do this if you're fully committed to v1.3
git checkout main
git merge schema-v1-implementation
git push origin main
```

---

## ⚠️ PHASE B: DEPLOY v1.3 SCHEMA TO SUPABASE (Manual - Critical Step)

### 🔍 Pre-Check: Locate v1.3 Schema File

**Search for the schema file:**
```bash
# Check what schema files exist
ls -lh depo-pro-schema*.sql

# Look at the file
head -100 depo-pro-schema-v1.2.sql
```

**What to verify:**
- ✅ Contains `CREATE TABLE jobs` (not `Job`)
- ✅ Contains `CREATE TABLE transcriptions` (not `Transcript`)
- ✅ Contains `CREATE TABLE flagged_words`
- ✅ Contains `CREATE TABLE job_locks`
- ✅ Contains `CREATE TABLE transcript_shares`
- ✅ Contains `CREATE TYPE user_role AS ENUM`
- ✅ Contains RLS policies everywhere

**If the file is v1.2 but contains v1.3 tables:** It was likely misnamed. Use it.
**If the file is truly v1.2 (old structure):** STOP and tell me.

### 🗄️ Backup Current Database (Critical!)

1. Go to Supabase Dashboard
2. Project Settings → Database → Backups
3. Create manual backup: "pre-v1.3-migration-backup"
4. Wait for completion
5. **Do not proceed until backup complete**

### 🚀 Deploy Schema

**URL:** https://ildhcfspbmhuemzgvzyx.supabase.co/project/ildhcfspbmhuemzgvzyx/sql

**Steps:**
1. Open SQL Editor (link above)
2. Click "New Query"
3. Open `depo-pro-schema-v1.2.sql` (or v1.3 if found)
4. Copy entire contents
5. Paste into SQL Editor
6. **Read through the SQL** - look for DROP statements
7. Click "Run" (or Ctrl+Enter)
8. Wait for execution (may take 30-60 seconds)
9. Check for errors in output panel

**Expected output:**
```
CREATE TYPE
CREATE TYPE
CREATE TABLE
CREATE TABLE
...
CREATE POLICY
CREATE POLICY
...
CREATE FUNCTION
CREATE FUNCTION
```

**If errors occur:** STOP and save the error message.

### ✅ Verify Deployment

Run this query in SQL Editor to confirm:
```sql
-- Should return v1.3 tables
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
```

**Expected result:** All 9 tables listed

**Also check enums:**
```sql
SELECT typname
FROM pg_type
WHERE typtype = 'e'
AND typname LIKE '%status'
ORDER BY typname;
```

**Expected:** `job_status`, `transcription_status`, `flagged_word_status`, etc.

---

## 🔄 PHASE C: REGENERATE TYPES (Required After Schema Deploy)

### Once schema is confirmed deployed:

```bash
cd "C:\Users\james\depo-pro"

# Regenerate types from NEW schema
npx supabase gen types typescript --project-id ildhcfspbmhuemzgvzyx > types/supabase-generated.ts

# Verify types are correct
grep "jobs:" types/supabase-generated.ts
grep "transcriptions:" types/supabase-generated.ts
grep "flagged_words:" types/supabase-generated.ts
```

**Should see:**
```typescript
jobs: {
  Row: {
    id: string
    case_name: string
    ...
  }
}
transcriptions: {
  Row: {
    id: string
    job_id: string
    ...
  }
}
```

**Should NOT see:** `Agency`, `Attorney`, `AIRule` (old Prisma tables)

### Commit the regenerated types

```bash
git add types/supabase-generated.ts
git commit -m "chore: regenerate types from v1.3 schema

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
git push
```

---

## 🔒 PHASE D: VERIFY TYPESCRIPT COMPILATION

```bash
# Should have WAY fewer errors now
npm run typecheck 2>&1 | tee typecheck-post-v13.log

# Count errors
npm run typecheck 2>&1 | grep "error TS" | wc -l
```

**Expected:**
- Before: ~150 errors (old schema mismatches)
- After: ~90 errors (old API routes still need Phase 2 updates)
- **New query files: 0 errors** ✅

**Errors should be:**
- ✅ Old API routes importing deleted query modules (expected - Phase 2 fix)
- ✅ Old enum usage `Role` vs `UserRole` (expected - Phase 2 fix)
- ❌ Errors in NEW query files (NOT expected - tell me)

---

## 📊 SUCCESS CRITERIA

All must be true to proceed to Phase 2:

- [ ] Git commit created with Phase 1 work
- [ ] Git pushed to remote (`schema-v1-implementation` or `main`)
- [ ] Supabase backup created
- [ ] v1.3 schema deployed to Supabase (no errors)
- [ ] All v1.3 tables exist in database (verified via SQL query)
- [ ] TypeScript types regenerated from v1.3 schema
- [ ] New types show `jobs`, `transcriptions`, `flagged_words` (not Agency/Attorney)
- [ ] TypeScript errors reduced from ~150 to ~90
- [ ] New query files have 0 TypeScript errors
- [ ] Documentation updated and committed

---

## 🚨 IF SOMETHING GOES WRONG

### Rollback Schema (if deployment fails)

1. Go to Supabase → Database → Backups
2. Restore "pre-v1.3-migration-backup"
3. Wait for restoration
4. Regenerate types from old schema
5. Tell me what happened

### Rollback Git (if needed)

```bash
# Undo last commit (keeps files)
git reset --soft HEAD~1

# Or discard everything
git checkout main
git branch -D schema-v1-implementation
```

---

## 📞 READY TO PROCEED?

**After completing all phases above, report ONE of:**

✅ **"All phases complete - v1.3 deployed successfully"**
- Include: table count, enum count, typecheck error count

❌ **"Schema deployment failed at [PHASE X]"**
- Include: error message, which step failed

⚠️ **"Schema file is v1.2 not v1.3"**
- Include: output of `head -100 depo-pro-schema-v1.2.sql`

---

**Current Status:** Waiting for execution ⏸️

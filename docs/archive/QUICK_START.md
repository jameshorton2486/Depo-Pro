# 🚀 Quick Start: Deploy v1.3 Now

**File Found:** `depo-pro-schema-v1.2.sql` ✅ (This IS v1.3 - just misnamed)
**Contains:** `jobs`, `transcriptions`, `flagged_words` tables + v1.3 enums ✅

---

## Copy/Paste These Commands (In Order)

### 1️⃣ Git Commit (Safe - Do Now)

```bash
cd "C:\Users\james\depo-pro"

# Commit Phase 1
git add .
git commit -m "feat(v1.3): Phase 1 complete - TypeScript foundation

- v1.3 schema enums + JSONB types
- Query layer (jobs, transcriptions, flagged-words, locks, shares, vocabulary)
- AuditService with 30+ methods
- Updated constants + docs
- Critical security fixes (C-1, C-2, C-4)

BREAKING: Requires v1.3 schema deployment

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

# Push
git push origin schema-v1-implementation

# Merge to main
git checkout main
git merge schema-v1-implementation
git push origin main
```

---

### 2️⃣ Deploy Schema (Manual - 5 Minutes)

**A. Create Backup First:**
1. https://ildhcfspbmhuemzgvzyx.supabase.co/project/ildhcfspbmhuemzgvzyx/settings/database
2. Backups → Create Backup → Name: `pre-v1.3-migration`
3. Wait for completion ⏳

**B. Deploy Schema:**
1. https://ildhcfspbmhuemzgvzyx.supabase.co/project/ildhcfspbmhuemzgvzyx/sql
2. New Query
3. Open file: `depo-pro-schema-v1.2.sql`
4. Copy entire contents
5. Paste into SQL Editor
6. Click "Run" (Ctrl+Enter)
7. Wait for "Finished" (30-60 seconds)

**C. Verify Deployment:**

Run this query:
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('jobs','transcriptions','flagged_words','job_locks','transcript_shares')
ORDER BY table_name;
```

Expected: 5 rows returned

---

### 3️⃣ Regenerate Types (Run After Schema Deploy)

```bash
cd "C:\Users\james\depo-pro"

# Generate from NEW schema
npx supabase gen types typescript --project-id ildhcfspbmhuemzgvzyx > types/supabase-generated.ts

# Verify
grep "jobs:" types/supabase-generated.ts
grep "transcriptions:" types/supabase-generated.ts

# Commit
git add types/supabase-generated.ts
git commit -m "chore: regenerate types from v1.3 schema

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
git push
```

---

### 4️⃣ Verify Success

```bash
# Check TypeScript
npm run typecheck 2>&1 | grep "Found" | tail -1

# Should show: ~90 errors (down from ~150)
# New query files: 0 errors ✅
```

---

## ✅ Done!

**Report back with:**
```
✅ Git pushed
✅ Schema deployed
✅ Types regenerated
✅ TypeScript errors: [NUMBER]
```

**Then:** Ready for Phase 2 (API Routes)

---

## 🚨 If Errors

**Schema deployment failed?**
- Copy error message
- Restore backup: Supabase → Database → Backups → Restore
- Tell me the error

**Types show Agency/Attorney instead of jobs/transcriptions?**
- Schema didn't deploy
- Check SQL Editor for errors
- Verify tables exist with verification query above

**TypeScript errors increased?**
- This is wrong
- Send me output of `npm run typecheck 2>&1 | head -50`

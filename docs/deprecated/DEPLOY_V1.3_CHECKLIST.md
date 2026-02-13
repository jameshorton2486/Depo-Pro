# Deploy v1.3 Schema — 6-Step Checklist

Follow these steps **in order**. Steps 1–3 are manual (Supabase Dashboard / SQL Editor). Steps 4–6 can be run via the script at the end.

---

## 1. Create Supabase backup

**Option A — Supabase Dashboard (recommended)**

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project.
2. Go to **Project Settings** → **Database**.
3. Under **Backups**, note the latest daily backup or click **Back up now** if available on your plan.

**Option B — pg_dump via CLI**

If you have database connection string in `.env.local`:

```powershell
# From project root. Requires PostgreSQL client (psql/pg_dump) in PATH.
$env:PGPASSWORD = "YOUR_DB_PASSWORD"
pg_dump -h db.ildhcfspbmhuemzgvzyx.supabase.co -p 5432 -U postgres -d postgres -F c -f "supabase/backup-before-v13-$(Get-Date -Format 'yyyyMMdd-HHmm').dump"
```

**Option C — Script (uses connection from env)**

```powershell
.\scripts\supabase-backup.ps1
```

After backup, proceed to step 2.

---

## 2. Deploy v1.3 schema SQL

1. Locate the v1.3 schema file:
   - **If in repo:** `supabase/depo-pro-schema-v1.3.sql` or `depo-pro-schema-v1.3.sql` at repo root.
   - **If from delivery:** Use the file you saved (e.g. `depo-pro-schema-v1.3.sql`).
2. Open **Supabase Dashboard** → **SQL Editor**.
3. Paste the **entire** contents of the v1.3 schema file.
4. Click **Run**.
5. Confirm no errors. Resolve any (e.g. extensions, existing objects) as needed.

---

## 3. Verify deployment

Run the verification query in **SQL Editor** (or use the script):

**File:** `supabase/verify-v13-deployment.sql`

```sql
-- Run in Supabase SQL Editor after deploying v1.3
-- Expect: one row per check with exists = true

SELECT 'profiles' AS object_name, EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') AS exists
UNION ALL SELECT 'firms', EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'firms')
UNION ALL SELECT 'jobs', EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'jobs')
UNION ALL SELECT 'transcriptions', EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'transcriptions')
UNION ALL SELECT 'flagged_words', EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'flagged_words')
UNION ALL SELECT 'transcript_integrity_chain', EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'transcript_integrity_chain')
UNION ALL SELECT 'cleanup_expired_locks', EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'cleanup_expired_locks');
```

If all `exists` are `true`, deployment is good. Proceed to step 4.

---

## 4. Regenerate types

From project root:

```powershell
npm run db:regenerate-types
```

Or run the full script (steps 4 + 5 + 6):

```powershell
npm run db:deploy-v13-types
```

---

## 5. Verify types

```powershell
npm run typecheck
```

Fix any type errors before committing.

---

## 6. Commit regenerated types

```powershell
git add types/supabase-generated.ts
git status
git commit -m "chore: regenerate Supabase types after v1.3 schema deployment"
git push origin feature/wkt-quiz-module
```

(Use your actual branch name if different.)

---

## Quick run (after steps 1–3 are done)

From project root:

```powershell
.\scripts\deploy-v13-regenerate-types.ps1
```

This runs steps 4, 5, and 6 (regenerate → typecheck → commit + push).

# Apply Review Sessions Migration

Since we're using a remote Supabase database, the migration needs to be applied via the Supabase Dashboard.

## Option 1: Supabase Dashboard (Recommended)

1. Go to https://supabase.com/dashboard
2. Select your project: `zgttwmgfxbphymtcttii`
3. Navigate to **SQL Editor** in the left sidebar
4. Click **+ New Query**
5. Copy the contents of `supabase/migrations/20260211_review_sessions_tracking.sql`
6. Paste into the SQL Editor
7. Click **Run** (or press Cmd/Ctrl + Enter)

**Expected Output:**
```
Success. No rows returned
```

## Option 2: Supabase CLI (if local Docker is running)

```bash
npx supabase db push
```

## Option 3: Direct SQL via psql

```bash
psql "$DATABASE_URL" \
  -f supabase/migrations/20260211_review_sessions_tracking.sql
```

## Verification

After applying the migration, verify it worked:

```sql
-- Check table exists
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'review_sessions'
ORDER BY ordinal_position;

-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'review_sessions';

-- Check indexes exist
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'review_sessions';

-- Check policies exist
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'review_sessions';
```

**Expected Results:**
- Table has 16 columns (id, transcription_id, user_id, job_id, started_at, ended_at, etc.)
- rowsecurity = true
- 4 indexes created
- 5 policies created (view own, insert own, update own, admins view all, etc.)

## Rollback (if needed)

```sql
DROP TABLE IF EXISTS public.review_sessions CASCADE;
```

## Testing After Migration

1. Start a review session on any job
2. Wait 30 seconds (auto-save interval)
3. Check data was saved:

```sql
SELECT
  id,
  user_id,
  job_id,
  started_at,
  active_duration_seconds,
  total_duration_seconds,
  words_reviewed,
  words_corrected,
  audio_replays,
  filters_used
FROM review_sessions
ORDER BY started_at DESC
LIMIT 5;
```

You should see at least one row with your user_id and incrementing duration values.

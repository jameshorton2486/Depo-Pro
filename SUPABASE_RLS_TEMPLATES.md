# Supabase RLS Templates for Depo-Pro

These are starter Row-Level Security (RLS) policies aligned to Depo-Pro's architecture.

**⚠️ Important:** These policies assume the service role is used only server-side in API routes. Client-side code should use the anon key with proper RLS policies.

## 🔐 profiles table (user-scoped)

```sql
-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own profile
CREATE POLICY "Users can read own profile"
ON profiles
FOR SELECT
USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
ON profiles
FOR UPDATE
USING (auth.uid() = id);

-- Allow users to insert their own profile (on signup)
CREATE POLICY "Users can insert own profile"
ON profiles
FOR INSERT
WITH CHECK (auth.uid() = id);
```

## 📁 cases table (owner-based)

```sql
-- Enable RLS
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;

-- Read own cases
CREATE POLICY "Read own cases"
ON cases
FOR SELECT
USING (auth.uid() = owner_id);

-- Create cases
CREATE POLICY "Create cases"
ON cases
FOR INSERT
WITH CHECK (auth.uid() = owner_id);

-- Update own cases
CREATE POLICY "Update own cases"
ON cases
FOR UPDATE
USING (auth.uid() = owner_id);

-- Delete own cases (if needed)
CREATE POLICY "Delete own cases"
ON cases
FOR DELETE
USING (auth.uid() = owner_id);
```

## 📅 calendar_events table

```sql
-- Enable RLS
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- Read own calendar events
CREATE POLICY "Read own calendar events"
ON calendar_events
FOR SELECT
USING (auth.uid() = user_id);

-- Write own calendar events
CREATE POLICY "Write own calendar events"
ON calendar_events
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Update own calendar events
CREATE POLICY "Update own calendar events"
ON calendar_events
FOR UPDATE
USING (auth.uid() = user_id);

-- Delete own calendar events
CREATE POLICY "Delete own calendar events"
ON calendar_events
FOR DELETE
USING (auth.uid() = user_id);
```

## 💼 jobs table (multi-role access)

```sql
-- Enable RLS
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- Read jobs: creator, assigned scopist, or admin
CREATE POLICY "Read accessible jobs"
ON jobs
FOR SELECT
USING (
  auth.uid() = created_by_id
  OR auth.uid() IN (
    SELECT scopist_id FROM job_assignments WHERE job_id = jobs.id
  )
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'
  )
);

-- Create jobs: any authenticated user
CREATE POLICY "Create jobs"
ON jobs
FOR INSERT
WITH CHECK (auth.uid() = created_by_id);

-- Update jobs: creator or admin
CREATE POLICY "Update accessible jobs"
ON jobs
FOR UPDATE
USING (
  auth.uid() = created_by_id
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'
  )
);
```

## 📝 notes table (job-scoped)

```sql
-- Enable RLS
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Read notes: users with access to the job
CREATE POLICY "Read accessible notes"
ON notes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM jobs
    WHERE jobs.id = notes.job_id
    AND (
      jobs.created_by_id = auth.uid()
      OR auth.uid() IN (
        SELECT scopist_id FROM job_assignments WHERE job_id = jobs.id
      )
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'
      )
    )
  )
);

-- Create notes: users with access to the job
CREATE POLICY "Create notes"
ON notes
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM jobs
    WHERE jobs.id = notes.job_id
    AND (
      jobs.created_by_id = auth.uid()
      OR auth.uid() IN (
        SELECT scopist_id FROM job_assignments WHERE job_id = jobs.id
      )
    )
  )
);
```

## 🔒 Service Role Usage

**Server-side only:** The service role key bypasses RLS and should only be used in:
- API routes (`app/api/**`)
- Server components
- Background jobs

**Never use service role:**
- Client components
- Middleware (use anon key with RLS)
- Browser-side code

## 🧪 Testing RLS Policies

```sql
-- Test as a specific user
SET ROLE authenticated;
SET request.jwt.claim.sub = 'user-uuid-here';

-- Test query
SELECT * FROM jobs;

-- Reset
RESET ROLE;
```

## 📚 Additional Resources

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [RLS Best Practices](https://supabase.com/docs/guides/auth/row-level-security#best-practices)

---

**Note:** These templates are starting points. Adjust based on your specific access patterns and business logic.

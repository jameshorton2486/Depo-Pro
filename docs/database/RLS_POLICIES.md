# 🔐 Row Level Security (RLS) Policy Drafts

**Status:** Draft Policies - Aligned to Supabase-Only Architecture  
**Date:** January 2025

---

## Overview

These RLS policies are baseline-safe and match the current architecture. They assume:

- Users are authenticated via Supabase Auth
- User roles are stored in `user_metadata.role`
- Access control is enforced at the database level
- Policies use `auth.uid()` for user identification

---

## 🔐 Jobs Table

### Read Policy
```sql
CREATE POLICY "jobs_read"
ON jobs
FOR SELECT
USING (
  -- Job creator can read
  created_by_id = auth.uid()
  OR
  -- Assigned user can read
  EXISTS (
    SELECT 1 FROM job_assignments
    WHERE job_assignments.job_id = jobs.id
      AND job_assignments.user_id = auth.uid()
      AND job_assignments.status = 'ACCEPTED'
  )
  OR
  -- Admin can read all
  (SELECT (raw_user_meta_data->>'role')::text FROM auth.users WHERE id = auth.uid()) = 'ADMIN'
);
```

### Insert Policy
```sql
CREATE POLICY "jobs_insert"
ON jobs
FOR INSERT
WITH CHECK (
  -- User can create jobs for their firm
  created_by_id = auth.uid()
  AND (
    firm_id IS NULL
    OR firm_id IN (
      SELECT firm_id FROM user_firms WHERE user_id = auth.uid()
    )
  )
);
```

### Update Policy
```sql
CREATE POLICY "jobs_update"
ON jobs
FOR UPDATE
USING (
  -- Job creator can update
  created_by_id = auth.uid()
  OR
  -- Admin can update
  (SELECT (raw_user_meta_data->>'role')::text FROM auth.users WHERE id = auth.uid()) = 'ADMIN'
);
```

### Delete Policy
```sql
CREATE POLICY "jobs_delete"
ON jobs
FOR DELETE
USING (
  -- Only creator or admin can delete
  created_by_id = auth.uid()
  OR
  (SELECT (raw_user_meta_data->>'role')::text FROM auth.users WHERE id = auth.uid()) = 'ADMIN'
);
```

---

## 🔐 Transcripts Table

### Read Policy
```sql
CREATE POLICY "transcripts_read"
ON transcripts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM jobs
    WHERE jobs.id = transcripts.job_id
      AND (
        -- Job creator can read transcript
        jobs.created_by_id = auth.uid()
        OR
        -- Assigned user can read transcript
        EXISTS (
          SELECT 1 FROM job_assignments
          WHERE job_assignments.job_id = jobs.id
            AND job_assignments.user_id = auth.uid()
            AND job_assignments.status = 'ACCEPTED'
        )
        OR
        -- Admin can read all
        (SELECT (raw_user_meta_data->>'role')::text FROM auth.users WHERE id = auth.uid()) = 'ADMIN'
      )
  )
);
```

### Insert Policy
```sql
CREATE POLICY "transcripts_insert"
ON transcripts
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM jobs
    WHERE jobs.id = transcripts.job_id
      AND (
        jobs.created_by_id = auth.uid()
        OR
        (SELECT (raw_user_meta_data->>'role')::text FROM auth.users WHERE id = auth.uid()) = 'ADMIN'
      )
  )
);
```

### Update Policy
```sql
CREATE POLICY "transcripts_update"
ON transcripts
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM jobs
    WHERE jobs.id = transcripts.job_id
      AND (
        jobs.created_by_id = auth.uid()
        OR
        EXISTS (
          SELECT 1 FROM job_assignments
          WHERE job_assignments.job_id = jobs.id
            AND job_assignments.user_id = auth.uid()
            AND job_assignments.status = 'ACCEPTED'
        )
        OR
        (SELECT (raw_user_meta_data->>'role')::text FROM auth.users WHERE id = auth.uid()) = 'ADMIN'
      )
  )
);
```

---

## 🔐 Job Notes Table

### Read/Write Policy
```sql
CREATE POLICY "notes_rw"
ON deposition_notes
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM jobs
    WHERE jobs.id = deposition_notes.job_id
      AND (
        -- Job creator can read/write notes
        jobs.created_by_id = auth.uid()
        OR
        -- Assigned scopist can read/write notes
        EXISTS (
          SELECT 1 FROM job_assignments
          WHERE job_assignments.job_id = jobs.id
            AND job_assignments.user_id = auth.uid()
            AND job_assignments.status = 'ACCEPTED'
        )
        OR
        -- Admin can read/write all
        (SELECT (raw_user_meta_data->>'role')::text FROM auth.users WHERE id = auth.uid()) = 'ADMIN'
      )
  )
);
```

### Insert Policy (Additional)
```sql
CREATE POLICY "notes_insert"
ON deposition_notes
FOR INSERT
WITH CHECK (
  -- Note creator must match authenticated user
  reporter_id = auth.uid()
  AND
  EXISTS (
    SELECT 1 FROM jobs
    WHERE jobs.id = deposition_notes.job_id
      AND jobs.created_by_id = auth.uid()
  )
);
```

---

## 🔐 Files Table

### Read Policy
```sql
CREATE POLICY "files_read"
ON files
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM jobs
    WHERE jobs.id = files.job_id
      AND (
        -- Job creator can read files
        jobs.created_by_id = auth.uid()
        OR
        -- Assigned user can read files
        EXISTS (
          SELECT 1 FROM job_assignments
          WHERE job_assignments.job_id = jobs.id
            AND job_assignments.user_id = auth.uid()
            AND job_assignments.status = 'ACCEPTED'
        )
        OR
        -- Admin can read all
        (SELECT (raw_user_meta_data->>'role')::text FROM auth.users WHERE id = auth.uid()) = 'ADMIN'
      )
  )
);
```

### Insert Policy
```sql
CREATE POLICY "files_insert"
ON files
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM jobs
    WHERE jobs.id = files.job_id
      AND (
        jobs.created_by_id = auth.uid()
        OR
        (SELECT (raw_user_meta_data->>'role')::text FROM auth.users WHERE id = auth.uid()) = 'ADMIN'
      )
  )
);
```

### Delete Policy
```sql
CREATE POLICY "files_delete"
ON files
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM jobs
    WHERE jobs.id = files.job_id
      AND (
        jobs.created_by_id = auth.uid()
        OR
        (SELECT (raw_user_meta_data->>'role')::text FROM auth.users WHERE id = auth.uid()) = 'ADMIN'
      )
  )
);
```

---

## 🔐 Calendar Events Table

### Read Policy
```sql
CREATE POLICY "calendar_events_read"
ON calendar_events
FOR SELECT
USING (
  -- User can read events from their firm
  firm_id IN (
    SELECT firm_id FROM user_firms WHERE user_id = auth.uid()
  )
  OR
  -- User can read events assigned to them
  assigned_reporter_id = auth.uid()
  OR
  -- Admin can read all
  (SELECT (raw_user_meta_data->>'role')::text FROM auth.users WHERE id = auth.uid()) = 'ADMIN'
);
```

### Insert Policy
```sql
CREATE POLICY "calendar_events_insert"
ON calendar_events
FOR INSERT
WITH CHECK (
  -- User can create events for their firm
  created_by_id = auth.uid()
  AND firm_id IN (
    SELECT firm_id FROM user_firms WHERE user_id = auth.uid()
  )
);
```

### Update Policy
```sql
CREATE POLICY "calendar_events_update"
ON calendar_events
FOR UPDATE
USING (
  -- Creator can update
  created_by_id = auth.uid()
  OR
  -- Assigned reporter can update
  assigned_reporter_id = auth.uid()
  OR
  -- Admin can update
  (SELECT (raw_user_meta_data->>'role')::text FROM auth.users WHERE id = auth.uid()) = 'ADMIN'
);
```

---

## 🔐 Audit Logs Table

### Read Policy (Admin Only)
```sql
CREATE POLICY "audit_logs_read"
ON audit_logs
FOR SELECT
USING (
  -- Admin can read all
  (SELECT (raw_user_meta_data->>'role')::text FROM auth.users WHERE id = auth.uid()) = 'ADMIN'
  OR
  -- User can read their own audit logs
  actor_user_id = auth.uid()
  OR
  -- User can read logs for their firm
  firm_id IN (
    SELECT firm_id FROM user_firms WHERE user_id = auth.uid()
  )
);
```

### Insert Policy (System Only)
```sql
CREATE POLICY "audit_logs_insert"
ON audit_logs
FOR INSERT
WITH CHECK (
  -- System can insert (via service role)
  -- Or user can insert their own actions
  actor_user_id = auth.uid()
);
```

**Note:** Audit logs are typically inserted via service role for system actions.

---

## 🔐 Cases Table (Attorney Portal)

### Read Policy
```sql
CREATE POLICY "cases_read"
ON cases
FOR SELECT
USING (
  -- Attorney assigned to case
  EXISTS (
    SELECT 1 FROM case_attorneys
    WHERE case_attorneys.case_id = cases.id
      AND (
        case_attorneys.attorney_id = auth.uid()
        OR case_attorneys.email = (SELECT email FROM auth.users WHERE id = auth.uid())
      )
  )
  OR
  -- User has case membership
  EXISTS (
    SELECT 1 FROM case_memberships
    WHERE case_memberships.case_id = cases.id
      AND case_memberships.user_id = auth.uid()
  )
  OR
  -- Admin can read all
  (SELECT (raw_user_meta_data->>'role')::text FROM auth.users WHERE id = auth.uid()) = 'ADMIN'
);
```

---

## 🚀 Implementation Notes

### Enabling RLS

```sql
-- Enable RLS on all tables
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposition_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
```

### Testing Policies

1. **Test as different roles:**
   ```sql
   -- Test as REPORTER
   SET ROLE authenticated;
   SET request.jwt.claims = '{"sub": "user-id", "role": "REPORTER"}';
   SELECT * FROM jobs;

   -- Test as ADMIN
   SET request.jwt.claims = '{"sub": "user-id", "role": "ADMIN"}';
   SELECT * FROM jobs;
   ```

2. **Verify access control:**
   - Users can only see their own jobs
   - Assigned users can see assigned jobs
   - Admins can see all jobs

### Performance Considerations

- **Indexes:** Ensure indexes exist on foreign keys used in policies
  ```sql
  CREATE INDEX idx_jobs_created_by_id ON jobs(created_by_id);
  CREATE INDEX idx_job_assignments_job_id ON job_assignments(job_id);
  CREATE INDEX idx_job_assignments_user_id ON job_assignments(user_id);
  ```

- **Policy Complexity:** Keep policies simple - complex logic should be in query functions

---

## ⚠️ Important Notes

1. **User Metadata Access:**
   - Policies access `raw_user_meta_data->>'role'` from `auth.users`
   - This requires a function or view if direct access isn't available
   - Alternative: Store roles in a separate `user_roles` table

2. **Service Role:**
   - Service role bypasses RLS
   - Use only for admin operations
   - Never use service role in regular query functions

3. **Testing:**
   - Test policies with different user roles
   - Verify access is correctly restricted
   - Ensure admins have appropriate access

---

**Status:** Draft - Review and test before production deployment  
**Next:** Test policies in development environment

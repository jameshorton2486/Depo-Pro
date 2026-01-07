# 📊 Analytics Schema (Supabase-Native, RLS-Safe)

**Status:** Schema Definitions for Business Analytics  
**Date:** January 2025

---

## 🎯 Overview

This analytics schema provides real business insight without impacting production tables. All tables are designed to be:

- ✅ Supabase-native (no Prisma)
- ✅ RLS-secured (firm-level access)
- ✅ Populated via query modules
- ✅ Never calculated in UI

---

## 📊 Analytics Tables

### `analytics_job_metrics`

Tracks job-level metrics for reporting and analytics.

```sql
CREATE TABLE analytics_job_metrics (
  job_id uuid PRIMARY KEY REFERENCES jobs(id) ON DELETE CASCADE,
  firm_id uuid NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL,
  completed_at timestamptz,
  turnaround_minutes integer,
  reporter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  scopist_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL,
  case_id uuid REFERENCES cases(id) ON DELETE SET NULL,
  deposition_date date,
  created_at_analytics timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_analytics_job_metrics_firm_id ON analytics_job_metrics(firm_id);
CREATE INDEX idx_analytics_job_metrics_created_at ON analytics_job_metrics(created_at);
CREATE INDEX idx_analytics_job_metrics_reporter_id ON analytics_job_metrics(reporter_id);
CREATE INDEX idx_analytics_job_metrics_status ON analytics_job_metrics(status);

-- Enable RLS
ALTER TABLE analytics_job_metrics ENABLE ROW LEVEL SECURITY;
```

**Populated when:**
- Job is created (insert record)
- Job status changes to COMPLETED (update `completed_at`, calculate `turnaround_minutes`)
- Job assignment changes (update `reporter_id` or `scopist_id`)

---

### `analytics_transcript_metrics`

Tracks transcript-level metrics for quality and performance analysis.

```sql
CREATE TABLE analytics_transcript_metrics (
  transcript_id uuid PRIMARY KEY REFERENCES transcripts(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  firm_id uuid NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  ai_edits integer DEFAULT 0,
  human_edits integer DEFAULT 0,
  confidence_score numeric(5,2),
  finalized_at timestamptz,
  word_count integer DEFAULT 0,
  flagged_word_count integer DEFAULT 0,
  created_at timestamptz NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_analytics_transcript_metrics_firm_id ON analytics_transcript_metrics(firm_id);
CREATE INDEX idx_analytics_transcript_metrics_job_id ON analytics_transcript_metrics(job_id);
CREATE INDEX idx_analytics_transcript_metrics_finalized_at ON analytics_transcript_metrics(finalized_at);

-- Enable RLS
ALTER TABLE analytics_transcript_metrics ENABLE ROW LEVEL SECURITY;
```

**Populated when:**
- Transcript is created (insert record)
- Transcript edits are made (increment `ai_edits` or `human_edits`)
- Transcript is finalized (update `finalized_at`)
- Word count changes (update `word_count`, `flagged_word_count`)

---

### `analytics_user_activity`

Tracks user activity for engagement and usage analysis.

```sql
CREATE TABLE analytics_user_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  firm_id uuid REFERENCES firms(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_type text,
  target_id uuid,
  metadata jsonb,
  occurred_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_analytics_user_activity_user_id ON analytics_user_activity(user_id);
CREATE INDEX idx_analytics_user_activity_firm_id ON analytics_user_activity(firm_id);
CREATE INDEX idx_analytics_user_activity_action ON analytics_user_activity(action);
CREATE INDEX idx_analytics_user_activity_occurred_at ON analytics_user_activity(occurred_at);

-- Enable RLS
ALTER TABLE analytics_user_activity ENABLE ROW LEVEL SECURITY;
```

**Populated when:**
- User logs in (`action: 'LOGIN'`)
- User creates a job (`action: 'JOB_CREATED'`)
- User views a transcript (`action: 'TRANSCRIPT_VIEWED'`)
- User edits a transcript (`action: 'TRANSCRIPT_EDITED'`)
- User exports a transcript (`action: 'TRANSCRIPT_EXPORTED'`)

---

## 🔐 RLS Policies

### `analytics_job_metrics` RLS

```sql
-- Users can read metrics for their firm
CREATE POLICY "firm_job_metrics_read"
ON analytics_job_metrics
FOR SELECT
USING (
  firm_id IN (
    SELECT firm_id FROM user_firms WHERE user_id = auth.uid()
  )
  OR
  (SELECT (raw_user_meta_data->>'role')::text FROM auth.users WHERE id = auth.uid()) = 'ADMIN'
);

-- System can insert/update (via service role)
-- Note: Regular users should not insert directly
```

### `analytics_transcript_metrics` RLS

```sql
-- Users can read metrics for their firm
CREATE POLICY "firm_transcript_metrics_read"
ON analytics_transcript_metrics
FOR SELECT
USING (
  firm_id IN (
    SELECT firm_id FROM user_firms WHERE user_id = auth.uid()
  )
  OR
  (SELECT (raw_user_meta_data->>'role')::text FROM auth.users WHERE id = auth.uid()) = 'ADMIN'
);
```

### `analytics_user_activity` RLS

```sql
-- Users can read their own activity
CREATE POLICY "user_activity_read_own"
ON analytics_user_activity
FOR SELECT
USING (
  user_id = auth.uid()
  OR
  firm_id IN (
    SELECT firm_id FROM user_firms WHERE user_id = auth.uid()
  )
  OR
  (SELECT (raw_user_meta_data->>'role')::text FROM auth.users WHERE id = auth.uid()) = 'ADMIN'
);

-- Users can insert their own activity
CREATE POLICY "user_activity_insert_own"
ON analytics_user_activity
FOR INSERT
WITH CHECK (user_id = auth.uid());
```

---

## 🧠 How to Populate Analytics

### Via Query Modules

Create query functions in `lib/supabase/queries/analytics.ts`:

```typescript
import { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseServiceClient } from '@/lib/supabase/service';

/**
 * Record job completion metrics
 */
export async function recordJobCompletion(
  jobId: string,
  completedAt: Date
) {
  // Use service role for analytics writes
  const supabase = getSupabaseServiceClient();
  
  // Get job details
  const { data: job } = await supabase
    .from('jobs')
    .select('created_at, firm_id, created_by_id')
    .eq('id', jobId)
    .single();
  
  if (!job) return;
  
  // Calculate turnaround time
  const turnaroundMinutes = Math.floor(
    (completedAt.getTime() - new Date(job.created_at).getTime()) / (1000 * 60)
  );
  
  // Get assignments
  const { data: assignments } = await supabase
    .from('job_assignments')
    .select('user_id, role')
    .eq('job_id', jobId)
    .eq('status', 'ACCEPTED');
  
  const reporter = assignments?.find(a => a.role === 'REPORTER');
  const scopist = assignments?.find(a => a.role === 'SCOPIST');
  
  // Insert or update metrics
  await supabase
    .from('analytics_job_metrics')
    .upsert({
      job_id: jobId,
      firm_id: job.firm_id,
      created_at: job.created_at,
      completed_at: completedAt.toISOString(),
      turnaround_minutes: turnaroundMinutes,
      reporter_id: reporter?.user_id || null,
      scopist_id: scopist?.user_id || null,
      status: 'COMPLETED',
    });
}
```

### Via Triggers (Optional)

For automatic population, create PostgreSQL triggers:

```sql
-- Trigger on job status change
CREATE OR REPLACE FUNCTION record_job_completion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'COMPLETED' AND OLD.status != 'COMPLETED' THEN
    INSERT INTO analytics_job_metrics (
      job_id,
      firm_id,
      created_at,
      completed_at,
      turnaround_minutes,
      status
    )
    SELECT
      NEW.id,
      NEW.firm_id,
      NEW.created_at,
      NOW(),
      EXTRACT(EPOCH FROM (NOW() - NEW.created_at)) / 60,
      NEW.status
    ON CONFLICT (job_id) DO UPDATE SET
      completed_at = NOW(),
      turnaround_minutes = EXTRACT(EPOCH FROM (NOW() - NEW.created_at)) / 60,
      status = NEW.status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER job_completion_trigger
AFTER UPDATE ON jobs
FOR EACH ROW
WHEN (NEW.status = 'COMPLETED' AND OLD.status != 'COMPLETED')
EXECUTE FUNCTION record_job_completion();
```

---

## 📊 Query Module: `lib/supabase/queries/analytics.ts`

```typescript
// ═══════════════════════════════════════════════════════════════
// ANALYTICS QUERY FUNCTIONS
// lib/supabase/queries/analytics.ts
// ═══════════════════════════════════════════════════════════════

import { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseServiceClient } from '@/lib/supabase/service';

/**
 * Get job metrics for a firm
 */
export async function getJobMetrics(
  supabase: SupabaseClient,
  firmId: string,
  filters?: {
    startDate?: Date;
    endDate?: Date;
    reporterId?: string;
    status?: string;
  }
) {
  let query = supabase
    .from('analytics_job_metrics')
    .select('*', { count: 'exact' })
    .eq('firm_id', firmId);

  if (filters?.startDate) {
    query = query.gte('created_at', filters.startDate.toISOString());
  }

  if (filters?.endDate) {
    query = query.lte('created_at', filters.endDate.toISOString());
  }

  if (filters?.reporterId) {
    query = query.eq('reporter_id', filters.reporterId);
  }

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  query = query.order('created_at', { ascending: false });

  const { data, error, count } = await query;

  if (error) {
    throw error;
  }

  return {
    metrics: data || [],
    totalCount: count || 0,
  };
}

/**
 * Get reporter utilization metrics
 */
export async function getReporterUtilization(
  supabase: SupabaseClient,
  firmId: string,
  startDate: Date,
  endDate: Date
) {
  const { data, error } = await supabase
    .from('analytics_job_metrics')
    .select('reporter_id, status, turnaround_minutes')
    .eq('firm_id', firmId)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())
    .not('reporter_id', 'is', null);

  if (error) {
    throw error;
  }

  // Aggregate by reporter
  const utilization = (data || []).reduce((acc, metric) => {
    const reporterId = metric.reporter_id;
    if (!acc[reporterId]) {
      acc[reporterId] = {
        reporterId,
        totalJobs: 0,
        completedJobs: 0,
        inProgressJobs: 0,
        totalTurnaroundMinutes: 0,
      };
    }

    acc[reporterId].totalJobs++;
    if (metric.status === 'COMPLETED') {
      acc[reporterId].completedJobs++;
      if (metric.turnaround_minutes) {
        acc[reporterId].totalTurnaroundMinutes += metric.turnaround_minutes;
      }
    } else {
      acc[reporterId].inProgressJobs++;
    }

    return acc;
  }, {} as Record<string, any>);

  // Calculate averages
  return Object.values(utilization).map((u: any) => ({
    ...u,
    averageTurnaroundMinutes: u.completedJobs > 0
      ? Math.round(u.totalTurnaroundMinutes / u.completedJobs)
      : 0,
  }));
}

/**
 * Record user activity
 */
export async function recordUserActivity(
  userId: string,
  action: string,
  options?: {
    firmId?: string;
    targetType?: string;
    targetId?: string;
    metadata?: Record<string, unknown>;
  }
) {
  const supabase = getSupabaseServiceClient();

  const { error } = await supabase
    .from('analytics_user_activity')
    .insert({
      user_id: userId,
      firm_id: options?.firmId || null,
      action,
      target_type: options?.targetType || null,
      target_id: options?.targetId || null,
      metadata: options?.metadata || null,
    });

  if (error) {
    throw error;
  }
}
```

---

## 🚫 Never Calculate in UI

**❌ WRONG:**
```typescript
// ❌ NEVER calculate analytics in UI
const jobs = await fetch('/api/jobs').then(r => r.json());
const completedJobs = jobs.filter(j => j.status === 'COMPLETED');
const averageTurnaround = calculateAverage(completedJobs);
```

**✅ CORRECT:**
```typescript
// ✅ Fetch pre-calculated metrics from API
const metrics = await fetch('/api/analytics/jobs?firmId=123').then(r => r.json());
// metrics.averageTurnaroundMinutes already calculated
```

---

## 📋 Analytics API Routes

### `GET /api/analytics/jobs`

```typescript
// app/api/analytics/jobs/route.ts
import { auth } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getJobMetrics } from '@/lib/supabase/queries/analytics';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Admin or firm admin only
  if (session.user.role !== 'ADMIN' && session.user.role !== 'FIRM_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();
  const { searchParams } = new URL(request.url);
  
  const firmId = searchParams.get('firmId') || session.user.firmId;
  const startDate = searchParams.get('startDate')
    ? new Date(searchParams.get('startDate')!)
    : undefined;
  const endDate = searchParams.get('endDate')
    ? new Date(searchParams.get('endDate')!)
    : undefined;

  const metrics = await getJobMetrics(supabase, firmId!, {
    startDate,
    endDate,
  });

  return NextResponse.json(metrics);
}
```

---

## ✅ Implementation Checklist

- [ ] Create analytics tables in Supabase
- [ ] Enable RLS on all analytics tables
- [ ] Create RLS policies
- [ ] Create `lib/supabase/queries/analytics.ts`
- [ ] Add population logic to relevant query modules
- [ ] Create analytics API routes
- [ ] Add indexes for performance
- [ ] Test RLS policies with different roles
- [ ] Document analytics endpoints

---

**Status:** ✅ Schema Defined  
**Next:** Implement query modules and API routes  
**RLS:** ✅ Policies Defined

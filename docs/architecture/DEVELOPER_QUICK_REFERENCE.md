# Depo-Pro Developer Quick Reference
**Schema Version:** 1.2.2
**Last Updated:** 2026-02-09

This document provides critical rules and patterns for developers implementing application code against the Depo-Pro schema.

---

## 🚨 Critical Rules (Will Break if Violated)

### 1. NEVER Include `is_flagged` in words JSONB
**Why:** Database trigger will reject the transaction
**Where:** `transcriptions.words` column

```typescript
// ❌ FAILS
const words = [{ word: "hello", is_flagged: false }];

// ✅ WORKS
const words = [{ word: "hello", confidence: 0.95, start: 1.0, end: 1.5 }];
```

---

### 2. Lock Timeout Must Be 1-480 Minutes
**Why:** Database validation will throw exception
**Where:** `acquire_job_lock()` function

```typescript
// ❌ FAILS
await supabase.rpc('acquire_job_lock', {
  p_timeout_minutes: 1000  // > 480
});

// ✅ WORKS
await supabase.rpc('acquire_job_lock', {
  p_timeout_minutes: 30  // 1-480 ok
});
```

---

### 3. Original Transcript Fields Are Immutable
**Why:** Database trigger blocks modification
**Where:** `transcriptions.original_transcript`, `deepgram_raw_json`, `original_integrity_hash`

```typescript
// ❌ FAILS - trigger rejects
await supabase
  .from('transcriptions')
  .update({ original_transcript: 'new text' })
  .eq('id', txnId);

// ✅ WORKS - only update current state
await supabase
  .from('transcriptions')
  .update({ full_transcript: 'edited text' })
  .eq('id', txnId);
```

---

### 4. Attorneys Cannot Be Assigned to Jobs
**Why:** Database trigger blocks ATTORNEY role in reporter_id or scopist_id
**Where:** `jobs.reporter_id`, `jobs.scopist_id`

```typescript
// ❌ FAILS - trigger rejects
await supabase.from('jobs').insert({
  reporter_id: attorneyUserId,  // Attorney role
  firm_id: firmId,
  case_name: "Case"
});

// ✅ WORKS
await supabase.from('jobs').insert({
  reporter_id: reporterUserId,  // COURT_REPORTER role
  firm_id: firmId,
  case_name: "Case"
});
```

---

## 🔒 Locking Patterns

### Acquire Lock Before Editing
```typescript
async function openEditor(jobId: string, userId: string) {
  const { data: acquired } = await supabase.rpc('acquire_job_lock', {
    p_job_id: jobId,
    p_user_id: userId,
    p_timeout_minutes: 30
  });

  if (!acquired) {
    throw new Error('Job is locked by another user');
  }

  // Now safe to edit
}
```

### Release Lock on Close
```typescript
async function closeEditor(jobId: string, userId: string) {
  await supabase.rpc('release_job_lock', {
    p_job_id: jobId,
    p_user_id: userId
  });
}
```

### Implement Lock Renewal for Long Sessions
```typescript
// Renew lock every 15 minutes if editing > 30 minutes
useEffect(() => {
  const interval = setInterval(async () => {
    const renewed = await supabase.rpc('acquire_job_lock', {
      p_job_id: jobId,
      p_user_id: userId,
      p_timeout_minutes: 30
    });

    if (!renewed) {
      alert('Lock lost - another user may have taken over');
      navigate('/dashboard');
    }
  }, 15 * 60 * 1000);

  return () => clearInterval(interval);
}, [jobId, userId]);
```

---

## 🔍 Flagged Words Workflow

### Extract Flags After Transcription
```typescript
async function extractFlags(transcriptionId: string, threshold = 0.85) {
  const { data: insertedCount } = await supabase.rpc('extract_flagged_words', {
    p_transcription_id: transcriptionId,
    p_confidence_threshold: threshold
  });

  console.log(`Inserted ${insertedCount} new flagged words`);
  // Existing reviews are preserved (ON CONFLICT DO NOTHING)
}
```

### Query Pending Flags for Review UI
```typescript
const { data: pendingFlags } = await supabase
  .from('flagged_words')
  .select('*')
  .eq('transcription_id', txnId)
  .eq('status', 'PENDING')
  .order('sort_order');
```

### Mark Flag as Corrected
```typescript
await supabase
  .from('flagged_words')
  .update({
    status: 'CORRECTED',
    corrected_word: 'substantive',
    reviewed_by: userId,
    reviewed_at: new Date().toISOString()
  })
  .eq('id', flagId);
```

---

## 🔗 Integrity Chain

### Append to Chain After Edit
```typescript
async function applyEdit(transcriptionId: string, editId: string, newText: string, userId: string) {
  // 1. Apply edit to transcription_edits table
  const { data: edit } = await supabase
    .from('transcription_edits')
    .insert({
      transcription_id: transcriptionId,
      editor_id: userId,
      edit_type: 'WORD_CORRECTION',
      original_value: 'old',
      new_value: 'new'
    })
    .select()
    .single();

  // 2. Update current transcript
  await supabase
    .from('transcriptions')
    .update({ full_transcript: newText })
    .eq('id', transcriptionId);

  // 3. Append to integrity chain
  const { data: version } = await supabase.rpc('append_integrity_chain', {
    p_transcription_id: transcriptionId,
    p_transcript_text: newText,
    p_edit_id: edit.id,
    p_user_id: userId
  });

  console.log(`Chain version: ${version}`);
}
```

### Verify Chain Integrity
```typescript
const { data: verification } = await supabase.rpc('verify_integrity_chain', {
  p_transcription_id: txnId
});

if (!verification[0].is_valid) {
  console.error('Chain broken at version:', verification[0].broken_at_version);
  console.error('Details:', verification[0].details);
}
```

---

## 👨‍⚖️ Attorney Sharing

### Share Completed Transcript
```typescript
// Only works if job.status = 'COMPLETED'
await supabase.from('transcript_shares').insert({
  job_id: jobId,
  shared_by: reporterId,
  shared_with: attorneyId,
  access_level: 'READ_ONLY',
  download_allowed: true,
  message: 'Your deposition transcript is ready for review'
});
```

### Revoke Share
```typescript
await supabase
  .from('transcript_shares')
  .update({ revoked_at: new Date().toISOString() })
  .eq('id', shareId);
```

### Re-share After Revocation (Now Supported)
```typescript
// This works because of partial unique index
await supabase.from('transcript_shares').insert({
  job_id: jobId,
  shared_with: attorneyId,  // Same attorney
  shared_by: reporterId
  // Old revoked share still exists but doesn't conflict
});
```

---

## 📊 Audit Logging

### Log Critical Events
```typescript
await supabase.rpc('log_audit_event', {
  p_action: 'WORD_CORRECTED',
  p_actor_id: userId,
  p_target_type: 'flagged_word',
  p_target_id: flagId,
  p_details: { original: 'substative', corrected: 'substantive' },
  p_ip_address: req.ip,
  p_user_agent: req.headers['user-agent']
});
```

### Events to Always Log
- `JOB_CREATED`
- `JOB_STATUS_CHANGED`
- `TRANSCRIPTION_STARTED`
- `TRANSCRIPTION_COMPLETED`
- `WORD_CORRECTED`
- `TRANSCRIPT_LOCKED` / `TRANSCRIPT_UNLOCKED`
- `TRANSCRIPT_EXPORTED`
- `TRANSCRIPT_SHARED` / `SHARE_REVOKED`

---

## 🛡️ RLS & Role Checks

### Service Role for Pipeline
```typescript
// Use service role client for transcription pipeline
const serviceClient = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY  // Bypasses RLS
);

// Create transcription as service role (no user session)
await serviceClient.from('transcriptions').insert({
  job_id: jobId,
  words: processedWords,
  segments: segments,
  status: 'COMPLETE'
});
```

### User Client for App
```typescript
// Use authenticated client for user operations (enforces RLS)
const userClient = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

// RLS ensures user can only see their own jobs
const { data: jobs } = await userClient
  .from('jobs')
  .select('*');
// Automatically filtered by RLS
```

---

## 🧪 Testing Patterns

### Test Attorney Cannot Write
```typescript
// Login as attorney
const attorneyClient = await loginAs('attorney@law.com');

// Should fail (RESTRICTIVE policy blocks)
await expect(
  attorneyClient.from('jobs').insert({ /* ... */ })
).rejects.toThrow();
```

### Test Lock Prevents Concurrent Edits
```typescript
const user1 = await loginAs('scopist1@firm.com');
const user2 = await loginAs('scopist2@firm.com');

// User 1 acquires lock
const { data: lock1 } = await user1.rpc('acquire_job_lock', {
  p_job_id: jobId,
  p_user_id: user1Id,
  p_timeout_minutes: 30
});
expect(lock1).toBe(true);

// User 2 cannot acquire (lock held)
const { data: lock2 } = await user2.rpc('acquire_job_lock', {
  p_job_id: jobId,
  p_user_id: user2Id,
  p_timeout_minutes: 30
});
expect(lock2).toBe(false);
```

### Test Immutability Trigger
```typescript
// Create transcription
const { data: txn } = await supabase
  .from('transcriptions')
  .insert({
    job_id: jobId,
    original_transcript: 'Original text'
  })
  .select()
  .single();

// Try to modify original (should fail)
await expect(
  supabase.from('transcriptions')
    .update({ original_transcript: 'Modified' })
    .eq('id', txn.id)
).rejects.toThrow('Cannot modify original_transcript');
```

---

## 🚀 Performance Tips

### Use Select Specific Columns
```typescript
// ❌ Slow - fetches entire words JSONB (5-10 MB for 8-hour depo)
const { data } = await supabase
  .from('transcriptions')
  .select('*')
  .eq('id', txnId);

// ✅ Fast - only fetch what you need
const { data } = await supabase
  .from('transcriptions')
  .select('id, full_transcript, flagged_word_count')
  .eq('id', txnId);
```

### Use Views for Complex Queries
```typescript
// Use pre-built view instead of joining manually
const { data: queue } = await supabase
  .from('scopist_review_queue')
  .select('*')
  .order('due_date');
```

### Pagination for Large Results
```typescript
const PAGE_SIZE = 50;

const { data: flags, count } = await supabase
  .from('flagged_words')
  .select('*', { count: 'exact' })
  .eq('transcription_id', txnId)
  .eq('status', 'PENDING')
  .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
```

---

## 📝 Type Safety

### Generate and Use Types
```bash
npx supabase gen types typescript --local > src/types/supabase.ts
```

```typescript
import { Database } from '@/types/supabase';

type Job = Database['public']['Tables']['jobs']['Row'];
type JobInsert = Database['public']['Tables']['jobs']['Insert'];
type JobUpdate = Database['public']['Tables']['jobs']['Update'];

// Fully typed queries
const jobs: Job[] = await supabase
  .from('jobs')
  .select('*');
```

---

## 🐛 Common Errors

### "Cannot read property 'filter' of null"
**Cause:** Trying to access JSONB field that's null
**Fix:** This should not happen after RC-8 fixes (all JSONB have defaults)

### "Lock timeout must be between 1 and 480 minutes"
**Cause:** Invalid timeout passed to acquire_job_lock
**Fix:** Use timeout between 1-480

### "words JSONB must not contain is_flagged field"
**Cause:** Validation trigger detected is_flagged in words array
**Fix:** Remove is_flagged from word objects

### "ATTORNEY role cannot be assigned as reporter"
**Cause:** Trying to assign attorney to job
**Fix:** Only assign COURT_REPORTER or SCOPIST roles

---

## 📚 Reference

### Source of Truth Hierarchy
1. `transcriptions.original_transcript` — immutable AI output
2. `transcription_edits` — authoritative edit history
3. `transcriptions.full_transcript` — current resolved state
4. `flagged_words` — review workflow (feeds into edits)

### Status Contracts
- `job_status` — Human workflow (UI states)
- `transcription_status` — Machine pipeline (backend states)
- Once `job_status >= AI_COMPLETE`, `transcription_status = COMPLETE`

### Key Indexes
- `idx_jobs_lock_expiry` — Lock cleanup performance
- `idx_flagged_pending` — Review UI queries
- `idx_edits_replay` — Chronological edit reconstruction

---

**Quick Reference Version:** 1.0
**Schema Compatibility:** 1.2.2+

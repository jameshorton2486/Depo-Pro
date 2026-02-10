# Critical Fixes RC-1 through RC-5
**Schema Version:** 1.2.0 → 1.2.1
**Date:** 2026-02-09
**Migration:** `20260209_critical_fixes_rc1_to_rc5.sql`

---

## Summary

This migration addresses **5 critical security and data integrity issues** identified in the architectural review. These fixes are **mandatory before any application code is written**.

| Issue | Severity | Impact | Fixed |
|-------|----------|--------|-------|
| RC-1: Flagged words extraction destructive | CRITICAL | Data loss | ✅ |
| RC-2: Integrity chain race condition | CRITICAL | Chain corruption | ✅ |
| RC-3: Missing DELETE policies | CRITICAL | Operational blocker | ✅ |
| RC-4: Attorney information leakage | CRITICAL | Security violation | ✅ |
| RC-5: Share constraint blocks re-sharing | HIGH | Workflow blocker | ✅ |

---

## RC-1: Flagged Words Extraction (Data Loss Prevention)

### Problem
The original `extract_flagged_words()` function deleted all existing flagged words before re-extracting:
```sql
DELETE FROM flagged_words WHERE transcription_id = p_transcription_id;
```

**Impact:** If called twice (retry, threshold change), all scopist review progress was permanently lost:
- `status` reset to PENDING
- `corrected_word` erased
- `reviewed_by`, `reviewed_at`, `review_notes` lost

### Solution
Changed to **non-destructive insertion**:
```sql
INSERT INTO flagged_words (...)
VALUES (...)
ON CONFLICT (transcription_id, word_index) DO NOTHING;
```

**Result:** Existing reviews are preserved. Safe to call multiple times.

---

## RC-2: Integrity Chain Race Condition (Legal Defensibility)

### Problem
Two concurrent edits could both read the same latest version, both compute `version + 1`, and both attempt to insert:
```sql
-- Transaction 1: reads version 5, computes version 6
-- Transaction 2: reads version 5, computes version 6
-- Both insert version 6 → UNIQUE constraint violation
```

**Impact:**
- Chain breaks in court testimony
- One transaction randomly fails
- No guarantee of ordering

### Solution
Added `SELECT FOR UPDATE` to serialize version assignment:
```sql
SELECT version_number, transcript_hash
FROM transcript_integrity_chain
WHERE transcription_id = p_transcription_id
ORDER BY version_number DESC
LIMIT 1
FOR UPDATE;  -- ← Locks row for this transaction
```

**Result:** Only one transaction can read and increment at a time. Chain integrity guaranteed.

---

## RC-3: Missing DELETE Policies (4 Tables)

### Problem
Four tables had no DELETE policies, preventing legitimate cleanup operations:

| Table | Impact |
|-------|--------|
| `custom_vocabularies` | Cannot remove typo terms |
| `silent_segments` | Cannot fix incorrectly marked segments |
| `processing_errors` | Cannot archive old errors |
| `transcription_chunks` | Cannot cleanup after pipeline |

### Solution
Added appropriate DELETE policies:

**custom_vocabularies** — Reporter or Admin:
```sql
CREATE POLICY vocab_delete ON custom_vocabularies FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM jobs j WHERE j.id = custom_vocabularies.job_id AND (
      j.reporter_id = auth.uid() OR (admin check)
    )
  )
);
```

**silent_segments** — Scopist, Reporter, or Admin can delete

**processing_errors** — Admin only (evidentiary records)

**transcription_chunks** — Admin only (cleanup after pipeline)

**Result:** Operational flexibility without compromising security.

---

## RC-4: Attorney Information Leakage via JSONB

### Problem
Attorneys had SELECT access to `transcriptions.words` JSONB, which contained:
```json
{
  "word": "objection",
  "is_flagged": true  // ← ATTORNEYS COULD SEE THIS
}
```

This violated the "attorneys cannot see review process" requirement.

### Solution
**Two-part fix:**

1. **Documentation Update:** Schema comment now explicitly states `is_flagged` MUST NOT be in words JSONB

2. **Validation Trigger:** New trigger `validate_words_structure()` enforces this:
```sql
CREATE TRIGGER trg_validate_words_structure
  BEFORE INSERT OR UPDATE ON transcriptions
  FOR EACH ROW
  EXECUTE FUNCTION validate_words_structure();
```

If application code attempts to store `is_flagged` in words JSONB, the insert/update is **rejected with exception**.

**Result:**
- Flagging state lives ONLY in `flagged_words` table
- Attorneys cannot infer review process details
- Schema enforces data model correctness

---

## RC-5: Transcript Shares Re-sharing After Revocation

### Problem
The unique constraint prevented re-sharing after revocation:
```sql
UNIQUE(job_id, shared_with)
```

**Scenario:**
1. Share transcript with Attorney A → record created
2. Revoke share → `revoked_at = NOW()`
3. Try to re-share → **UNIQUE constraint violation**

### Solution
Replaced with **partial unique index**:
```sql
CREATE UNIQUE INDEX transcript_shares_active_unique
  ON transcript_shares(job_id, shared_with)
  WHERE revoked_at IS NULL;
```

**Result:**
- Only one **active** share per job/attorney
- Can re-share after revocation (old record excluded from index)
- Maintains historical audit trail of all shares

---

## How to Apply

### 1. Review the Migration
```bash
cat supabase/migrations/20260209_critical_fixes_rc1_to_rc5.sql
```

### 2. Execute in Supabase SQL Editor
1. Open Supabase Dashboard → SQL Editor
2. Paste entire migration file
3. Run (Ctrl+Enter)
4. Verify "Success. No rows returned"

### 3. Run Verification Queries
```sql
-- Verify DELETE policies exist
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('custom_vocabularies', 'silent_segments', 'processing_errors', 'transcription_chunks')
  AND cmd = 'DELETE';

-- Expected: 4 rows

-- Verify validation trigger exists
SELECT tgname, tgrelid::regclass, tgenabled
FROM pg_trigger
WHERE tgname = 'trg_validate_words_structure';

-- Expected: 1 row, tgenabled = 'O' (origin)

-- Verify partial unique index
SELECT indexdef FROM pg_indexes
WHERE indexname = 'transcript_shares_active_unique';

-- Expected: shows WHERE revoked_at IS NULL
```

### 4. Regenerate TypeScript Types
```bash
npx supabase gen types typescript --local > src/types/supabase.ts
```

---

## Application Code Impact

### What Application Code MUST DO Now:

**1. Never include `is_flagged` in words JSONB:**
```typescript
// ❌ WRONG - trigger will reject this
const words = deepgramResponse.words.map(w => ({
  ...w,
  is_flagged: false  // ← TRIGGER REJECTS
}));

// ✅ CORRECT - omit is_flagged
const words = deepgramResponse.words.map(w => ({
  word: w.word,
  punctuated_word: w.punctuated_word,
  start: w.start,
  end: w.end,
  confidence: w.confidence,
  speaker: w.speaker,
  speaker_channel: w.channel
}));
```

**2. Call `extract_flagged_words()` safely:**
```typescript
// Safe to call multiple times - won't destroy review progress
const insertedCount = await supabase.rpc('extract_flagged_words', {
  p_transcription_id: txnId,
  p_confidence_threshold: 0.85
});

// Returns count of NEWLY inserted flags, not total
```

**3. Re-sharing after revocation works:**
```typescript
// Revoke
await supabase
  .from('transcript_shares')
  .update({ revoked_at: new Date().toISOString() })
  .eq('id', shareId);

// Re-share (works now)
await supabase
  .from('transcript_shares')
  .insert({
    job_id: jobId,
    shared_with: attorneyId,
    shared_by: reporterId
  });
```

---

## Testing Checklist

- [ ] Execute migration in Supabase
- [ ] Run verification queries (all pass)
- [ ] Regenerate TypeScript types
- [ ] Test `extract_flagged_words()` doesn't destroy reviews
- [ ] Test concurrent edits don't break integrity chain
- [ ] Test DELETE policies work for authorized users
- [ ] Test `is_flagged` in words JSONB is rejected
- [ ] Test re-sharing after revocation succeeds

---

## Remaining Critical Issues (RC-6 through RC-8)

These will be addressed in the next migration:
- RC-6: Lock timeout unbounded
- RC-7: Missing index on lock expiry
- RC-8: JSONB columns nullable

**Status:** Migration `20260209_critical_fixes_rc1_to_rc5.sql` is ready for deployment.

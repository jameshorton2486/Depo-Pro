# DEPO-PRO EDGE CASE RESILIENCE — CLAUDE CODE MEGA PROMPT

> **Scope:** Pre-beta resilience hardening — 6 edge case fixes + test suite repair
> **Rule:** NO new features, NO schema changes, NO new dependencies. Fix existing code only.
> **Commit style:** One commit per task. Message format: `fix(scope): description`
> **Validation after EVERY task:** `npm run typecheck && npm run build` — if either fails, fix before proceeding.

---

## FROZEN FILES — DO NOT MODIFY

These files are architecturally frozen. Do not change them under any circumstances:

- `src/lib/transcription/legal-formatter.ts`
- `src/lib/transcription/post-process.ts`
- `src/types/transcript-format.ts`
- `supabase/migrations/*` (all migration files)
- `lib/middleware/withRouteProtection.ts`
- `lib/enums/roles.ts`

---

## GLOBAL CONTEXT

- **Framework:** Next.js 15, TypeScript, Supabase (DB + Auth + Storage), Tailwind + shadcn/ui
- **Auth:** Supabase Auth (NOT NextAuth — NextAuth was fully removed)
- **Transcription:** Deepgram Nova-3 via `lib/transcription/pipeline.ts`
- **Upload:** `components/jobs/file-upload.tsx` + `app/api/jobs/[id]/files/route.ts`
- **Corrections:** `app/api/transcripts/[id]/corrections/route.ts` (already has optimistic locking w/ 409)
- **Review UI:** `components/transcripts/low-confidence-panel.tsx` (two versions — legacy + v2)
- **Error capture:** `lib/error-capture.ts` → structured JSON to Vercel logs
- **Audio validation:** `lib/transcription/validate.ts` (ffprobe-based)
- **Chunking:** `lib/transcription/chunking.ts` (30-min chunks with 5s overlap)
- **Toast notifications:** `sonner` library (imported as `toast` from `sonner`)

---

## TASK 1: Deepgram API Failure — Graceful Error Handling

**Priority:** CRITICAL
**Files to modify:**
- `lib/transcription/pipeline.ts`
- `app/api/jobs/[id]/transcribe/route.ts`
- `components/jobs/job-detail-status.tsx` (or wherever job status is displayed)

**Problem:**
If Deepgram is unreachable, returns a 5xx, or the API key is invalid, the pipeline throws an unhandled error. The user sees a generic failure with no guidance on what happened or what to do.

**Requirements:**

1. In `lib/transcription/pipeline.ts`, wrap the Deepgram transcription call (likely in the TRANSCRIBING stage around `transcribeAudio()`) with a specific try/catch that distinguishes:
   - **Network/timeout errors** → Set status to `PIPELINE_FAILED` with message: `"Transcription service temporarily unavailable. Your audio file is saved — please try again in a few minutes."`
   - **401/403 errors** → Set status to `PIPELINE_FAILED` with message: `"Transcription service authentication failed. Please contact support."`
   - **429 rate limit errors** → Set status to `PIPELINE_FAILED` with message: `"Transcription service rate limit reached. Please wait a few minutes and try again."`
   - **Other Deepgram errors** → Set status to `PIPELINE_FAILED` with the actual error message from Deepgram, prefixed with: `"Transcription failed: "`

2. In all failure cases, ensure:
   - The job status is set to a retryable state (NOT terminal — user should be able to click "Transcribe" again)
   - The original audio file is NOT deleted from storage
   - The error message is stored in the transcription record so the UI can display it
   - `captureError()` from `lib/error-capture.ts` is called with route context

3. In the transcribe route (`app/api/jobs/[id]/transcribe/route.ts`), check if the job already has a `PIPELINE_FAILED` status. If so, allow re-triggering transcription (reset status to the initial state).

**Validation:**
```bash
# Verify error paths compile
npm run typecheck
# Grep for the new error messages
grep -n "temporarily unavailable" lib/transcription/pipeline.ts
grep -n "PIPELINE_FAILED" lib/transcription/pipeline.ts | wc -l
# Should show multiple distinct error paths
```

**Commit:** `fix(transcription): add graceful Deepgram failure handling with retryable status`

---

## TASK 2: Mid-Upload Cancellation — Abort + Cleanup

**Priority:** HIGH
**Files to modify:**
- `components/jobs/file-upload.tsx`
- `app/transcription/upload/page.tsx` (if it has its own upload logic)

**Problem:**
The file upload component in `components/jobs/file-upload.tsx` has no cancellation mechanism. If a user navigates away or clicks cancel during a large audio upload, the fetch request hangs, the UI stays in "uploading" state, and a partial file may be left in Supabase storage.

**Current state of `file-upload.tsx`:**
- Uses `useState` for `uploading` boolean
- `handleFileChange` does a `fetch()` POST with FormData
- No `AbortController`, no cancel button, no cleanup

**Requirements:**

1. Add an `AbortController` ref:
```typescript
const abortControllerRef = useRef<AbortController | null>(null);
```

2. In `handleFileChange`, create a new AbortController before the fetch and pass its signal:
```typescript
abortControllerRef.current = new AbortController();
const response = await fetch(`/api/jobs/${jobId}/files`, {
  method: 'POST',
  body: formData,
  signal: abortControllerRef.current.signal,
});
```

3. Add a `handleCancelUpload` function:
```typescript
const handleCancelUpload = () => {
  abortControllerRef.current?.abort();
  setUploading(false);
  toast.info('Upload cancelled');
};
```

4. In the catch block of `handleFileChange`, detect abort errors specifically:
```typescript
catch (error) {
  if (error instanceof DOMException && error.name === 'AbortError') {
    // User cancelled — do nothing, already handled by handleCancelUpload
    return;
  }
  // Handle other errors normally
  toast.error('Upload failed. Please try again.');
}
```

5. Show a cancel button in the UI when `uploading` is true. Use the existing `X` icon from lucide-react:
```tsx
{uploading && (
  <Button variant="ghost" size="sm" onClick={handleCancelUpload}>
    <X className="h-4 w-4 mr-1" /> Cancel
  </Button>
)}
```

6. Clean up the AbortController on component unmount:
```typescript
useEffect(() => {
  return () => { abortControllerRef.current?.abort(); };
}, []);
```

7. If `app/transcription/upload/page.tsx` has its own inline upload logic (check the `handleUploadComplete` and any fetch calls for file upload), apply the same pattern there.

**Validation:**
```bash
npm run typecheck
grep -n "AbortController" components/jobs/file-upload.tsx
grep -n "handleCancelUpload" components/jobs/file-upload.tsx
```

**Commit:** `fix(upload): add cancel button with AbortController for mid-upload cancellation`

---

## TASK 3: Browser Refresh During Correction Save — Unsaved Changes Warning

**Priority:** HIGH
**Files to modify:**
- `components/transcripts/low-confidence-panel.tsx`
- Any parent review page component that manages correction state (check `app/(dashboard)/jobs/[id]/review/page.tsx` or similar)

**Problem:**
If a scopist types a correction and refreshes the browser before saving, the correction is silently lost. There's no dirty-state tracking or `beforeunload` warning.

**Requirements:**

1. **Find the correction state management.** Look for where corrections are tracked before being sent to the API. This is likely in the low-confidence-panel or a parent component. Look for:
   - `useState` hooks holding pending corrections
   - Save/submit handlers that POST to `/api/transcripts/[id]/corrections`
   - Any `corrections` or `pendingEdits` state

2. **Add a `hasUnsavedChanges` tracking ref** (use ref, not state, to avoid re-renders):
```typescript
const hasUnsavedChangesRef = useRef(false);
```

3. **Set `hasUnsavedChangesRef.current = true`** whenever a correction is typed but not yet saved.

4. **Set `hasUnsavedChangesRef.current = false`** after a successful save.

5. **Add a `beforeunload` event listener:**
```typescript
useEffect(() => {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (hasUnsavedChangesRef.current) {
      e.preventDefault();
      // Modern browsers show their own generic message
    }
  };
  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, []);
```

6. **Important:** This must NOT block navigation when there are no unsaved changes. Only trigger when `hasUnsavedChangesRef.current` is true.

7. **Do NOT implement auto-save** — that's a feature addition. Just warn the user.

**Validation:**
```bash
npm run typecheck
grep -n "beforeunload" components/transcripts/low-confidence-panel.tsx
grep -n "hasUnsavedChanges" components/transcripts/low-confidence-panel.tsx
```

**Commit:** `fix(review): add unsaved changes warning on page refresh during correction editing`

---

## TASK 4: Very Short Audio (<30 seconds) — Graceful Handling

**Priority:** MEDIUM
**Files to modify:**
- `lib/transcription/validate.ts`
- `lib/transcription/pipeline.ts`

**Problem:**
Very short audio files (<30 seconds) may produce empty or near-empty transcripts with zero flagged words, leading to a confusing user experience. The validation currently only checks for `duration <= 0` but doesn't warn about very short files.

**Current state of `validate.ts`:**
- Checks: file exists, file size < 2GB, accepted format, duration > 0, video has audio track
- Does NOT check for minimum duration

**Requirements:**

1. In `lib/transcription/validate.ts`, add a `warning` field to the return type. Update the `AudioValidation` type (in `types/transcription.ts` or wherever it's defined):
```typescript
// Add to AudioValidation interface:
warning?: string;
```

2. After the `duration <= 0` check, add a warning (NOT a rejection) for short audio:
```typescript
const MIN_RECOMMENDED_DURATION = 10; // seconds
let warning: string | undefined;
if (metadata.duration > 0 && metadata.duration < MIN_RECOMMENDED_DURATION) {
  warning = `Audio is very short (${Math.round(metadata.duration)}s). Transcription accuracy may be limited.`;
}
```

3. Include the `warning` in the successful validation return:
```typescript
return {
  valid: true,
  duration: metadata.duration,
  format: metadata.format,
  channels: metadata.channels,
  sampleRate: metadata.sampleRate,
  fileSize,
  warning,  // <-- add this
};
```

4. In `lib/transcription/pipeline.ts`, after the validation check passes, log the warning if present:
```typescript
if (validation.warning) {
  console.warn(`[pipeline] Audio warning for job ${jobId}: ${validation.warning}`);
}
```

5. Do NOT block the transcription for short files — just log the warning. The validation still passes.

**Validation:**
```bash
npm run typecheck
grep -n "warning" lib/transcription/validate.ts
grep -n "MIN_RECOMMENDED" lib/transcription/validate.ts
```

**Commit:** `fix(validation): add warning for very short audio files without blocking transcription`

---

## TASK 5: Very Long Audio (30+ minutes) — Progress Feedback

**Priority:** MEDIUM
**Files to modify:**
- `lib/transcription/pipeline.ts`

**Problem:**
Long audio files (30+ minutes) are correctly chunked by `lib/transcription/chunking.ts` (30-min chunks, 5s overlap), but the pipeline doesn't report per-chunk progress. The user sees "Transcribing..." for potentially 10+ minutes with no indication of progress.

**Current state:**
- `updateTranscriptionStatus()` accepts a `progress` parameter (0-100)
- It's called with `0` at the TRANSCRIBING stage start but not updated per-chunk
- The chunk loop is in the TRANSCRIBING stage of `processTranscriptionJob()`

**Requirements:**

1. In the chunk processing loop in `lib/transcription/pipeline.ts`, calculate and report progress after each chunk completes:
```typescript
// Inside the chunk loop, after successful transcription of a chunk:
const chunkProgress = Math.round(((i + 1) / totalChunks) * 100);
await updateTranscriptionStatus(jobId, 'TRANSCRIBING', chunkProgress);
```

2. Find the exact location — look for the loop that iterates over chunks and calls `transcribeAudio()`. The loop likely looks like:
```typescript
for (let i = 0; i < chunks.length; i++) {
  // ... transcribe chunk ...
}
```
   Add the progress update right after the successful transcription of each chunk, before moving to the next iteration.

3. Also add a log line for visibility:
```typescript
console.log(`[pipeline] Job ${jobId}: Chunk ${i + 1}/${totalChunks} complete (${chunkProgress}%)`);
```

4. Do NOT add progress for single-chunk files — the progress jump from 0 to 100 is fine for short files.

**Validation:**
```bash
npm run typecheck
grep -n "chunkProgress" lib/transcription/pipeline.ts
```

**Commit:** `fix(pipeline): add per-chunk progress reporting for long audio transcription`

---

## TASK 6: Zero Flagged Words — Improved Empty State Flow

**Priority:** MEDIUM
**Files to modify:**
- `components/transcripts/low-confidence-panel.tsx`

**Problem:**
When a transcription has zero flagged words (high-confidence throughout), the low-confidence panel shows a basic "No low-confidence words found!" message with a sparkle emoji. This is fine, but it doesn't guide the user on what to do next — they might think something is broken.

**Current empty state (around line 298):**
```tsx
{totalFlagged === 0 ? (
  <div>
    <div className="text-2xl mb-2">✨</div>
    <div>No low-confidence words found!</div>
    <div className="text-xs mt-1">Confidence threshold: {Math.round(confidenceThreshold * 100)}%</div>
  </div>
```

**There is also a second version around line 870** with a similar empty state. Update BOTH.

**Requirements:**

1. **Update BOTH empty state blocks.** For the first one (around line 298), replace the zero-flagged content with:
```tsx
{totalFlagged === 0 ? (
  <div className="space-y-2">
    <div className="text-2xl mb-2">✨</div>
    <div className="font-medium">No low-confidence words found!</div>
    <div className="text-xs text-slate-400">
      AI confidence was above {Math.round(confidenceThreshold * 100)}% for all words.
    </div>
    <div className="text-xs text-slate-500 mt-3 border-t border-slate-700 pt-3">
      You can still review the full transcript manually. When ready, export using the buttons above.
    </div>
  </div>
```

2. **For the second empty state (v2 version around line 870),** apply the same improved messaging with the same copy and structure.

3. Do NOT change the "All words reviewed!" message (the `filter === 'pending'` branch) — that one is correct as-is.

4. Do NOT add any new props or change the component's API.

**Validation:**
```bash
npm run typecheck
grep -n "still review the full transcript" components/transcripts/low-confidence-panel.tsx
# Should return 2 matches (both versions)
```

**Commit:** `fix(review-ui): improve zero-flagged-words empty state with user guidance`

---

## TASK 7: Test Suite Repair (TST-01)

**Priority:** HIGH
**Files to modify:** App source files ONLY (NOT test files)

**Problem:**
The test suite has 31 test files. Some may be failing due to app code bugs, not test bugs. The rule is: **fix app code, never fix tests.** Tests are the spec; source code must match the spec.

**Execution:**

1. **Run the full suite first:**
```bash
npm run test 2>&1
```

2. **For each failing test file**, read the test to understand what it expects, then read the source file being tested. Fix the source file.

3. **Priority test files** (these are referenced in `docs/BETA_LAUNCH_CRITERIA.md` as must-pass):
   - `tests/integration/transcription-pipeline.test.ts`
   - `tests/integration/flagged-words.test.ts`
   - `tests/integration/review-api.test.ts`
   - `tests/integration/export-with-corrections.test.ts`
   - `tests/integration/auth-flow.test.ts`

4. **After fixing each test**, re-run just that file to confirm:
```bash
npx vitest run tests/integration/[filename].test.ts
```

5. **After all fixes**, run the full suite:
```bash
npm run test
```

6. Then run global validation:
```bash
npm run typecheck && npm run build
```

**Rules:**
- If a test mocks Supabase/Deepgram, ensure the mock matches the current function signatures
- If a test imports from a path that moved, fix the SOURCE to re-export from the expected path — don't change the test import
- If a test expects a specific error message, update the source to match — don't change the test expectation
- Do NOT modify any file in the `tests/` directory

**Commit:** `fix: resolve test failures for beta launch (TST-01)`

---

## EXECUTION ORDER

Run tasks in this exact order. Commit after each. Validate after each.

```
TASK 1  →  Deepgram failure handling (most critical edge case)
TASK 2  →  Upload cancellation (user-facing UX fix)
TASK 3  →  Unsaved changes warning (data loss prevention)
TASK 4  →  Short audio warning (quick, low-risk)
TASK 5  →  Long audio progress (quick, low-risk)
TASK 6  →  Zero flagged words UX (quick, low-risk)
TASK 7  →  Test suite repair (run last — earlier fixes may resolve some failures)
```

## AFTER ALL TASKS

Run the complete validation suite:
```bash
npm run typecheck
npm run build
npm run lint
npm run test
grep -r "throw.*not implemented" lib/ --include="*.ts"
```

All must pass with zero errors. If `grep` returns matches on active code paths, those throws need safe fallback returns (but that should already be done from prior work).

---

## WHAT NOT TO DO

- Do NOT add new npm dependencies
- Do NOT modify database schema or migrations
- Do NOT add new API routes
- Do NOT refactor existing architecture
- Do NOT add auto-save (that's a feature, not a fix)
- Do NOT modify files in the `tests/` directory
- Do NOT modify frozen files listed at the top
- Do NOT introduce `console.log` without context prefixes like `[pipeline]` or `[upload]`
- Do NOT remove existing error handling — only add to it

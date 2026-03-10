# SEC-03: OPTIMISTIC LOCKING ON CORRECTIONS
# Run in Claude Code AFTER all SEC-01 batches are committed
# Prerequisites: SEC-01 complete. npm run build passes.
# 2 files modified + optional client-side update

## WHAT THIS FIXES

Two scopists open the same transcript in separate browser tabs. Both make corrections. Both hit Save. Without optimistic locking, the second save silently overwrites the first. The first scopist's work is lost with no warning.

After this change: the second save gets a 409 Conflict response telling them to reload.

## RULES

1. Only modify the files listed below.
2. Do NOT modify lib/supabase/queries/locks.ts — build ON TOP of it.
3. Do NOT modify the review-client-new.tsx component in this task — that is a separate UI task.
4. Do NOT change database schema or create migrations.
5. Do NOT rename routes or change existing response shapes for success cases.
6. After all changes: npm run typecheck && npm run build must pass.

## UNDERSTANDING THE DATA FLOW

1. Scopist opens review page → client loads transcript with its `updated_at` timestamp
2. Scopist corrects words → client sends corrections to the API
3. API should: check if `updated_at` still matches → if yes, save → if no, return 409
4. The `transcriptions` table has an `updated_at` column that auto-updates on every write

## FILE 1: app/api/transcripts/[id]/corrections/route.ts

Read this file first. Understand the current PATCH/POST handler that saves corrections.

### Changes to make:

Step 1: Add the version check at the START of the write handler (PATCH or POST — whichever saves corrections):

```typescript
// --- Optimistic Locking Check ---
const expectedVersion = reqBody.expectedVersion; // ISO timestamp string from client

if (expectedVersion) {
  // Query current version from database
  const { data: current, error: versionError } = await supabase
    .from('transcriptions')
    .select('updated_at')
    .eq('id', transcriptId)
    .single();

  if (versionError) {
    return NextResponse.json(
      { error: 'Failed to verify transcript version' },
      { status: 500 }
    );
  }

  // Compare timestamps — if they don't match, another user has modified the transcript
  if (current.updated_at !== expectedVersion) {
    return NextResponse.json(
      {
        error: 'Conflict — this transcript was modified by another user since you loaded it. Please reload the page to see the latest version.',
        code: 'CONFLICT',
        serverVersion: current.updated_at,
        clientVersion: expectedVersion,
      },
      { status: 409 }
    );
  }
}
// --- End Optimistic Locking Check ---
```

Step 2: Use the supabase client that's available in the handler. If the route has been migrated to withRouteProtection (from SEC-01), use `ctx.supabase`. If it still uses a manual client, use that.

Step 3: The transcriptId should come from the route params (the [id] in the URL path). Use whatever variable name the existing code uses for this.

Step 4: Do NOT make expectedVersion required. If the client doesn't send it, skip the check (backward compatible). This lets the old client keep working while the new client adds the field.

Step 5: After the corrections are saved successfully, the response should include the new `updated_at` value so the client can use it for the next save:

```typescript
// At the end of the successful response, add:
// Fetch the new updated_at after save
const { data: refreshed } = await supabase
  .from('transcriptions')
  .select('updated_at')
  .eq('id', transcriptId)
  .single();

// Include in the success response body:
return NextResponse.json({
  ...existingResponseData,
  updatedAt: refreshed?.updated_at,
});
```

Adjust this to fit the existing response pattern. If the route already returns an object, add the `updatedAt` field to it. Do NOT restructure the entire response.

## FILE 2: app/api/jobs/[id]/review/submit/route.ts

Read this file. This handles the "Submit Review" action which finalizes the scopist's work.

### Changes to make:

Apply the EXACT same optimistic locking check as File 1:

Step 1: At the start of the POST handler, add the same version check block.

Step 2: The transcriptId here may come from a different source — it might be looked up from the job record rather than being in the URL. Read the existing code to find how it gets the transcript ID, then use that.

Step 3: Same backward compatibility rule: if `expectedVersion` is not in the request body, skip the check.

Step 4: After successful submission, include the new `updated_at` in the response.

## DO NOT MODIFY (related but out of scope)

- `components/review/flagged-word-panel.tsx` — client-side changes are a separate task
- `app/(dashboard)/jobs/[id]/review/review-client-new.tsx` — client-side changes are a separate task
- `lib/supabase/queries/locks.ts` — job-level locking is separate from optimistic locking
- Any database schema or migration files

The client-side integration (sending `expectedVersion` and handling 409 responses) will be done as a separate UI task. For now, the API just needs to support the check when the field is present.

## VALIDATION

```bash
npm run typecheck   # zero errors
npm run build       # zero errors
```

### Manual test (if you have access to the running app):
1. Open a transcript review page
2. Note the transcript's updated_at from the database
3. Send a PATCH to the corrections endpoint with `expectedVersion` set to the correct timestamp → should succeed
4. Send another PATCH with the OLD timestamp → should return 409 Conflict
5. Send a PATCH WITHOUT `expectedVersion` → should succeed (backward compatible)

## COMMIT

```bash
git add app/api/transcripts/[id]/corrections/route.ts "app/api/jobs/[id]/review/submit/route.ts"
git commit -m "sec-03: add optimistic locking to corrections and review submit"
```

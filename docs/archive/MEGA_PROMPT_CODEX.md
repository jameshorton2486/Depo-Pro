# CODEX MEGA PROMPT — Crash Fixes + Onboarding Batch
# Run with: codex
# Safe to run simultaneously with the Aider batch (zero file overlap)

Read these files first:
- docs/ARCHITECTURE_OVERVIEW.md (Frozen Layer and Refactor Constraints sections)
- docs/REMAINING_TASKS_ANALYSIS.md (Phase 1 and Phase 5 tasks)

## GLOBAL RULES

- Only modify the files explicitly listed in each task below.
- Do NOT modify any file in the Frozen Layer (see docs/ARCHITECTURE_OVERVIEW.md).
- Do NOT change database schema. Do NOT create migrations.
- Do NOT rename API routes or change URL paths.
- Do NOT introduce new npm dependencies.
- Do NOT add `// TODO` comments.
- Do NOT expand scope beyond what each task specifies.
- Keep ALL existing function signatures and return types unchanged.
- Keep ALL existing imports in files you modify.
- After ALL changes: run `npm run typecheck && npm run build` — both must pass with zero errors.

---

## TASK 1 of 6: CRASH-01 — Fix cost-control-service

File: `lib/cost-control-service.ts`

This file has 4 functions that throw "not implemented" errors. They are called from the transcript export route, so every export crashes in production. Replace each throw with a safe return value.

Actions:
1. Find function `useQuota()` — replace the throw statement with: `return { allowed: true, remaining: 999 };`
2. Find function `checkQuota()` — replace the throw statement with: `return { withinQuota: true };`
3. Find function `getUsageStats()` — replace the throw statement with: `return { used: 0, limit: 999 };`
4. Find function `getUsageSummary()` — replace the throw statement with: `return { totalJobs: 0, totalMinutes: 0 };`
5. Add a comment above each function: `// Phase 2: Replace with real Stripe usage tracking`
6. Do NOT change function names, parameter types, or return types.
7. Do NOT modify any other functions in this file.

Verify: `grep -r "throw" lib/cost-control-service.ts` should return zero matches.

---

## TASK 2 of 6: CRASH-02 — Fix transcript-status-service

File: `lib/transcripts/status-service.ts`

The `transitionStatus()` function throws "not implemented" when the review workflow tries to update a transcript's status. This crashes the review submission flow.

Actions:
1. Find the `transitionStatus()` function.
2. Replace the throw statement with:
```typescript
console.log('[TranscriptStatusService] Status transition', { transcriptId, from, to });
return { success: true, previousStatus: from, newStatus: to };
```
3. Add a comment above the function: `// Phase 2: Implement state machine with validation rules`
4. Do NOT change the function signature or return type.
5. Do NOT modify any other functions in this file.

Verify: `grep -r "throw" lib/transcripts/status-service.ts` should return zero matches.

---

## TASK 3 of 6: STB-02 — Fix keyword building service

File: `lib/transcription/buildKeywords.ts`

This file throws "not implemented" if the transcription pipeline calls it for Deepgram keyword boosting. It will crash mid-transcription.

Actions:
1. Find the main export function (likely `buildKeywordsForJob` or similar).
2. Replace the entire function body with: `return [];`
3. Add a comment above the function: `// Phase 2: Implement Deepgram keyword boosting from job-specific dictionary`
4. Do NOT change the function signature or return type.
5. Do NOT modify any other code in this file.

Verify: `grep -r "throw" lib/transcription/buildKeywords.ts` should return zero matches.

---

## TASK 4 of 6: STB-03 — Fix health endpoint DB check

File: `lib/monitoring/health-service.ts`

The health service has a TODO for a real database check. Currently it might report "healthy" even when the database is down.

Actions:
1. Add this import at the top of the file (if not already present):
```typescript
import { createAdminClient } from '@/lib/supabase/admin';
```
2. Find the TODO or placeholder for the database health check.
3. Replace it with:
```typescript
try {
  const supabase = createAdminClient();
  const { error } = await supabase.from('profiles').select('id').limit(1);
  if (error) {
    return { status: 'unhealthy', database: error.message };
  }
  return { status: 'healthy', database: 'connected' };
} catch (err) {
  return { status: 'unhealthy', database: String(err) };
}
```
4. Do NOT change any other health checks in this file (e.g., Deepgram, storage checks).
5. Do NOT restructure the health service architecture.

Verify: `npm run build` passes. GET `/api/health` should include a `database` field in the response.

---

## TASK 5 of 6: ONB-01 — Fix invite accept page text

File: `app/auth/invite/accept/invite-accept-client.tsx`

The invite acceptance page currently says "User invitations are not yet available in beta. Please register directly." This confuses beta testers.

Actions:
1. Find the text block that says "not yet available" or "coming soon" (around lines 40-55).
2. Replace the heading text with: `Welcome to Depo-Pro Beta`
3. Replace the description paragraph with:
```
Welcome to the Depo-Pro beta! Please register for an account below. Your administrator will assign your role after registration.
```
4. Make sure the "Register Account" button links to `/register`.
5. Below the register button, add a line: `Already have an account?` with a Link component pointing to `/login`.
6. Change the icon from `AlertCircle` with yellow color to a friendly welcome style — change the color from `text-yellow-500` to `text-indigo-500`.
7. This is a TEXT AND LINK CHANGE ONLY — do NOT add new API routes, email logic, or imports beyond what's already in the file.

Verify: `npm run build` passes. Visit `/auth/invite/accept` in browser — shows friendly welcome message.

---

## TASK 6 of 6: ONB-02 — Connect contact form to webhook notification

File: `app/api/contact/route.ts`

The contact form validates, rate-limits, and logs to the database, but it never sends a notification. Add a non-blocking webhook call.

Actions:
1. Find the commented-out `sendEmail` block (around line 80-85).
2. Add this code ABOVE the comment (do NOT remove the existing comment):
```typescript
// Send webhook notification if configured
if (process.env.CONTACT_WEBHOOK_URL) {
  await fetch(process.env.CONTACT_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: `[Depo-Pro Contact] From: ${name} (${email})\n${message.substring(0, 500)}`
    })
  }).catch(() => {}); // Non-blocking — don't fail the user's request if webhook is down
}
```
3. Do NOT change the existing validation logic.
4. Do NOT change the existing rate limiting.
5. Do NOT change the existing audit logging.
6. Do NOT remove any existing code.

Verify: `npm run build` passes. If `CONTACT_WEBHOOK_URL` is not set, the form still returns success without error.

---

## FINAL VALIDATION

After completing all 6 tasks, run:

```bash
npm run typecheck
npm run build
grep -r "throw.*not implemented" lib/cost-control-service.ts lib/transcripts/status-service.ts lib/transcription/buildKeywords.ts
```

- typecheck: zero errors
- build: zero errors  
- grep: zero matches

Then commit:
```bash
git add lib/cost-control-service.ts lib/transcripts/status-service.ts lib/transcription/buildKeywords.ts lib/monitoring/health-service.ts app/auth/invite/accept/invite-accept-client.tsx app/api/contact/route.ts
git commit -m "phase-1+5: codex batch — fix crash stubs and onboarding text"
```

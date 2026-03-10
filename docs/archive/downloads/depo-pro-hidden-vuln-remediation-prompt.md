# DEPO-PRO — HIDDEN VULNERABILITY SCAN REMEDIATION
# Implementation Prompt for Claude Code
# =============================================================================
# Version:   1.0
# Date:      March 2026
# Branch:    feature/hidden-vuln-remediation
# Source:    Hidden Security Vulnerability Scan (14-phase parallel agent scan)
#            Commit baseline: 15bb44e (red-team simulation report)
#
# CROSS-REFERENCE: WHAT IS ALREADY COVERED
# The following scan findings are FULLY addressed in prior prompts.
# DO NOT re-implement them here — verify they exist and skip:
#
#   Public audio bucket / getPublicUrl()
#     -> feature/security-hardening Issue 2 (signed URLs)
#     -> feature/red-team-remediation Priority 2
#
#   Stripe + Deepgram webhook fail-open behavior
#     -> feature/red-team-remediation Priority 1
#
#   DB error messages / stack traces returned to client
#     -> feature/red-team-remediation Priority 4
#     -> lib/errors/api-error.ts (handleUnexpectedError, handleSupabaseError)
#
#   Global IDOR / paired-ownership validation
#     -> feature/security-hardening Issue 4
#
#   Distributed rate limiting
#     -> feature/red-team-remediation Priority 3 (Upstash)
#
# WHAT THIS PROMPT FIXES
#   Issue 1 -- calendar/suggestions: missing firm_id tenant isolation (CRITICAL)
#   Issue 2 -- Medical records routes: firm_id gate missing (CRITICAL)
#   Issue 3 -- Chronology routes: firm_id gate missing (CRITICAL)
#   Issue 4 -- Intake route: missing tenant + ownership validation (HIGH)
#   Issue 5 -- Stripe webhook: verification is STUBBED, not just fail-open (CRITICAL)
#   Issue 6 -- Client-side auth assumptions in components (HIGH)
#   Issue 7 -- npm audit: minimatch ReDoS + additional advisories (MEDIUM)
#   Issue 8 -- Startup env validation: fail-hard on missing critical vars (MEDIUM)
#   Issue 9 -- Logging leaks: sensitive objects logged to console (MEDIUM)
#
# INSTRUCTIONS
# 1. git checkout -b feature/hidden-vuln-remediation
# 2. Execute issues in numbered order
# 3. npx tsc --noEmit after EVERY issue (must return 0)
# 4. Commit each issue with the exact message shown
# 5. Run Final Verification Suite before PR
# =============================================================================

## ROLE

You are a senior security engineer closing specific vulnerabilities identified
by a 14-phase parallel security scan of Depo-Pro. Each issue below is a
confirmed finding with a specific file location, confirmed exploit path, and
targeted fix. Work precisely -- do not expand scope beyond what is specified.

---

## FROZEN FILES -- DO NOT MODIFY

```
lib/transcription/*
components/review/*
lib/auth/session.ts
lib/auth/permissions.ts
lib/supabase/admin.ts
prisma/schema.prisma
app/api/entities/extract/route.ts
lib/errors/api-error.ts               <- created in red-team-remediation
lib/storage/signed-url.ts             <- created in red-team-remediation
lib/rate-limit/index.ts               <- created in red-team-remediation
lib/auth/rotate-session.ts            <- created in red-team-remediation
```

---

## PRE-FLIGHT CHECKS

```bash
# 1. Clean baseline
npx tsc --noEmit && echo "PASS: typecheck clean"

# 2. Confirm prior work is merged (signed URLs, error sanitization, rate limiting)
grep -rn "getPublicUrl" lib/ app/api/ --include="*.ts" | grep "depo-audio" | wc -l
# Must be 0

ls lib/errors/api-error.ts lib/storage/signed-url.ts lib/rate-limit/index.ts 2>/dev/null
# All three must exist

# 3. Confirm the Stripe webhook file and its current state
cat app/api/webhooks/stripe/route.ts 2>/dev/null \
  || cat app/api/stripe/webhook/route.ts 2>/dev/null
# Note whether constructEvent is actually called or is a TODO/stub

# 4. Read the suggestions route
cat app/api/calendar/suggestions/route.ts 2>/dev/null

# 5. Scan for console.log with sensitive objects
grep -rn "console\.log(" app/api/ --include="*.ts" | head -30
grep -rn "console\.log(" lib/ --include="*.ts" \
  | grep -i "user\|token\|session\|request\|transcript" | head -20
```

---

## ISSUE 1 -- CALENDAR SUGGESTIONS: MISSING TENANT ISOLATION
**Commit:** `security: add firm_id tenant gate to calendar suggestions route`
**Severity: CRITICAL**
**File:** `app/api/calendar/suggestions/route.ts`

### What the scan found

The Phase 1 agent confirmed this route authenticates the user but queries
calendar/scheduling data without filtering by firm_id. Any authenticated
user from any firm can receive scheduling suggestions that include calendar
event data from other firms in the system.

### Fix

Open `app/api/calendar/suggestions/route.ts`. After the `getCurrentUser()`
call and null guard, every Supabase query in this route must be constrained
to the authenticated user's firm. Apply `.eq('firm_id', currentUser.firmId)`
to every query that touches calendar events, booking requests, availability
records, or reporter/scopist assignments.

**Pattern to apply:**

```typescript
import { getCurrentUser } from '@/lib/auth/session';
import { handleUnexpectedError, handleSupabaseError } from '@/lib/errors/api-error';

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TENANT GATE -- firm_id must be applied to EVERY query in this handler.
    // Without this, suggestions bleed across firm boundaries.
    const { data, error } = await supabase
      .from('calendar_events')
      .select('...')
      .eq('firm_id', currentUser.firmId)  // <- this line is the fix
      .gte('event_date', today)
      .limit(20);

    if (error) return handleSupabaseError(error, 'calendar-suggestions-GET');

    return NextResponse.json({ suggestions: data });
  } catch (err) {
    return handleUnexpectedError(err, 'GET /api/calendar/suggestions');
  }
}
```

Read the existing handler carefully. Apply the `firm_id` filter to every query
without changing the business logic of what suggestions are returned. Also
import `handleUnexpectedError` and `handleSupabaseError` from
`@/lib/errors/api-error` if not already imported, and wrap the handler body
in try-catch.

---

## ISSUE 2 -- MEDICAL RECORDS ROUTES: FIRM_ID GATE MISSING
**Commit:** `security: enforce firm_id tenant isolation on medical-records routes`
**Severity: CRITICAL**
**Files:**
```
app/api/jobs/[id]/medical-records/route.ts
app/api/jobs/[id]/medical-records/[recordId]/route.ts
```

### What the scan found

These routes check job ownership but do NOT verify `firm_id` as the outermost
gate. The job ownership check is insufficient because a firm_id check must
always be the outermost tenant boundary -- before any resource ownership check.

### Fix

**For `medical-records/route.ts` (list + create):**

```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // FIRM_ID OUTERMOST GATE -- verify job belongs to this firm before
    // checking any other ownership. Return 404 on mismatch (not 403) to
    // avoid confirming the resource exists.
    const { data: job } = await createAdminClient()
      .from('jobs')
      .select('id, firm_id')
      .eq('id', params.id)
      .eq('firm_id', currentUser.firmId)
      .single();

    if (!job) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const { data: records, error } = await createAdminClient()
      .from('medical_records')
      .select('*')
      .eq('job_id', params.id)
      .order('created_at', { ascending: false });

    if (error) return handleSupabaseError(error, 'medical-records-GET');
    return NextResponse.json({ records });
  } catch (err) {
    return handleUnexpectedError(err, 'GET /api/jobs/[id]/medical-records');
  }
}
```

**For `medical-records/[recordId]/route.ts` (single record CRUD):**

```typescript
// Three-way bind: record ID + job ID + firm ID
// If medical_records has a direct firm_id column:
const { data: record } = await createAdminClient()
  .from('medical_records')
  .select('id, job_id, firm_id')
  .eq('id', params.recordId)
  .eq('job_id', params.id)
  .eq('firm_id', currentUser.firmId)
  .single();

// If no direct firm_id column, join through jobs:
const { data: record } = await createAdminClient()
  .from('medical_records')
  .select('id, job_id, jobs!inner(firm_id)')
  .eq('id', params.recordId)
  .eq('job_id', params.id)
  .eq('jobs.firm_id', currentUser.firmId)
  .single();

if (!record) {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
```

Apply to all HTTP methods (GET, PATCH, DELETE) in both files. Wrap each
handler in try-catch using `handleUnexpectedError`.

---

## ISSUE 3 -- CHRONOLOGY ROUTES: FIRM_ID GATE MISSING
**Commit:** `security: enforce firm_id tenant isolation on chronology routes`
**Severity: CRITICAL**
**Files:**
```
app/api/jobs/[id]/chronology/route.ts
app/api/jobs/[id]/chronology/[entryId]/route.ts
app/api/jobs/[id]/chronology/export/route.ts
```

### What the scan found

Same pattern as Issue 2. The chronology export route is particularly high-risk
because it generates a full DOCX containing protected health information (PHI)
from medical records linked to the deposition. A cross-firm export request
would exfiltrate another firm's confidential case data.

### Fix

**Step 1 -- `chronology/route.ts`:** Apply the same job firm_id gate as
Issue 2 `medical-records/route.ts`.

**Step 2 -- `chronology/[entryId]/route.ts`:**

```typescript
// Three-way bind: entry ID + job ID + firm ID
const { data: entry } = await createAdminClient()
  .from('chronology_entries')
  .select('id, job_id, jobs!inner(firm_id)')
  .eq('id', params.entryId)
  .eq('job_id', params.id)
  .eq('jobs.firm_id', currentUser.firmId)
  .single();

if (!entry) {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
```

**Step 3 -- `chronology/export/route.ts`:** This is the highest-risk file.
Add the firm gate as the very first database operation:

```typescript
// Verify firm ownership BEFORE loading any chronology data for export.
// Without this, a cross-firm request generates a DOCX with another firm's PHI.
const { data: job } = await createAdminClient()
  .from('jobs')
  .select('id, firm_id')
  .eq('id', params.id)
  .eq('firm_id', currentUser.firmId)
  .single();

if (!job) {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

// Only after this check: proceed with chronology load and DOCX generation
```

Wrap all handlers in try-catch using `handleUnexpectedError`.

---

## ISSUE 4 -- INTAKE ROUTE: MISSING TENANT + OWNERSHIP VALIDATION
**Commit:** `security: add tenant and job ownership validation to intake route`
**Severity: HIGH**

### What the scan found

The intake route authenticates the user but does not confirm the target job
belongs to the requesting user's firm. An authenticated user from Firm B could
inject intake data (deponent names, attorney info, case metadata) into a job
owned by Firm A.

### Step 1 -- Locate the File

```bash
find app/api -name "route.ts" | xargs grep -l "intake" 2>/dev/null
```

### Step 2 -- Add Firm Gate and Input Sanitization

After auth, add:

```typescript
// Confirm job exists and belongs to this firm before accepting intake data
const { data: job } = await createAdminClient()
  .from('jobs')
  .select('id, firm_id, status')
  .eq('id', params.id)
  .eq('firm_id', currentUser.firmId)
  .single();

if (!job) {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

// Reject intake on jobs that are in terminal states
if (['completed', 'certified', 'cancelled'].includes(job.status)) {
  return NextResponse.json(
    { error: 'Cannot submit intake for a completed or cancelled job' },
    { status: 409 }
  );
}
```

Also sanitize all string inputs from the request body before writing to DB:

```typescript
const sanitize = (val: unknown, maxLen = 500): string | null => {
  if (typeof val !== 'string') return null;
  return val.replace(/\0/g, '').trim().slice(0, maxLen) || null;
};

const body = await request.json();
const sanitizedIntake = {
  case_number:    sanitize(body.causeNumber, 100),
  deponent_name:  sanitize(body.deponentName, 200),
  court:          sanitize(body.court, 300),
  deposition_date: sanitize(body.depositionDate, 10),
  // apply sanitize() to all string fields
};
```

---

## ISSUE 5 -- STRIPE WEBHOOK: VERIFICATION IS STUBBED
**Commit:** `security: implement real Stripe webhook signature verification`
**Severity: CRITICAL**
**File:** `app/api/webhooks/stripe/route.ts`

### What the scan found

The Phase 7-8 agent reported the verification is "stubbed/non-functional" --
more severe than the fail-open pattern addressed in the red-team prompt. The
code may have `constructEvent` commented out, behind a TODO, or wrapped in a
catch block that silently continues processing on failure.

### Step 1 -- Read the Current File

```bash
cat app/api/webhooks/stripe/route.ts
```

Look for these anti-patterns:

```typescript
// Anti-pattern A: commented out
// const event = stripe.webhooks.constructEvent(body, sig, secret);
const event = JSON.parse(body);  // INSECURE

// Anti-pattern B: TODO stub
// TODO: add stripe signature verification
const event = JSON.parse(body);

// Anti-pattern C: errors swallowed
try {
  event = stripe.webhooks.constructEvent(body, sig, secret);
} catch {
  // silent -- falls through and processes anyway
}

// Anti-pattern D: empty string secret
const secret = process.env.STRIPE_WEBHOOK_SECRET || '';  // '' = bypass
```

### Step 2 -- Replace with Production Implementation

```typescript
import Stripe from 'stripe';
import { NextRequest } from 'next/server';
import { handleUnexpectedError } from '@/lib/errors/api-error';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signatureHeader = request.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('[stripe-webhook] STRIPE_WEBHOOK_SECRET is not configured');
    return new Response('Webhook not configured', { status: 500 });
  }

  if (!signatureHeader) {
    console.error('[stripe-webhook] Missing stripe-signature header');
    return new Response('Missing signature', { status: 401 });
  }

  let event: Stripe.Event;
  try {
    // constructEvent throws on invalid signature -- this IS the verification.
    // Do not process the payload before this line returns successfully.
    event = stripe.webhooks.constructEvent(rawBody, signatureHeader, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown';
    console.error('[stripe-webhook] Signature verification failed:', message);
    // 401 -- Stripe will NOT retry 4xx, which is correct behavior for a
    // forged payload.
    return new Response('Webhook signature invalid', { status: 401 });
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionChange(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionCancelled(event.data.object as Stripe.Subscription);
        break;
      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      default:
        console.info('[stripe-webhook] Unhandled event type:', event.type);
    }
  } catch (err) {
    // Return 500 so Stripe retries the event
    console.error('[stripe-webhook] Handler error for event', event.id, ':', err);
    return new Response('Handler error', { status: 500 });
  }

  return new Response('OK', { status: 200 });
}

// Keep existing handler functions unchanged -- only the outer wrapper changes.
```

---

## ISSUE 6 -- CLIENT-SIDE AUTHORIZATION ASSUMPTIONS
**Commit:** `security: add server-side guards for client-side role-gated actions`
**Severity: HIGH**

### What the scan found

Client components hide/show UI based on role checks (e.g., `user.role ===
'ADMIN'`) without corresponding server-side enforcement on the API routes those
UI elements call. If the client check is bypassed via DevTools or direct API
calls, no server-side check catches the unauthorized action.

### Step 1 -- Audit Client Components

```bash
grep -rn "user\.role\|currentUser\.role" \
  app/ components/ hooks/ --include="*.tsx" --include="*.ts" \
  | grep -v "node_modules\|app/api/\|lib/auth" | head -30
```

### Step 2 -- Verify Server-Side Guards Exist

For each client-side role check found, open the API route it calls and confirm
a server-side role check exists. If missing, add it using the established
pattern:

```typescript
// Server-side role check to add to any route missing it
if (!['ADMIN', 'COURT_REPORTER'].includes(currentUser.role)) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

The client-side check can stay (it is good UX). The server-side check is what
makes it secure.

### Step 3 -- Add Audit Trail Comment to Client Components

For any client component that gate-keeps a destructive or privileged action:

```typescript
// UX-only: This hides the button for non-admins.
// Server-side enforcement: app/api/admin/actions/route.ts role check.
// If you remove that server-side check, add it back before shipping.
{currentUser.role === 'ADMIN' && <AdminPanel />}
```

---

## ISSUE 7 -- NPM AUDIT: DEPENDENCY VULNERABILITIES
**Commit:** `chore: patch npm audit advisories (minimatch ReDoS + others)`
**Severity: MEDIUM**

### Step 1 -- Run Full Audit

```bash
npm audit --omit=dev 2>&1
```

### Step 2 -- Apply Non-Breaking Fixes

```bash
npm audit fix --omit=dev
npx tsc --noEmit
```

### Step 3 -- Handle Remaining Advisories

For any that require `--force`:

```bash
# Review what force would change without applying it
npm audit fix --force --dry-run --omit=dev
```

Only apply `--force` if the affected package is NOT one of:
`next`, `react`, `@supabase/*`, `stripe`, `deepgram-sdk`

And the upgrade is a patch or minor version, not a major version bump.

For any advisory that cannot be safely fixed, add it to
`docs/SECURITY_TODO.md` with: package name, advisory ID, blocker reason,
and target fix date.

### Step 4 -- Add Audit to CI

```json
// package.json scripts
"audit:ci": "npm audit --audit-level=high --omit=dev"
```

---

## ISSUE 8 -- STARTUP ENV VALIDATION
**Commit:** `feat: add startup environment variable validation`
**Severity: MEDIUM**

Create `lib/env/validate.ts`:

```typescript
/**
 * Startup environment variable validation.
 *
 * Called once at module initialization. Missing required variables cause a
 * hard throw -- the deployment fails immediately rather than starting broken.
 *
 * CRITICAL: Do NOT add NEXTAUTH_SECRET, DATABASE_URL, or DIRECT_URL here.
 * Depo-Pro uses Supabase-native auth. Those variables are deprecated.
 */

const REQUIRED_SERVER_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'DEEPGRAM_API_KEY',
  'ANTHROPIC_API_KEY',
  'CRON_SECRET',
  'RESEND_API_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
] as const;

const REQUIRED_UPSTASH_VARS = [
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
] as const;

export function validateEnv(): void {
  if (typeof window !== 'undefined') return;

  const missing: string[] = [];
  const missingUpstash: string[] = [];

  for (const key of REQUIRED_SERVER_VARS) {
    if (!process.env[key]) missing.push(key);
  }
  for (const key of REQUIRED_UPSTASH_VARS) {
    if (!process.env[key]) missingUpstash.push(key);
  }

  if (missing.length > 0) {
    throw new Error(
      `[env] CRITICAL: Missing required environment variables:\n  ${missing.join('\n  ')}\n` +
      `Application cannot start without these variables.`
    );
  }

  if (missingUpstash.length > 0) {
    console.warn(
      `[env] WARNING: Upstash Redis not configured -- rate limiting uses in-memory store:\n  ${missingUpstash.join('\n  ')}`
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  if (!supabaseUrl.startsWith('https://') || !supabaseUrl.includes('.supabase.co')) {
    throw new Error(`[env] NEXT_PUBLIC_SUPABASE_URL appears malformed: ${supabaseUrl}`);
  }
}
```

Call at startup in `app/layout.tsx` (server component):

```typescript
import { validateEnv } from '@/lib/env/validate';

if (process.env.NODE_ENV !== 'test') {
  validateEnv();
}
```

---

## ISSUE 9 -- LOGGING LEAKS: SENSITIVE OBJECTS IN CONSOLE
**Commit:** `security: remove sensitive object logging from API routes`
**Severity: MEDIUM**

### Step 1 -- Find Unsafe Logs

```bash
grep -rn "console\.log(" app/api/ lib/ --include="*.ts" \
  | grep -i "user\|session\|transcript\|request\|payload\|token\|key" \
  | grep -v "console\.error\|console\.warn"

grep -rn "console\.log(req\b\|console\.log(request\b" \
  app/ lib/ --include="*.ts" --include="*.tsx"
```

### Step 2 -- Apply Replacements

```typescript
// REMOVE: full object logs
console.log('user:', user);          // DELETE
console.log('session:', session);    // DELETE
console.log('request body:', body);  // DELETE

// REPLACE with sanitized versions that log IDs, not content
// Before:
console.log('Processing job for user:', user);
// After:
console.info('[jobs] Processing for user:', user.id, 'firm:', user.firmId);

// Before:
console.log('Transcript words:', words);
// After:
console.info('[transcript] Word count:', words.length);

// Before:
console.log('Webhook payload:', payload);
// After:
console.info('[webhook] Event type:', payload.type, 'id:', payload.id);

// Before:
console.log('Error:', error);
// After:
console.error('[context] Operation failed:', error instanceof Error ? error.message : 'unknown');
```

**Rule:** Log IDs and counts, never content. Log error messages, never full
error objects. Never log auth tokens, cookies, or request headers.

### Step 3 -- Verify No Env Values in Logs

```bash
grep -rn "process\.env\." app/ lib/ --include="*.ts" \
  | grep "console\." | grep -v "NODE_ENV\|NEXT_PUBLIC"
# Must be 0 results
```

---

## FINAL VERIFICATION SUITE

```bash
# Issue 1: Suggestions tenant isolation
echo "=== 1. Suggestions route has firm_id ===" \
  && grep -n "firm_id\|firmId" app/api/calendar/suggestions/route.ts

# Issue 2-3: Medical records + chronology
echo "=== 2. Medical records firm_id gate ===" \
  && find app/api -path "*/medical-records*" -name "route.ts" \
  | xargs grep -l "firm_id\|firmId" | wc -l
# Should match the number of medical-records route files

echo "=== 3. Chronology firm_id gate ===" \
  && find app/api -path "*/chronology*" -name "route.ts" \
  | xargs grep -l "firm_id\|firmId" | wc -l

# Issue 5: Stripe webhook real implementation
echo "=== 5. Stripe webhook uses constructEvent ===" \
  && grep -rn "constructEvent" app/api/ --include="*.ts"

echo "=== 5b. No stub patterns remain ===" \
  && grep -rn "TODO.*verify\|JSON\.parse(body\|JSON\.parse(rawBody" \
     app/api/webhooks/stripe/route.ts 2>/dev/null | wc -l
# Must be 0

# Issue 7: npm audit clean
echo "=== 6. npm audit HIGH+ ===" \
  && npm audit --audit-level=high --omit=dev 2>&1 | tail -5

# Issue 8: Env validation
echo "=== 7. validateEnv exists ===" && ls lib/env/validate.ts
echo "=== 7b. validateEnv called ===" \
  && grep -n "validateEnv" app/layout.tsx

# Issue 9: No object logging
echo "=== 8. Sensitive object logs removed ===" \
  && grep -rn "console\.log(user\|console\.log(session\|console\.log(request" \
     app/api/ lib/ --include="*.ts" | wc -l
# Must be 0

# TypeScript and build
echo "=== 9. TypeScript ===" && npx tsc --noEmit
echo "=== 10. Build ===" && npm run build
echo "=== 11. Lint ===" && npm run lint
```

---

## CUMULATIVE SECURITY STATUS

After this prompt merges, all four security prompts will be complete:

| Finding | Prompt | Status |
|---|---|---|
| Middleware redirect loop | auth-email-hardening | Done |
| Auth-compat deprecated refs | auth-email-hardening | Done |
| Email SMTP to Resend | auth-email-hardening | Done |
| Public audio bucket (getPublicUrl) | security-hardening | Done |
| IDOR paired-ownership (global) | security-hardening | Done |
| File upload tenant enforcement | security-hardening | Done |
| Pagination firm_id isolation | security-hardening | Done |
| RLS policy verification | security-hardening | Done |
| Webhook fail-closed (Deepgram) | red-team-remediation | Done |
| Signed URLs (audio TTL) | red-team-remediation | Done |
| Distributed rate limiting (Upstash) | red-team-remediation | Done |
| Error response sanitization | red-team-remediation | Done |
| Session rotation on auth changes | red-team-remediation | Done |
| Suggestions route: no firm_id | hidden-vuln-remediation | Fix |
| Medical records: firm_id missing | hidden-vuln-remediation | Fix |
| Chronology: firm_id missing | hidden-vuln-remediation | Fix |
| Intake route: no tenant gate | hidden-vuln-remediation | Fix |
| Stripe webhook: stubbed | hidden-vuln-remediation | Fix |
| Client-side auth assumptions | hidden-vuln-remediation | Fix |
| npm audit advisories | hidden-vuln-remediation | Fix |
| Startup env validation | hidden-vuln-remediation | Fix |
| Logging leaks | hidden-vuln-remediation | Fix |

---

End of Prompt -- Depo-Pro Hidden Vulnerability Scan Remediation v1.0

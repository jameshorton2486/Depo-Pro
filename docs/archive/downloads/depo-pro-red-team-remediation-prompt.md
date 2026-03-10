# DEPO-PRO — RED TEAM SIMULATION REMEDIATION
# Comprehensive Implementation Prompt for Claude Code
# =============================================================================
# Version:   1.0
# Date:      March 2026
# Branch:    feature/red-team-remediation
# Source:    docs/audit/RED_TEAM_SIMULATION_REPORT.md (commit 15bb44e)
#
# SIMULATION FINDINGS — 5 HARDENING PRIORITIES
#   Priority 1 — Webhook fail-closed enforcement (CRITICAL)
#   Priority 2 — Signed URL / public bucket risk posture (CRITICAL — see note)
#   Priority 3 — Distributed rate limiting (HIGH)
#   Priority 4 — Error response sanitization (HIGH)
#   Priority 5 — Session rotation validation (MEDIUM)
#
# NOTE ON OVERLAP WITH PRIOR PROMPTS
#   The signed URL / public bucket work (Priority 2) was fully specified in
#   the Security Hardening prompt (feature/security-hardening Issue 2).
#   If that branch has been merged, Priority 2 below is already complete —
#   verify with the pre-flight check before proceeding. If NOT yet merged,
#   this prompt's Priority 2 section supersedes and replaces that one.
#
# INSTRUCTIONS
# ─────────────────────────────────────────────────────────────────────────────
# 1. Create branch: git checkout -b feature/red-team-remediation
# 2. Execute each Priority in numbered order
# 3. After each Priority: run `npx tsc --noEmit` (must return 0 errors)
# 4. Commit each Priority separately with the exact commit message provided
# 5. Run the Final Verification Suite before opening the PR
# 6. Do NOT modify frozen files (listed below)
# =============================================================================

## ROLE

You are a senior security engineer executing targeted remediations identified
by a red-team penetration simulation of Depo-Pro, a multi-tenant legal
transcription SaaS. The simulation ran 14 attack scenarios against a staging
environment. The five remediations below close the highest-impact gaps found.
Legal deposition data is privileged — a breach before beta launch would have
serious consequences. Fix everything; cut no corners.

---

## FROZEN FILES — DO NOT MODIFY

```
lib/transcription/*
components/review/*
lib/auth/session.ts
lib/auth/permissions.ts
lib/supabase/admin.ts
prisma/schema.prisma
app/api/entities/extract/route.ts     ← patched in a26923a
```

---

## PRE-FLIGHT CHECKS

Run ALL of these before making any changes. Record every result.

```bash
# 1. Baseline must be clean
npx tsc --noEmit && echo "✅ typecheck clean"

# 2. Confirm signed URL work from security-hardening branch
grep -rn "getPublicUrl" lib/ app/api/ --include="*.ts" --include="*.tsx" \
  | grep "depo-audio" | wc -l
# If 0 → signed URL work already merged. Priority 2 section below = SKIP.
# If >0 → signed URL work not merged. Execute Priority 2 fully.

# 3. Locate all webhook routes
find app/api -path "*/webhook*" -name "route.ts" 2>/dev/null
find app/api -path "*/webhooks*" -name "route.ts" 2>/dev/null
find app/api -name "route.ts" | xargs grep -l "webhook\|deepgram\|stripe" 2>/dev/null

# 4. Find rate-limiting implementation (if any)
grep -rn "rateLimit\|rateLimiter\|rate_limit\|RateLimit" \
  lib/ app/ --include="*.ts" --include="*.tsx" | head -20

# 5. Find error response patterns — look for stack traces or internal details
grep -rn "err\.stack\|error\.stack\|err\.message\|error\.message" \
  app/api/ --include="*.ts" | grep "NextResponse\|json(" | head -20

# 6. Check for session rotation calls post-login
grep -rn "signOut\|signIn\|refresh.*token\|rotate.*session\|session.*rotate" \
  app/ lib/ --include="*.ts" --include="*.tsx" | grep -v "node_modules" | head -20

# 7. Verify Deepgram webhook signature verification exists
grep -rn "x-dg-signature\|verifyDeepgramSignature\|DEEPGRAM.*SECRET\|dg-signature" \
  app/ lib/ --include="*.ts" --include="*.tsx"

# 8. Verify Stripe webhook signature verification exists
grep -rn "stripe.*webhook\|constructEvent\|STRIPE_WEBHOOK_SECRET" \
  app/ lib/ --include="*.ts" --include="*.tsx"
```

---

## PRIORITY 1 — WEBHOOK FAIL-CLOSED ENFORCEMENT
**Commit:** `security: enforce fail-closed webhook signature verification`
**Severity: CRITICAL**

### Context

The red-team simulation identified that webhook handlers (Deepgram transcription
callback, Stripe billing events) either skip signature verification entirely or
handle verification errors in a fail-open manner — meaning a failed verification
logs a warning but allows the payload to be processed anyway.

In a legal SaaS context this is critical: an attacker who can forge a Deepgram
webhook can inject arbitrary transcript content into a deposition record.
Forged Stripe events can manipulate billing state without payment.

**The rule is absolute: if signature verification fails, the handler MUST
return 401 and MUST NOT process the payload. No exceptions.**

### Step 1 — Locate All Webhook Handlers

```bash
find app/api -name "route.ts" | xargs grep -l \
  "webhook\|deepgram\|stripe\|x-dg-signature\|stripe-signature" 2>/dev/null
```

Open and read each file found.

### Step 2 — Deepgram Webhook Handler

Expected location: `app/api/deepgram/webhook/route.ts` or
`app/api/webhooks/deepgram/route.ts`

**Current (fail-open) pattern to look for:**
```typescript
// INSECURE — any of these patterns means fail-open:
const sig = request.headers.get('x-dg-signature');
if (!sig) {
  console.warn('Missing Deepgram signature');
  // falls through and processes anyway — FAIL-OPEN
}

// OR: signature check throws but is caught and ignored
try {
  verifySignature(payload, sig);
} catch {
  console.error('Signature invalid'); // logs but continues — FAIL-OPEN
}
```

**Required (fail-closed) pattern:**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createHmac, timingSafeEqual } from 'crypto';

// Deepgram signs webhooks with HMAC-SHA256 using the webhook secret.
// The signature is in the 'Authorization' header as a Bearer token
// OR in 'x-dg-signature' depending on Deepgram configuration.
// Verify against DEEPGRAM_WEBHOOK_SECRET env var.
function verifyDeepgramSignature(
  rawBody: Buffer,
  signatureHeader: string | null,
): boolean {
  const secret = process.env.DEEPGRAM_WEBHOOK_SECRET;

  // FAIL-CLOSED: If we have no secret configured, we cannot verify.
  // Reject ALL requests rather than run unverified.
  if (!secret) {
    console.error('[deepgram-webhook] DEEPGRAM_WEBHOOK_SECRET not configured — rejecting all requests');
    return false;
  }

  if (!signatureHeader) {
    return false;
  }

  // Strip 'sha256=' prefix if present
  const providedSig = signatureHeader.startsWith('sha256=')
    ? signatureHeader.slice(7)
    : signatureHeader;

  const expectedSig = createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  try {
    // Timing-safe comparison prevents timing attacks
    return timingSafeEqual(
      Buffer.from(providedSig, 'hex'),
      Buffer.from(expectedSig, 'hex'),
    );
  } catch {
    // Buffer.from will throw if lengths differ — treat as invalid
    return false;
  }
}

export async function POST(request: NextRequest) {
  // Read raw body BEFORE parsing — signature is computed on raw bytes
  const rawBody = Buffer.from(await request.arrayBuffer());

  const signatureHeader =
    request.headers.get('x-dg-signature') ??
    request.headers.get('authorization')?.replace('Bearer ', '') ??
    null;

  // FAIL-CLOSED: Invalid signature = immediate 401, no processing
  if (!verifyDeepgramSignature(rawBody, signatureHeader)) {
    console.error('[deepgram-webhook] Signature verification failed — rejecting payload');
    return new Response('Unauthorized', { status: 401 });
  }

  // Safe to parse only after signature is verified
  let payload: unknown;
  try {
    payload = JSON.parse(rawBody.toString('utf-8'));
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  // ... rest of handler (transcript processing logic unchanged)
}
```

**Add to `.env.example`:**
```
DEEPGRAM_WEBHOOK_SECRET=your_deepgram_webhook_secret_here
```

**Add to Vercel environment variables** (all environments):
`DEEPGRAM_WEBHOOK_SECRET` — obtain from Deepgram dashboard under your webhook
configuration. If Deepgram does not support HMAC secrets for your account tier,
use the `CRON_SECRET` pattern: include a `?secret=` query parameter in the
webhook URL registered with Deepgram and validate it as a bearer token.

**Fallback if Deepgram HMAC is not available:**

```typescript
// Alternative: shared secret in URL query parameter
function verifyDeepgramQuerySecret(request: NextRequest): boolean {
  const secret = process.env.DEEPGRAM_WEBHOOK_SECRET;
  if (!secret) return false;
  const provided = request.nextUrl.searchParams.get('secret');
  if (!provided) return false;
  // Timing-safe comparison even for query params
  try {
    return timingSafeEqual(Buffer.from(provided), Buffer.from(secret));
  } catch {
    return false;
  }
}
```

### Step 3 — Stripe Webhook Handler

Expected location: `app/api/webhooks/stripe/route.ts` or
`app/api/stripe/webhook/route.ts`

Stripe provides its own `constructEvent` function for signature verification.
The current implementation must use it with fail-closed behavior:

```typescript
import Stripe from 'stripe';
import { NextRequest } from 'next/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signatureHeader = request.headers.get('stripe-signature');

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  // FAIL-CLOSED: Missing secret = reject all
  if (!webhookSecret) {
    console.error('[stripe-webhook] STRIPE_WEBHOOK_SECRET not configured');
    return new Response('Server configuration error', { status: 500 });
  }

  if (!signatureHeader) {
    return new Response('Missing stripe-signature header', { status: 401 });
  }

  let event: Stripe.Event;
  try {
    // constructEvent throws on invalid signature — this IS the verification
    event = stripe.webhooks.constructEvent(rawBody, signatureHeader, webhookSecret);
  } catch (err) {
    // FAIL-CLOSED: Log but do not process
    console.error('[stripe-webhook] Signature verification failed:', err instanceof Error ? err.message : 'unknown');
    return new Response('Webhook signature invalid', { status: 401 });
  }

  // Safe to process only after constructEvent succeeds
  switch (event.type) {
    // ... billing event handlers (unchanged)
  }

  return new Response('OK', { status: 200 });
}
```

### Step 4 — Verify No Other Unauthenticated Webhook-Style Endpoints

```bash
# Find any route that does NOT call getCurrentUser() and is not a known
# intentional public endpoint
grep -rn "export async function POST" app/api/ --include="route.ts" -l \
  | while read f; do
      if ! grep -q "getCurrentUser\|withRouteProtection\|requireAuthV2\|webhook\|health\|cron\|contact" "$f"; then
        echo "⚠️  Unguarded POST: $f"
      fi
    done
```

For any route surfaced by the above that is NOT a webhook, add `getCurrentUser`
authentication per the established pattern.

### Verification

```bash
# Deepgram webhook rejects requests without valid signature
# Stripe webhook rejects requests without valid stripe-signature
# Neither logs a warning and continues processing on failure
npx tsc --noEmit
grep -rn "DEEPGRAM_WEBHOOK_SECRET\|STRIPE_WEBHOOK_SECRET" .env.example
```

---

## PRIORITY 2 — SIGNED URL / PUBLIC BUCKET RISK POSTURE
**Commit:** `security: replace public audio URLs with short-TTL signed URLs`
**Severity: CRITICAL**

**SKIP THIS SECTION IF** the pre-flight check confirmed `getPublicUrl` for
`depo-audio` returns 0 results — meaning the security-hardening branch work
has already been merged.

**IF NOT YET DONE**, implement the following in full:

### Step 1 — Create Typed Signed URL Helper

Create `lib/storage/signed-url.ts`:

```typescript
import { createAdminClient } from '@/lib/supabase/admin';

// TTLs chosen per access pattern and sensitivity level:
// Audio: 15 min — sufficient for a review segment; short enough to prevent link sharing
// Exports: 24 hr — attorneys need time to download certified transcripts
// Files: 1 hr — medical records, exhibits accessed during active review sessions
const TTL: Record<BucketName, number> = {
  'depo-audio':    15 * 60,
  'depo-exports':  24 * 60 * 60,
  'depo-files':    60 * 60,
  'depo-chunks':   15 * 60,
};

type BucketName = 'depo-audio' | 'depo-files' | 'depo-exports' | 'depo-chunks';

export interface SignedUrlResult {
  signedUrl: string;
  expiresAt: Date;
}

/**
 * WHY ADMIN CLIENT: depo-audio is private. Signing a URL for a private
 * bucket object requires the service role key — an authenticated user
 * key cannot sign objects it does not own. The signed URL itself is what
 * gets passed to the browser; no key is ever exposed client-side.
 */
export async function getSignedStorageUrl(
  bucket: BucketName,
  path: string,
): Promise<SignedUrlResult> {
  const supabase = createAdminClient();
  const ttl = TTL[bucket];

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, ttl);

  if (error || !data?.signedUrl) {
    throw new Error(
      `[Storage] Failed to sign ${bucket}/${path}: ${error?.message ?? 'no URL returned'}`
    );
  }

  return {
    signedUrl: data.signedUrl,
    expiresAt: new Date(Date.now() + ttl * 1000),
  };
}

export async function getSignedStorageUrls(
  bucket: BucketName,
  paths: string[],
): Promise<Map<string, SignedUrlResult>> {
  const supabase = createAdminClient();
  const ttl = TTL[bucket];

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrls(paths, ttl);

  if (error || !data) {
    throw new Error(`[Storage] Batch sign failed for ${bucket}: ${error?.message}`);
  }

  const expiresAt = new Date(Date.now() + ttl * 1000);
  const result = new Map<string, SignedUrlResult>();
  for (const item of data) {
    if (item.signedUrl && item.path) {
      result.set(item.path, { signedUrl: item.signedUrl, expiresAt });
    }
  }
  return result;
}
```

### Step 2 — Replace All `getPublicUrl` Calls on Audio Bucket

```bash
# Find every callsite
grep -rn "getPublicUrl" lib/ app/ --include="*.ts" --include="*.tsx" \
  | grep "depo-audio"
```

For each:
```typescript
// BEFORE (INSECURE)
const { data } = supabase.storage.from('depo-audio').getPublicUrl(path);
const url = data.publicUrl;

// AFTER (SECURE)
import { getSignedStorageUrl } from '@/lib/storage/signed-url';
const { signedUrl: url, expiresAt } = await getSignedStorageUrl('depo-audio', path);
```

### Step 3 — Add Audio URL Refresh Endpoint

Create `app/api/jobs/[id]/audio-url/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSignedStorageUrl } from '@/lib/storage/signed-url';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();

  // TENANT CHECK: job must belong to the requesting user's firm
  const { data: job } = await supabase
    .from('jobs')
    .select('id, audio_storage_path, firm_id')
    .eq('id', params.id)
    .eq('firm_id', currentUser.firmId)
    .single();

  if (!job?.audio_storage_path) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const { signedUrl, expiresAt } = await getSignedStorageUrl(
      'depo-audio',
      job.audio_storage_path,
    );
    return NextResponse.json({ audioUrl: signedUrl, expiresAt: expiresAt.toISOString() });
  } catch {
    return NextResponse.json({ error: 'Could not generate audio URL' }, { status: 500 });
  }
}
```

### Verification

```bash
grep -rn "getPublicUrl" lib/ app/api/ --include="*.ts" | grep "depo-audio" | wc -l
# Must be 0
npx tsc --noEmit
```

---

## PRIORITY 3 — DISTRIBUTED RATE LIMITING
**Commit:** `security: implement distributed rate limiting on high-risk endpoints`
**Severity: HIGH**

### Context

The red-team simulation identified that rate limiting is implemented via an
in-memory store (a `Map` or similar). In a Vercel serverless environment,
every function invocation may run in a separate process — the in-memory store
is reset on each cold start and is NOT shared across concurrent instances.
This means an attacker can trivially bypass the rate limiter by sending
concurrent requests to different Vercel function instances.

The fix is to use Upstash Redis as a shared, persistent rate limit backing
store. Upstash is serverless-native, requires zero infrastructure, and works
with the existing Vercel deployment.

**Do NOT add Redis for any other purpose. This is the only change.**

### Step 1 — Add Upstash Redis Dependency

```bash
npm install @upstash/ratelimit @upstash/redis
```

### Step 2 — Create Centralized Rate Limiter

Create `lib/rate-limit/index.ts`:

```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Upstash Redis client — serverless-compatible, persistent across instances.
// WHY UPSTASH: In-memory rate limiting on Vercel is per-instance and resets
// on every cold start. Distributed rate limiting requires a shared store.
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// ── Rate Limit Tiers ────────────────────────────────────────────────────────
// Each tier is tuned to the legitimate usage pattern for that endpoint class.
// Tiers are defined per action type, not per route, to allow reuse.

/** Transcription trigger: expensive Deepgram operation — 10 per user per hour */
export const transcriptionLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 h'),
  prefix: 'rl:transcription',
});

/** Job creation: 30 per user per hour */
export const jobCreationLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, '1 h'),
  prefix: 'rl:job_create',
});

/** Transcript corrections: 200 per user per 5 minutes (editing is frequent) */
export const correctionLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(200, '5 m'),
  prefix: 'rl:correction',
});

/** Export generation: 20 per user per hour (DOCX/PDF generation is expensive) */
export const exportLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, '1 h'),
  prefix: 'rl:export',
});

/** Medical record extraction: 5 per user per hour (Claude API call + PDF processing) */
export const extractionLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 h'),
  prefix: 'rl:extraction',
});

/** Auth endpoints (login, password reset): 10 per IP per 15 minutes */
export const authLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '15 m'),
  prefix: 'rl:auth',
});

/** General API: 300 per user per minute (catch-all for unlisted endpoints) */
export const generalLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(300, '1 m'),
  prefix: 'rl:general',
});

// ── Helper: Check and Return Standard 429 Response ─────────────────────────

import { NextResponse } from 'next/server';

export async function checkRateLimit(
  limiter: Ratelimit,
  identifier: string,
): Promise<{ limited: boolean; response?: NextResponse }> {
  try {
    const { success, limit, remaining, reset } = await limiter.limit(identifier);

    if (!success) {
      return {
        limited: true,
        response: NextResponse.json(
          { error: 'Too many requests. Please slow down.' },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': limit.toString(),
              'X-RateLimit-Remaining': remaining.toString(),
              'X-RateLimit-Reset': reset.toString(),
              'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString(),
            },
          }
        ),
      };
    }

    return { limited: false };
  } catch (err) {
    // FAIL-OPEN on rate limit errors: if Redis is unreachable, allow the
    // request rather than blocking legitimate users. Log for investigation.
    console.error('[rate-limit] Redis error — allowing request:', err);
    return { limited: false };
  }
}
```

### Step 3 — Apply Rate Limiters to High-Risk Endpoints

Apply `checkRateLimit` to the following routes. For each, read the existing
handler and add the check immediately after `getCurrentUser()` succeeds:

```typescript
// Standard application pattern for all rate-limited routes:
import { checkRateLimit, transcriptionLimiter } from '@/lib/rate-limit';

export async function POST(request: NextRequest, ...) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rate limit by user ID — per-user limits, not per-IP
  // (IP-based limits are less reliable behind load balancers/proxies)
  const { limited, response } = await checkRateLimit(
    transcriptionLimiter,
    currentUser.id,
  );
  if (limited) return response!;

  // ... rest of handler
}
```

**Routes and their assigned limiters:**

| Route | Handler | Limiter |
|---|---|---|
| `app/api/jobs/[id]/transcribe/route.ts` | POST | `transcriptionLimiter` |
| `app/api/jobs/route.ts` | POST | `jobCreationLimiter` |
| `app/api/transcripts/[id]/corrections/route.ts` | POST/PATCH | `correctionLimiter` |
| `app/api/transcripts/[id]/words/route.ts` | PATCH | `correctionLimiter` |
| `app/api/jobs/[id]/export/route.ts` | POST | `exportLimiter` |
| `app/api/transcripts/[id]/export/route.ts` | POST | `exportLimiter` |
| `app/api/jobs/[id]/medical-records/[recordId]/extract/route.ts` | POST | `extractionLimiter` |
| `app/api/jobs/[id]/chronology/export/route.ts` | POST | `exportLimiter` |

**Auth routes (use IP as identifier, not user ID):**
```typescript
// For auth endpoints, use IP since user may not be authenticated yet
const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  ?? request.headers.get('x-real-ip')
  ?? '127.0.0.1';

const { limited, response } = await checkRateLimit(authLimiter, ip);
```

Apply to `app/api/auth/*/route.ts` handlers (forgot-password, verify-otp, etc.)
if they exist as custom routes. Supabase-handled auth does not need this.

### Step 4 — Remove In-Memory Rate Limiter

```bash
# Find the old in-memory implementation
grep -rn "new Map\|rateLimitMap\|rateLimit.*Map" lib/ app/ --include="*.ts"
```

For any in-memory rate limit store found, delete it and replace all its
callsites with the appropriate distributed limiter from `lib/rate-limit/index.ts`.

### Step 5 — Environment Variables

**Add to `.env.example`:**
```
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_upstash_token_here
```

**Add to Vercel environment variables** (all environments):
- `UPSTASH_REDIS_REST_URL` — from Upstash dashboard
- `UPSTASH_REDIS_REST_TOKEN` — from Upstash dashboard

Create a free Upstash Redis database at https://console.upstash.com if one
does not already exist. Use the "Global" region for lowest latency from Vercel.

### Verification

```bash
# No in-memory rate limit stores remain
grep -rn "new Map.*rate\|rateLimitMap\|rateLimit.*Map\|const.*Map.*rate" \
  lib/ app/ --include="*.ts" | grep -v "node_modules"
npx tsc --noEmit
```

---

## PRIORITY 4 — ERROR RESPONSE SANITIZATION
**Commit:** `security: sanitize API error responses to prevent information disclosure`
**Severity: HIGH**

### Context

The red-team simulation found that some API routes return raw error objects,
stack traces, or internal database error messages directly to the client.
Examples found:

```typescript
// INSECURE — reveals internal details:
catch (err) {
  return NextResponse.json({ error: err.message }, { status: 500 });
}

// ALSO INSECURE — stack trace to client:
catch (err) {
  return NextResponse.json({ error: err.stack }, { status: 500 });
}

// ALSO INSECURE — raw Supabase error leaks table/column names:
const { error } = await supabase.from('jobs').select('*');
if (error) return NextResponse.json({ error }, { status: 500 });
```

An attacker can use disclosed table names, column names, and SQL error messages
to enumerate the schema and craft more targeted injection attempts.

### Step 1 — Create Centralized Error Handler

Create `lib/errors/api-error.ts`:

```typescript
/**
 * Centralized API error handling for Depo-Pro.
 *
 * SECURITY RULE: Internal error details (stack traces, database errors,
 * Supabase error codes, SQL fragments) must NEVER be returned to the client.
 * All 500-class errors return a generic message. Specific error details are
 * logged server-side only, where they are accessible to engineers but not
 * attackers.
 */

import { NextResponse } from 'next/server';

// Error codes that are safe to surface to the client
// These describe the problem without revealing implementation details
export type SafeErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

interface ApiErrorOptions {
  message: string;       // Safe message for the client
  status: number;        // HTTP status code
  code: SafeErrorCode;
  logContext?: Record<string, unknown>; // Internal context — logged, not returned
}

export function apiError(options: ApiErrorOptions): NextResponse {
  const { message, status, code, logContext } = options;

  // Log internal context server-side only
  if (logContext || status >= 500) {
    console.error(`[api-error] ${code}: ${message}`, logContext ?? {});
  }

  // Return only the safe public message
  return NextResponse.json({ error: message, code }, { status });
}

/**
 * Safe catch handler for unexpected errors in API routes.
 *
 * Usage:
 *   try {
 *     // ... handler logic
 *   } catch (err) {
 *     return handleUnexpectedError(err, 'context description');
 *   }
 */
export function handleUnexpectedError(
  err: unknown,
  context: string,
): NextResponse {
  // Log the full error server-side (stack trace, message, etc.)
  console.error(`[api-error] Unexpected error in ${context}:`, err);

  // Return only a generic message to the client — NEVER the actual error
  return NextResponse.json(
    { error: 'An unexpected error occurred. Please try again.', code: 'INTERNAL_ERROR' },
    { status: 500 }
  );
}

/**
 * Safe handler for Supabase query errors.
 *
 * Supabase error objects contain table names, column names, and Postgres
 * error codes. NEVER pass them directly to the client.
 */
export function handleSupabaseError(
  error: { message?: string; code?: string; details?: string } | null,
  context: string,
): NextResponse {
  if (error) {
    // Log the Supabase error details server-side only
    console.error(`[api-error] Supabase error in ${context}:`, {
      message: error.message,
      code: error.code,
      details: error.details,
    });
  }

  return NextResponse.json(
    { error: 'A database error occurred. Please try again.', code: 'INTERNAL_ERROR' },
    { status: 500 }
  );
}
```

### Step 2 — Find and Replace Unsafe Error Patterns

```bash
# Find all routes returning raw error details
grep -rn "err\.message\|error\.message\|err\.stack\|error\.stack" \
  app/api/ --include="*.ts" \
  | grep "NextResponse\|json("
```

For each result, apply the fix:

```typescript
// ── PATTERN A: Raw error.message to client ───────────────────────────────────
// BEFORE:
catch (err) {
  return NextResponse.json({ error: err.message }, { status: 500 });
}
// AFTER:
catch (err) {
  return handleUnexpectedError(err, 'context-description-here');
}

// ── PATTERN B: Raw Supabase error to client ──────────────────────────────────
// BEFORE:
const { data, error } = await supabase.from('jobs').select('*');
if (error) return NextResponse.json({ error }, { status: 500 });
// AFTER:
const { data, error } = await supabase.from('jobs').select('*');
if (error) return handleSupabaseError(error, 'jobs-list');

// ── PATTERN C: Spreading error object ────────────────────────────────────────
// BEFORE:
return NextResponse.json({ success: false, ...error }, { status: 500 });
// AFTER:
return handleSupabaseError(error, 'context-description');

// ── PATTERN D: Re-throwing with message ──────────────────────────────────────
// BEFORE:
throw new Error(`Database error: ${error.message}`);
// AFTER:
// Log server-side, throw sanitized version:
console.error('[context] DB error:', error);
throw new Error('Database operation failed');  // No internal details
```

### Step 3 — Add Global Error Boundary to High-Traffic Routes

For the highest-traffic routes (jobs, transcripts, corrections), wrap the
entire handler body in a try-catch using `handleUnexpectedError`:

```typescript
import { handleUnexpectedError, handleSupabaseError } from '@/lib/errors/api-error';

export async function POST(request: NextRequest, { params }: ...) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ... all handler logic

  } catch (err) {
    return handleUnexpectedError(err, 'POST /api/jobs/[id]/transcribe');
  }
}
```

**Routes requiring the outer try-catch wrapper:**
```
app/api/jobs/route.ts
app/api/jobs/[id]/route.ts
app/api/jobs/[id]/transcribe/route.ts (if it exists)
app/api/transcripts/[id]/corrections/route.ts
app/api/transcripts/[id]/words/route.ts
app/api/transcripts/[id]/export/route.ts
app/api/jobs/[id]/medical-records/[recordId]/extract/route.ts
app/api/deepgram/webhook/route.ts
```

### Step 4 — Verify No Debug Information in Responses

```bash
# Check for any remaining raw error exposure
grep -rn "err\.message\|error\.message\|err\.stack\|\.details\b" \
  app/api/ --include="*.ts" \
  | grep "json\|Response\|return" \
  | grep -v "// AFTER\|// safe\|logContext"
```

This should return zero results or only commented examples.

### Verification

```bash
npx tsc --noEmit
# Manual test: trigger a 500 error and confirm response is:
# { "error": "An unexpected error occurred. Please try again.", "code": "INTERNAL_ERROR" }
# NOT: { "error": "insert or update on table \"jobs\" violates foreign key constraint..." }
```

---

## PRIORITY 5 — SESSION ROTATION VALIDATION
**Commit:** `security: enforce session rotation on sensitive auth state changes`
**Severity: MEDIUM**

### Context

The red-team simulation found that after sensitive authentication events
(password change, role change, email change), the existing Supabase session
token for that user remains valid. This means:

1. An attacker who captured a session token before a password reset can
   continue using it — the password reset does not invalidate old sessions
2. A user whose role is downgraded (e.g., ADMIN → SCOPIST) retains their
   old session which still carries the ADMIN role claim until token expiry

Supabase provides `supabase.auth.admin.signOut(userId, 'others')` to
invalidate all sessions for a user except the current one. This must be
called after any sensitive auth state change.

### Step 1 — Locate Sensitive Auth State Change Endpoints

```bash
# Password changes
grep -rn "updateUser\|update.*password\|password.*update\|changePassword" \
  app/api/ --include="*.ts"

# Role changes
grep -rn "role.*update\|update.*role\|\.role\s*=" \
  app/api/ --include="*.ts" | grep "supabase\|from("

# Email changes
grep -rn "updateUser\|update.*email\|email.*update" \
  app/api/ --include="*.ts"

# Profile admin routes
grep -rn "route.ts" app/api/admin/users/ app/api/profile/ 2>/dev/null
```

### Step 2 — Create Session Rotation Helper

Create `lib/auth/rotate-session.ts`:

```typescript
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Invalidates all sessions for a user except the current one.
 *
 * Call this after any of these events:
 *   - Password change
 *   - Role change (up or down)
 *   - Email change
 *   - Account suspension or deactivation
 *
 * WHY: Supabase JWT tokens are valid until expiry by default. After a
 * security-sensitive change, old tokens must be revoked to prevent a
 * compromised or stale session from retaining elevated access.
 *
 * WHY ADMIN CLIENT: signOut with scope 'others' is an admin operation
 * that requires the service role key.
 */
export async function rotateUserSessions(
  userId: string,
  reason: string,
): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase.auth.admin.signOut(userId, 'others');

  if (error) {
    // Log but do not throw — session rotation failure should not block
    // the primary operation (e.g., the password change itself should still
    // succeed). Alert should be raised for investigation.
    console.error(`[session-rotation] Failed to rotate sessions for user ${userId} after ${reason}:`, error.message);
  } else {
    console.info(`[session-rotation] Sessions rotated for user ${userId} after ${reason}`);
  }
}
```

### Step 3 — Apply Session Rotation at Sensitive Callsites

**Password change endpoint:**
```typescript
import { rotateUserSessions } from '@/lib/auth/rotate-session';

// After successfully updating the password:
await supabase.auth.admin.updateUserById(userId, { password: newPassword });

// Rotate all sessions — the user's current session remains valid,
// but any captured tokens from before the password change are invalidated.
await rotateUserSessions(userId, 'password_change');

return NextResponse.json({ success: true });
```

**Role change endpoint (admin user management):**
```typescript
// After updating the role in the profiles table:
await supabase.from('profiles').update({ role: newRole }).eq('id', targetUserId);

// CRITICAL: Role changes must immediately invalidate old sessions.
// Without rotation, a demoted ADMIN retains their elevated JWT claims
// until the token naturally expires (up to 1 hour).
await rotateUserSessions(targetUserId, `role_change:${oldRole}_to_${newRole}`);
```

**Account deactivation/suspension:**
```typescript
// After setting is_active = false or similar:
await rotateUserSessions(targetUserId, 'account_suspended');
```

### Step 4 — Apply to All Relevant Route Files

Find the files from Step 1 and add `rotateUserSessions` after each sensitive
operation. The specific routes will depend on what the pre-flight scan found —
common locations:

```
app/api/admin/users/[id]/route.ts     ← role changes, deactivation
app/api/profile/route.ts              ← email changes
app/api/auth/change-password/route.ts ← password changes (if custom route)
app/api/admin/users/[id]/role-history/route.ts ← role updates
```

### Verification

```bash
npx tsc --noEmit
grep -rn "rotateUserSessions" app/api/ --include="*.ts" | wc -l
# Should show at least 2–3 callsites (password, role, deactivation)
```

---

## FINAL VERIFICATION SUITE

Run all checks after completing all five Priorities:

```bash
# ── Priority 1: Webhook fail-closed ─────────────────────────────────────────
echo "=== 1. Deepgram webhook has HMAC verification ===" \
  && grep -n "timingSafeEqual\|verifyDeepgramSignature\|DEEPGRAM_WEBHOOK_SECRET" \
     app/api/deepgram/webhook/route.ts 2>/dev/null \
  || grep -rn "verifyDeepgramSignature\|DEEPGRAM_WEBHOOK_SECRET" \
     app/api/webhooks/ --include="*.ts" 2>/dev/null

echo "=== 2. Stripe webhook uses constructEvent ===" \
  && grep -rn "constructEvent" app/api/ --include="*.ts"

echo "=== 3. No webhook handlers with fail-open patterns ===" \
  && grep -rn "console.warn.*signature\|console.error.*signature" \
     app/api/ --include="*.ts" \
  | grep -v "return.*401\|return.*Unauthorized"
# Should return 0 lines — every signature failure must return 401

# ── Priority 2: Signed URLs ──────────────────────────────────────────────────
echo "=== 4. No public audio URLs (must be 0) ===" \
  && grep -rn "getPublicUrl" lib/ app/api/ --include="*.ts" \
  | grep "depo-audio" | wc -l

# ── Priority 3: Distributed rate limiting ────────────────────────────────────
echo "=== 5. Upstash rate limiter present ===" \
  && grep -rn "upstash\|Ratelimit" lib/rate-limit/ --include="*.ts" | wc -l
# Should be > 0

echo "=== 6. No in-memory rate limit maps ===" \
  && grep -rn "new Map.*rate\|rateLimitMap" lib/ app/ --include="*.ts" \
  | grep -v "node_modules" | wc -l
# Should be 0

# ── Priority 4: Error sanitization ───────────────────────────────────────────
echo "=== 7. No raw error.message returned to client ===" \
  && grep -rn "err\.message\|error\.message" app/api/ --include="*.ts" \
  | grep "json(\|Response(" | grep -v "logContext\|console\|\/\/ " | wc -l
# Should be 0

echo "=== 8. handleUnexpectedError in place on high-traffic routes ===" \
  && grep -rn "handleUnexpectedError" app/api/ --include="*.ts" | wc -l
# Should be >= 8

# ── Priority 5: Session rotation ─────────────────────────────────────────────
echo "=== 9. Session rotation applied ===" \
  && grep -rn "rotateUserSessions" app/api/ --include="*.ts" | wc -l
# Should be >= 2

# ── TypeScript and build ─────────────────────────────────────────────────────
echo "=== 10. TypeScript check ===" && npx tsc --noEmit
echo "=== 11. Build ===" && npm run build
echo "=== 12. Lint ===" && npm run lint
```

**Expected results:**
- Check 1: Shows HMAC lines in Deepgram handler
- Check 2: Shows `constructEvent` in Stripe handler
- Check 3: Zero lines — no fail-open patterns remain
- Check 4: `0` — no public audio URLs
- Check 5: Greater than 0 — Upstash limiter exists
- Check 6: `0` — no in-memory rate limit maps
- Check 7: `0` — no raw error details returned to client
- Check 8: `>= 8` — outer error boundaries in place
- Check 9: `>= 2` — session rotation applied
- Checks 10–12: All pass

---

## REMEDIATION SUMMARY TABLE

| # | Finding | Severity | Fix | Commit |
|---|---|---|---|---|
| 1 | Webhook fail-closed enforcement | CRITICAL | HMAC verification + fail on missing secret | `security: enforce fail-closed webhook signature verification` |
| 2 | Public bucket / audio URL exposure | CRITICAL | Short-TTL signed URLs for all audio | `security: replace public audio URLs with short-TTL signed URLs` |
| 3 | In-memory rate limiting bypassable | HIGH | Upstash Redis distributed limiter | `security: implement distributed rate limiting on high-risk endpoints` |
| 4 | Internal error details in responses | HIGH | Centralized sanitized error handler | `security: sanitize API error responses to prevent information disclosure` |
| 5 | Session not rotated on auth changes | MEDIUM | `rotateUserSessions` on password/role/deactivation | `security: enforce session rotation on sensitive auth state changes` |

---

## CRITICAL DO-NOT RULES

1. **DO NOT** process any webhook payload before verifying its signature —
   even for "testing" or "debugging" purposes
2. **DO NOT** log the raw webhook secret or signature header in cleartext —
   log only "signature verification failed" with no payload details
3. **DO NOT** use IP-based rate limiting for authenticated endpoints —
   IPs are unreliable behind Vercel's edge network; always use `currentUser.id`
4. **DO NOT** return `err.message`, `err.stack`, or any raw Supabase error
   object in a `NextResponse.json()` call — ever
5. **DO NOT** use `timingSafeEqual` on strings directly — always convert both
   to `Buffer` first; mismatched byte lengths throw and must be caught
6. **DO NOT** make `rotateUserSessions` failures block the primary operation —
   the password change or role change must succeed even if rotation fails;
   rotation failure is an alert, not a blocking error
7. **DO NOT** remove the `try { } catch { return false; }` around `timingSafeEqual`
   — length mismatch throws a TypeError which must be treated as a failed verification

---

*End of Prompt — Depo-Pro Red Team Remediation v1.0*

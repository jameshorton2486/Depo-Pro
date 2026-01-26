# DEPO-PRO PRODUCTION-READINESS AUDIT PROMPT

**Copy this entire prompt into Cursor, Codex, or Claude with @Codebase enabled**

---

```
You are a senior production-readiness auditor specializing in legal SaaS applications.

## PROJECT CONTEXT

**Application:** Depo-Pro - AI-powered legal transcription platform for court reporters and scopists
**Target Users:** Court reporting agencies, law firms, freelance court reporters
**Compliance Requirements:** Legal industry standards, data confidentiality, audit trails

## TECHNOLOGY STACK

**Frontend:**
- Next.js 15 (App Router)
- React 18.3.1
- TypeScript 5
- Tailwind CSS 3.4
- shadcn/ui components (Radix primitives)
- TipTap editor for transcript editing

**Backend:**
- Next.js API Routes (107 endpoints)
- Supabase (PostgreSQL database + Auth + Storage)
- Row Level Security (RLS) policies

**External Services:**
- Deepgram Nova-3 (AI transcription with legal vocabulary)
- Stripe (billing/subscriptions)
- Resend (transactional email)
- Google Calendar API (external calendar sync)
- BullMQ/Redis (job queue)

**Key Libraries:**
- @supabase/ssr, @supabase/supabase-js (auth & database)
- @deepgram/sdk (transcription)
- docx, pdfkit (document export)
- wavesurfer.js (audio visualization)
- zod (validation)

## CRITICAL RULE

**READ-ONLY ANALYSIS ONLY**
- DO NOT modify, delete, or refactor any code
- DO NOT create new files
- DO NOT run destructive commands
- ONLY analyze and report findings

---

## AUDIT SCOPE

Perform a comprehensive production-readiness audit covering ALL of the following areas:

### 1. BUGS & BROKEN LOGIC

Scan for:
- Runtime errors and exceptions
- Invalid or circular imports
- Incorrect async/await usage (missing await, unhandled promises)
- Unhandled null/undefined assumptions
- Type assertion mismatches (`as` casts that could fail)
- Array/object access without bounds checking
- Race conditions in concurrent operations
- Incorrect error handling (swallowed errors, wrong error types)

**Specific to Depo-Pro:**
- Deepgram response parsing errors
- Audio file handling edge cases (corrupted files, unsupported formats)
- Transcript word array manipulation bugs
- Confidence score calculation errors
- Speaker diarization mapping issues

### 2. INCOMPLETE OR PLACEHOLDER CODE

Scan for:
- TODO comments
- FIXME comments
- HACK comments
- console.log statements (debug code in production)
- Commented-out code blocks
- Stubbed functions returning mock data
- Partially implemented features
- Empty catch blocks
- Functions that only throw "Not implemented"

**Specific to Depo-Pro:**
- Mock transcription responses
- Placeholder export formatting
- Incomplete calendar sync logic
- Stubbed billing/subscription flows
- Unfinished exhibit management features

### 3. ENVIRONMENT & SECRETS AUDIT

**List ALL environment variables referenced in the codebase:**

Required variables to verify:
```
# Supabase
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY

# Deepgram
DEEPGRAM_API_KEY

# Stripe
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

# Email
RESEND_API_KEY

# Redis (BullMQ)
REDIS_URL
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN

# Google Calendar
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET

# App Config
NEXTAUTH_SECRET (legacy - should be removed)
NEXTAUTH_URL (legacy - should be removed)
LOW_CONFIDENCE_THRESHOLD
```

**Flag:**
- Missing required variables
- Variables used in client code that should be server-only
- Secrets incorrectly prefixed with NEXT_PUBLIC_
- Hardcoded secrets or API keys
- Development URLs in production config
- Default/placeholder values that should be overridden

### 4. SECURITY & AUTH RISKS

Scan for:

**Authentication:**
- Routes missing authentication checks
- Session validation gaps
- Token expiration handling
- Password reset flow vulnerabilities
- OAuth/SSO implementation issues

**Authorization:**
- Missing role-based access control (RBAC) checks
- Privilege escalation vulnerabilities
- Cross-tenant data access (firm isolation)
- User can access other users' data

**API Security:**
- Missing rate limiting on sensitive endpoints
- SQL injection risks (raw queries)
- XSS vulnerabilities (unsanitized output)
- CSRF protection gaps
- Missing input validation
- Excessive data exposure in responses
- Sensitive data in URL parameters

**Specific to Depo-Pro:**
- Verify RLS policies on ALL tables (users, jobs, transcripts, files, firms)
- Check scopist can ONLY access assigned jobs
- Verify firm-level isolation is enforced
- Check audio file access is properly restricted
- Verify transcript download/export authorization
- Check API routes in `app/api/` have proper auth guards

### 5. DATA INTEGRITY RISKS

Scan for:

**Database:**
- Schema vs code mismatches (field names, types)
- Missing foreign key constraints
- Unsafe DELETE operations without cascades
- Missing transaction wrapping for multi-step operations
- N+1 query patterns
- Missing indexes on frequently queried fields

**Validation:**
- Missing Zod schemas on API inputs
- Type coercion issues (string vs number)
- Date/timezone handling inconsistencies
- File upload validation (size, type, content)

**Specific to Depo-Pro:**
- Transcript word array integrity (index references)
- Confidence score bounds (0-1 range)
- Job status state machine validity
- File storage path consistency
- Audit log completeness

### 6. DEAD / REDUNDANT CODE

Scan for:
- Unused files (components, utilities, types)
- Unused exports
- Unreachable code paths
- Duplicate logic across files
- Legacy code from previous implementations
- Deprecated API usage
- Old authentication system remnants (NextAuth)

**Specific to Depo-Pro:**
- Check for NextAuth references (should be fully removed)
- Check for Prisma references (migrated to Supabase)
- Check docs/_archive/ and scripts/archive/ for referenced code
- Identify unused components in components/
- Check for duplicate Supabase client initializations

### 7. PRODUCTION & DEPLOYMENT RISKS

Scan for:

**Build Issues:**
- TypeScript errors (run `npm run typecheck` mentally)
- ESLint errors/warnings
- Missing dependencies
- Incorrect package versions
- Build-time vs runtime environment variable issues

**Runtime Issues:**
- Edge vs Node runtime incompatibilities
- Server-only code in client components
- Client-only code in server components
- Missing 'use client' directives
- Hydration mismatches
- Memory leaks (event listeners, subscriptions)

**Specific to Depo-Pro:**
- Verify Vercel deployment compatibility
- Check for Node.js APIs used in Edge runtime
- Verify Supabase client is correctly initialized per-request
- Check middleware doesn't exceed Edge runtime limits

### 8. PERFORMANCE & SCALABILITY RISKS

Scan for:
- Large bundle sizes (unnecessary imports)
- Missing code splitting
- Unoptimized images
- Missing caching headers
- Expensive operations in render loops
- Missing pagination on list endpoints
- Unbounded queries (SELECT * without LIMIT)

**Specific to Depo-Pro:**
- Large transcript loading without virtualization
- Audio file streaming vs full download
- Word array operations on long transcripts
- Dashboard stats queries without caching

### 9. ERROR HANDLING & OBSERVABILITY

Scan for:
- Missing error boundaries
- Unhandled promise rejections
- Missing try/catch blocks
- Generic error messages (not user-friendly)
- Missing logging for critical operations
- No error tracking integration (Sentry, etc.)

**Specific to Depo-Pro:**
- Deepgram API error handling
- File upload failure handling
- Transcription job failure recovery
- Export generation error handling

### 10. LEGAL & COMPLIANCE RISKS

Scan for:
- Audit logging gaps (who did what, when)
- Data retention policy implementation
- PII exposure in logs
- Missing data encryption
- GDPR/privacy compliance gaps

**Specific to Depo-Pro:**
- Transcript data is legally sensitive
- Audit trail for all transcript edits
- Secure file storage and access
- User consent tracking

---

## OUTPUT FORMAT

Structure your report as follows:

### EXECUTIVE SUMMARY
- Total issues found by severity
- Top 5 most critical issues
- Overall production-readiness score (1-10)
- Recommendation: Ready for beta / Needs work / Not ready

### CRITICAL ISSUES (Must fix before any deployment)
Issues that will cause:
- Data loss
- Security breaches
- Complete application failure
- Legal/compliance violations

### HIGH SEVERITY (Must fix before beta launch)
Issues that will cause:
- Significant functionality failures
- Poor user experience
- Performance degradation
- Partial security risks

### MEDIUM SEVERITY (Should fix before public launch)
Issues that may cause:
- Minor functionality issues
- Code maintainability problems
- Technical debt accumulation

### LOW SEVERITY (Nice to fix)
Issues that are:
- Code style inconsistencies
- Minor optimizations
- Documentation gaps

---

## ISSUE FORMAT

For each issue, provide:

```
### [SEVERITY] Issue Title

**File:** `path/to/file.ts` (lines X-Y)

**Description:**
Clear explanation of the problem.

**Code Example:**
```typescript
// Problematic code snippet
```

**Why It Matters:**
Impact on production (security, performance, reliability, user experience).

**Recommended Fix:**
Specific guidance on how to resolve (DO NOT implement).

**Priority:** P0/P1/P2/P3
```

---

## SPECIFIC FILES TO AUDIT

Pay special attention to these critical paths:

**Authentication & Authorization:**
- `middleware.ts`
- `lib/auth/`
- `lib/supabase/server.ts`
- `lib/supabase/client.ts`
- `app/api/auth/`

**Core Business Logic:**
- `lib/transcription.ts`
- `lib/deepgram/`
- `lib/export.ts`
- `lib/jobs/`
- `app/api/jobs/`
- `app/api/transcripts/`

**Data Layer:**
- `lib/supabase/queries/`
- `supabase/migrations/`
- `types/database.ts`

**UI Components (Data Handling):**
- `components/transcripts/low-confidence-panel.tsx`
- `components/transcripts/audio-player.tsx`
- `components/jobs/`

**Configuration:**
- `next.config.ts`
- `middleware.ts`
- `.env.example`
- `lib/env.ts`
- `lib/env/schema.ts`

---

## IMPORTANT REMINDERS

1. **DO NOT modify any code** - This is a read-only audit
2. **Be conservative** - Only report actual issues, not style preferences
3. **Be specific** - Include file paths and line numbers where possible
4. **Be actionable** - Each issue should have a clear fix recommendation
5. **Prioritize correctly** - Security and data integrity issues are CRITICAL
6. **Consider legal context** - This handles sensitive legal transcripts
7. **Check for regressions** - Look for signs of incomplete migrations

---

## START AUDIT

Begin by listing all files you will analyze, then proceed through each audit category systematically. Provide progress updates as you complete each section.
```

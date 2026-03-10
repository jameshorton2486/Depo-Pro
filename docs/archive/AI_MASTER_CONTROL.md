# Depo-Pro — AI Master Control File

All AI agents (Claude Code, Cursor, Codex, Aider, Copilot) must read this file before making changes.

## System Overview

**Application:** Depo-Pro
**Purpose:** Multi-tenant SaaS for deposition transcription and management used by court reporters and law firms.
**Sensitive data:** legal transcripts, deposition audio, attorney data, client information.

## Technology Stack

- **Frontend:** Next.js App Router, React, TypeScript, TailwindCSS
- **Backend:** Next.js API routes, Supabase Postgres, Supabase Auth, Supabase Storage
- **Infrastructure:** Vercel deployment, Supabase cloud
- **External services:** Deepgram (transcription), Stripe (billing), Resend (email)

## Multi-Tenant Security Model

Tenant isolation is enforced using `firm_id`. Every database query accessing tenant data must enforce:

```
firm_id = currentUser.firm_id
```

This applies to: jobs, transcriptions, files, exports, flagged_words, medical_records, chronology_entries, exhibits.

**AI agents must never remove or bypass firm_id filtering logic.**

## Authentication

All protected routes must verify authentication using one of:
- `withRouteProtection()` (preferred — includes role checks and rate limiting)
- `getCurrentUser()` from `lib/auth/session.ts`

No API route returning sensitive data may run without authentication.

## Authorization

Authentication alone is not sufficient. All sensitive operations must verify resource ownership:

```typescript
job.firm_id === user.firmId
```

Never trust client-supplied values for `firm_id`, `job_id`, or `transcript_id`. Ownership must be verified server-side.

## Row Level Security

All sensitive Supabase tables must have RLS enabled. AI agents must never disable RLS.

## Service Role Key

`SUPABASE_SERVICE_ROLE_KEY` must **never** appear in client code. Allowed locations: server-only API routes, background tasks, `lib/supabase/admin.ts`.

## Storage Security

Rules:
- No public buckets (depo-audio is private, uses signed URLs)
- Signed URLs only via `createSignedUrl()`
- TTL: <= 3600 seconds (1 hour max)
- Tenant-isolated paths: `{firm_id}/{job_id}/filename`

## Transcript Editing System

The transcript editor is the most critical system. It supports multi-user editing, AI corrections, version history, and export.

### Optimistic Concurrency Control

Transcript edits must use optimistic locking:

```sql
UPDATE transcriptions SET ... WHERE id = transcriptId AND updated_at = previousUpdatedAt
```

If no rows update, return `409 STALE_DATA`. **AI must never remove this logic.**

### Version History

Every edit session creates a version snapshot in `transcript_integrity_chain` with:
- `version_number`, `transcript_hash`, `previous_hash`
- `created_by`, `created_at`

**AI must preserve version chain integrity.**

## API Standards

All API routes must: authenticate user, validate tenant ownership, validate input, sanitize errors.

Errors must **never** expose: stack traces, database schema, internal file paths, tokens.

Safe error format:
```json
{ "error": "An unexpected error occurred.", "code": "INTERNAL_ERROR" }
```

Use `handleUnexpectedError()` and `handleSupabaseError()` from `lib/errors/api-error.ts`.

## Webhook Security

Webhook routes must validate signatures before processing:
- Stripe: `stripe.webhooks.constructEvent()` — fail-closed
- Deepgram: HMAC verification via `verifyWebhookRequest()` — fail-closed

If signature verification fails, return 401 immediately. Never process unverified payloads.

## Secret Management

Sensitive variables: `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `DEEPGRAM_API_KEY`, `RESEND_API_KEY`, `CRON_SECRET`.

Only `NEXT_PUBLIC_*` variables may be exposed to the client.

## Canonical Imports

| What | Import from |
|------|-------------|
| UserRole enum | `@/lib/enums/roles` (NOT `@/types/database`) |
| Auth session | `getCurrentUser()` from `@/lib/auth/session` |
| Route protection | `withRouteProtection()` from `@/lib/middleware/withRouteProtection` |
| Admin Supabase | `createAdminClient()` from `@/lib/supabase/admin` |
| Server Supabase | `createSupabaseServerClient()` from `@/lib/supabase/server` |
| Browser Supabase | `getSupabaseBrowserClient()` from `@/lib/supabase/browser` |
| Error handling | `handleUnexpectedError()` from `@/lib/errors/api-error` |

## Frozen Files — DO NOT MODIFY INTERNAL LOGIC

```
lib/transcription/*
components/review/*
components/export/*
components/audio/waveform-player.tsx
components/transcripts/word-span.tsx
components/transcripts/synced-transcript-viewer.tsx
app/auth/callback/*
```

Import paths may be updated. Internal logic must not change.

## Build Requirements

Before committing, all must pass:
```
npm run typecheck
npm run lint
npm run build
```

## AI Operating Rules

1. Preserve multi-tenant security — never remove firm_id checks
2. Maintain optimistic locking — never remove updated_at guards
3. Protect version chain integrity
4. Prefer small targeted fixes over large rewrites
5. Use existing patterns (withRouteProtection, handleSupabaseError, etc.)
6. Never introduce secrets in client code
7. Maintain build stability

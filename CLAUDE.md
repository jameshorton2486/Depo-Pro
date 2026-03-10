# Depo-Pro AI Agent Rules

This project follows the architecture defined in:

**docs/architecture/DEPO_PRO_CORE_ARCHITECTURE_RULES.md**

Never violate those rules.

Full architecture and security rules: **AI_MASTER_CONTROL.md** (read first)
Auth architecture: **docs/DEPO_AUTH_ARCHITECTURE.md**

## Stack

Next.js 16 App Router, TypeScript, Supabase Auth + Postgres + Storage, Deepgram, Stripe, Resend, Vercel

## Critical Rules

1. Supabase SSR authentication only — no NextAuth
2. All database queries must enforce `firm_id` tenant isolation
3. `SUPABASE_SERVICE_ROLE_KEY` must never appear in client code
4. TypeScript strict mode required
5. Use `withRouteProtection()` for all new API routes
6. Use `handleUnexpectedError()` / `handleSupabaseError()` for error responses — never leak `error.message`
7. Webhook handlers must be fail-closed (reject if signature verification fails or secret is missing)
8. Transcript edits must use optimistic locking (409 STALE_DATA on conflict)
9. `UserRole` must be imported from `@/lib/enums/roles` — never from `@/types/database`

## Before Modifying Auth Code

Read: docs/DEPO_AUTH_ARCHITECTURE.md

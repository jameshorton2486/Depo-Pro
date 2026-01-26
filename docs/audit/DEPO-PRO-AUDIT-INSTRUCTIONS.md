# =============================================================================
# DEPO-PRO PRODUCTION AUDIT - QUICK START
# =============================================================================

# OPTION 1: Run the script file
# -----------------------------
# 1. Save run-depo-pro-audit.ps1 to your depo-pro directory
# 2. Open PowerShell in that directory
# 3. Run:
.\run-depo-pro-audit.ps1


# OPTION 2: Direct paste (copy everything below and paste into PowerShell)
# -------------------------------------------------------------------------

codex @"
You are a senior production-readiness auditor specializing in legal SaaS applications.

PROJECT: Depo-Pro - AI-powered legal transcription platform for court reporters, scopists, and law firms.

STACK: Next.js 15 (App Router), Supabase (PostgreSQL + Auth + Storage), Deepgram Nova-3, Stripe, Resend, BullMQ/Redis, TypeScript, Tailwind CSS, shadcn/ui.

CRITICAL RULE: READ-ONLY ANALYSIS ONLY. DO NOT modify, delete, or refactor any code.

TASK: Perform a full production-readiness audit of the entire repository.

AUDIT REQUIREMENTS:

1. BUGS & BROKEN LOGIC
- Runtime errors, invalid imports, incorrect async usage
- Unhandled null/undefined, type assertion mismatches
- Depo-Pro: Deepgram parsing, audio handling, transcript word arrays, confidence scoring

2. INCOMPLETE OR PLACEHOLDER CODE
- TODOs, FIXMEs, console.logs, commented-out code, stubbed functions, empty catch blocks
- Depo-Pro: Mock transcription, placeholder exports, incomplete calendar sync, stubbed billing

3. ENVIRONMENT & SECRETS AUDIT
List ALL env vars. Flag: missing vars, client-side secrets, hardcoded keys, NEXT_PUBLIC_ misuse
Required: SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SERVICE_ROLE_KEY, DEEPGRAM_API_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, RESEND_API_KEY, REDIS_URL

4. SECURITY & AUTH RISKS
- Routes missing auth, session gaps, RBAC bypasses, cross-tenant access
- Missing rate limiting, SQL injection, XSS, CSRF, input validation
- Depo-Pro: Verify RLS on all tables, scopist job isolation, firm tenancy, transcript authorization

5. DATA INTEGRITY RISKS
- Schema vs code mismatches, missing constraints, unsafe deletes, N+1 queries
- Missing Zod validation, type coercion issues
- Depo-Pro: Word array integrity, confidence bounds, job state machine, audit logs

6. DEAD / REDUNDANT CODE
- Unused files, unreachable code, duplicate logic, deprecated APIs
- Depo-Pro: NextAuth remnants (removed), Prisma references (migrated), archive folder refs

7. PRODUCTION & DEPLOYMENT RISKS
- TypeScript errors, ESLint issues, missing deps, Edge vs Node incompatibilities
- Server code in client, missing 'use client', hydration mismatches
- Depo-Pro: Vercel compatibility, Supabase per-request init, middleware Edge limits

8. PERFORMANCE & SCALABILITY
- Large bundles, missing pagination, unbounded queries
- Depo-Pro: Transcript virtualization, audio streaming, word array ops on 10k+ words

9. ERROR HANDLING & OBSERVABILITY
- Missing error boundaries, unhandled rejections, generic errors, no logging
- Depo-Pro: Deepgram errors, upload failures, job recovery, export errors

10. LEGAL & COMPLIANCE
- Audit logging gaps, PII in logs, missing encryption
- Depo-Pro: Transcript sensitivity, edit audit trails, secure file access

CRITICAL FILES TO AUDIT:
- middleware.ts, lib/auth/*, lib/supabase/*
- lib/transcription.ts, lib/deepgram/*, lib/export.ts
- app/api/jobs/*, app/api/transcripts/*
- components/transcripts/low-confidence-panel.tsx, audio-player.tsx

OUTPUT FORMAT:
1. EXECUTIVE SUMMARY (total issues, top 5 critical, readiness score 1-10, recommendation)
2. CRITICAL (P0): Data loss, security breach, complete failure
3. HIGH (P1): Significant failures, poor UX, performance
4. MEDIUM (P2): Minor issues, maintainability, tech debt
5. LOW (P3): Style, optimization, docs

For each issue: File path, description, impact, recommended fix (DO NOT implement), priority.

BEGIN AUDIT NOW.
"@


# =============================================================================
# ALTERNATIVE: Use with Cursor instead of Codex
# =============================================================================
# 
# 1. Open Cursor in your depo-pro directory
# 2. Press Ctrl+L to open chat
# 3. Type @Codebase to include the full codebase
# 4. Paste the prompt text (without the codex @" wrapper)
# 5. Press Enter to run


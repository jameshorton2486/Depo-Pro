# Architecture Overview

> **Last Updated:** 2026-03-01
> **Status:** Pre-Beta Stabilization Phase
> **Scope:** Beta workflow ONLY — Upload → Transcribe → Review → Export
> **Related:** [Production Readiness Guide](./PRODUCTION_READINESS_GUIDE.md) | [Remaining Tasks](./REMAINING_TASKS_ANALYSIS.md) | [Security Audit](./SECURITY_AUDIT_CHECKLIST.md) | [AI Protocol](./AI_EXECUTION_PROTOCOL.md)

---

## 🚫 FROZEN LAYER — DO NOT MODIFY

These files and systems are verified working. **No AI agent may modify, refactor, rename, or restructure these under any circumstances.** Any prompt or task that would touch these must be rejected.

| File / System | Reason |
|--------------|--------|
| `supabase/migrations/*` | Database schema is stable. No new migrations without explicit approval. |
| `lib/supabase/server.ts` | Supabase client creation — working, tested. |
| `lib/supabase/admin.ts` | Admin client — working, tested. |
| `lib/supabase/client.ts` | Browser client — working, tested. |
| `lib/auth/session.ts` | Session management — working. |
| `lib/transcription.ts` | Real Deepgram Nova-3 integration — production-hardened. |
| `lib/transcription/pipeline.ts` | Full transcription pipeline — working end-to-end. |
| `lib/transcription/scheduler.ts` | Serverless chunk scheduling — working. |
| `lib/transcription/chunking.ts` | Audio splitting — working. |
| `lib/transcription/reassemble.ts` | Chunk merging — working. |
| `lib/transcription/preprocessor.ts` | FFmpeg normalization — working. |
| `lib/transcription/validate.ts` | Audio validation — working. |
| `src/lib/transcription/legal-formatter.ts` | Legal DOCX formatting (274 lines) — working. |
| `src/lib/transcription/post-process.ts` | Post-processing rules (197 lines) — working. |
| `lib/services/medical-extraction.ts` | Anthropic Claude API — working. |
| `lib/services/confidence-analytics.ts` | Confidence scoring — working. |
| `lib/services/risk-score.ts` | Risk scoring — working. |
| `lib/storage/url.ts` | Storage URL generation — working. |
| `lib/storage.ts` | File upload to Supabase — working. |
| `components/audio/waveform-player.tsx` | Audio player — working. |
| `components/review/flagged-word-panel.tsx` | Flagged word panel — working (add to, don't rewrite). |
| `app/(dashboard)/jobs/[id]/review/review-client-new.tsx` | Review client (760 lines) — working (add to, don't rewrite). |
| `app/(auth)/login/page.tsx` | Login page — working. |
| `app/(auth)/register/page.tsx` | Registration page — working. |
| `next.config.ts` | Security headers, webpack config — working. |
| `vercel.json` | Deployment config — working. |
| `tailwind.config.ts` | Styling config — working. |

---

## ⚠️ GLOBAL REFACTOR CONSTRAINTS

All AI agents must follow these rules for every change:

1. **Do NOT change database schema.** No new migrations, no column renames, no table drops.
2. **Do NOT rename API routes.** Existing URL paths are stable.
3. **Do NOT refactor auth unless the task explicitly says so.** Multiple patterns exist — consolidation is a specific task, not a side effect.
4. **Do NOT introduce new npm dependencies** unless the task explicitly names the package.
5. **Do NOT expand scope.** If a task says "fix function X," do not also refactor functions Y and Z.
6. **Do NOT modify files outside the task's listed file paths.**
7. **All changes must pass:** `npm run build` and `npm run typecheck`
8. **No new `// TODO` comments.** Fix things or leave them.
9. **No feature expansion beyond listed tasks.** Phase 2 features are DEFERRED.
10. **Preserve all existing imports** in files you modify unless removing dead code the task specifies.

---

## 🔒 SCOPE LOCK — BETA LAUNCH

The only supported workflow for this sprint is:

```
Reporter: Upload Audio → Trigger Transcription → Assign Scopist
Scopist:  Open Review → Correct Flagged Words → Save → Export
Admin:    Manage Users → View Jobs → Monitor Health
```

**Everything else is out of scope.** Do not implement, fix, or improve:
- Billing / Stripe / Invoicing
- Calendar / Scheduling / Google Sync
- Multi-tenant / Organizations
- Real-time live transcription
- Dolby audio enhancement
- Analytics dashboards / Reports
- WKT quiz system
- Scopist marketplace
- Attorney portal enhancements (beyond basic access)

---

## ✅ GLOBAL VALIDATION — Run After ANY Change

```bash
npm run typecheck     # Must pass with zero errors
npm run build         # Must pass with zero errors
npm run lint          # No new warnings
```

If any of these fail, the change is not complete.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Database | PostgreSQL via Supabase |
| Auth | Supabase Auth (email/password) |
| Transcription | Deepgram Nova-3 |
| Medical AI | Anthropic Claude API |
| Storage | Supabase Storage (4 buckets) |
| Hosting | Vercel (serverless) |
| Domain | app.depo-pro.com |

---

## Project Structure

```
depo-pro/
├── app/
│   ├── (auth)/                   # Login, register, forgot/reset password
│   ├── (dashboard)/              # Authenticated pages
│   │   ├── jobs/[id]/review/     # ⭐ CORE — review interface
│   │   ├── admin/                # Admin panels
│   │   ├── reporter/             # Reporter dashboard
│   │   └── scopist/              # Scopist dashboard
│   ├── api/                      # 140 API routes
│   └── exports/                  # Direct export routes
├── components/
│   ├── review/                   # ⭐ Flagged word panel, transcript viewer
│   ├── audio/                    # Waveform player
│   ├── medical/                  # Medical chronology
│   ├── ui/                       # shadcn/ui + error boundary
│   └── shared/                   # StubPage template
├── lib/
│   ├── middleware/                # withRouteProtection ← THE standard auth
│   ├── transcription/            # Pipeline, scheduler, chunking
│   ├── supabase/                 # Client, server, admin, queries/
│   ├── services/                 # Export, medical, analytics
│   └── storage/                  # URL generation
├── src/lib/transcription/        # Legal formatter, post-processor
├── types/                        # TypeScript definitions
├── tests/                        # 26 test files
├── supabase/migrations/          # 24 SQL migrations (FROZEN)
└── docs/                         # ← YOU ARE HERE
```

---

## Auth Patterns (Current State)

**Standard (use this):** `lib/middleware/withRouteProtection.ts`
- Combined auth + role + tenant isolation + audit
- Used by 23/140 routes
- All new code must use this pattern

**Legacy (do not use for new code):**
- `lib/permissions/api-guards.ts` → `requireAuth()` / `requireAuthV2()`
- `lib/auth/require-auth.ts` → `requireAuth()` wrapper
- `lib/security.ts` → `requireAuth()` function

**Only modify legacy patterns when a task explicitly says to.**

---

## Transcription Pipeline (FROZEN — reference only)

```
Upload → Validate → Preprocess (FFmpeg) → Chunk → Transcribe (Deepgram) → Reassemble → Flag → Post-Process → AI_COMPLETE
```

Each stage updates status in the `transcriptions` table. Processing chains through `/api/jobs/[id]/transcribe/process-chunk` for Vercel serverless compatibility.

---

## Storage Buckets

| Bucket | Access | Purpose |
|--------|--------|---------|
| `depo-audio` | Public read, auth upload | Audio playback |
| `depo-files` | Private, signed URLs | Documents |
| `depo-exports` | Private, signed URLs | Generated exports |
| `depo-chunks` | Private, signed URLs | Temp processing |

**Rule:** DB stores paths. URLs generated at read time via `lib/storage/url.ts`.

---

## Roles

| Role | Key Permissions |
|------|----------------|
| `ADMIN` | Full access, user management |
| `COURT_REPORTER` / `REPORTER` | Create jobs, upload, assign scopist, export |
| `SCOPIST` | Review assigned jobs, correct, export |
| `ATTORNEY` | View shared transcripts (limited) |

Defined in `lib/enums/roles.ts`.

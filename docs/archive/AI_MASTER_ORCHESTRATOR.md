# Depo-Pro AI Master Orchestrator

This file governs all AI agents interacting with the Depo-Pro repository.

**Agents include:**

- Claude Code
- Codex CLI
- Cursor AI
- VS Code Copilot
- Automated build agents

All AI agents must follow the rules defined here before modifying the repository.

---

## 1. Project Overview

**Project:** Depo-Pro

**Purpose:**

Depo-Pro is a legal transcription SaaS platform that:

- converts deposition audio to transcripts
- allows scopists to review and correct transcripts
- exports finalized transcripts for legal use

**Technology stack:**

- Next.js (App Router)
- Supabase Auth
- Supabase Postgres
- Supabase Storage
- Supabase RLS
- Deepgram speech-to-text
- TypeScript strict mode

---

## 2. Architecture Documents

AI agents must read these documents before performing tasks:

- **docs/DEPO_AUTH_ARCHITECTURE.md**

Future architecture docs may include:

- docs/TRANSCRIPTION_ARCHITECTURE.md
- docs/EDITOR_ARCHITECTURE.md
- docs/STREAMING_ARCHITECTURE.md

---

## 3. Authentication Architecture

Depo-Pro uses Supabase SSR authentication.

**Requirements:**

- middleware.ts refreshes session cookies
- Supabase sessions stored in cookies
- OAuth callbacks handled in /auth/callback
- No NextAuth or alternate auth frameworks allowed

AI agents must never replace the auth system.

---

## 4. Multi-Tenant Security

Depo-Pro is a multi-tenant application.

Every database query must include:

- **organization_id** (or firm_id where applicable)

Example:

```sql
SELECT * FROM transcripts
WHERE organization_id = auth.jwt().org_id
```

AI agents must never write queries without tenant filtering.

---

## 5. Database Rules

The following rules apply to all database interactions.

**Required:**

- Supabase RLS must be enabled
- organization_id filtering required
- user_id filtering required where applicable

**Forbidden:**

- raw SQL queries without tenant filtering
- exposing service role keys in frontend
- bypassing RLS policies

---

## 6. Secrets and Environment Variables

**Allowed in client code:**

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- NEXT_PUBLIC_SITE_URL

**Server-only secrets:**

- SUPABASE_SERVICE_ROLE_KEY
- DEEPGRAM_API_KEY
- CRON_SECRET

AI agents must never expose server secrets in frontend code.

---

## 7. TypeScript Standards

Depo-Pro uses strict TypeScript rules.

**Requirements:**

- TypeScript strict mode enabled
- no implicit any
- async functions must define return types
- API routes must validate inputs

**Validation command:**

```bash
npx tsc --noEmit
```

---

## 8. Route Protection

Protected routes must be guarded by:

- **middleware.ts**
- OR **withRouteProtection()**

**Protected examples:**

- /dashboard
- /jobs
- /transcripts
- /admin

**Public routes:**

- /login
- /register
- /forgot-password
- /reset-password
- /auth/*

---

## 9. API Route Security

All API routes must:

- verify authenticated user
- enforce organization_id isolation
- validate request payloads
- return typed responses

---

## 10. AI Development Workflow

AI agents must follow this workflow when making changes.

| Step | Action |
|------|--------|
| 1 | Read architecture documentation |
| 2 | Analyze the task |
| 3 | Identify files that need modification |
| 4 | Make minimal changes |
| 5 | Run TypeScript validation |
| 6 | Run build validation |

**Commands:**

```bash
npx tsc --noEmit
npm run build
```

---

## 11. Forbidden AI Actions

AI agents must not:

- modify database schema without approval
- remove authentication middleware
- expose service role keys
- disable TypeScript strict mode
- bypass tenant filtering
- introduce new auth systems

---

## 12. AI Commit Rules

AI commits must:

- modify minimal files
- include descriptive commit messages
- avoid unrelated refactoring

**Example commit message:**

```
fix: ensure Supabase middleware refreshes session cookies
```

---

## 13. High-Risk Areas

AI agents must be cautious when modifying:

- middleware.ts
- lib/supabase/*
- auth callback routes
- database queries

These areas can break authentication or tenant isolation.

---

## 14. AI Task Categories

AI agents may perform tasks in these categories:

- Architecture review
- Security audit
- API implementation
- Transcription pipeline development
- Editor UI improvements
- Export engine improvements

---

## 15. Repository Health Commands

Run these commands before closing an AI session.

**TypeScript check:**

```bash
npx tsc --noEmit
```

**Lint:**

```bash
npm run lint
```

**Build:**

```bash
npm run build
```

---

## 16. Future System Components

Planned architecture components include:

- Deepgram transcription worker
- Transcript editor UI
- Zoom live transcription engine
- DOCX transcript export system

These systems must integrate with the existing architecture.

---

## 17. AI Behavior Policy

AI agents must:

- prioritize stability
- avoid breaking architecture
- follow repository rules
- document significant changes

If uncertain, AI agents must request clarification rather than guessing.

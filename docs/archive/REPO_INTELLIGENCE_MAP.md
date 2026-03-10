# Depo-Pro Repository Intelligence Map

This document provides a high-level map of the Depo-Pro repository so AI agents can understand the system before modifying code.

**All AI agents must read this file before making changes.**

---

## 1. Repository Overview

**Project:** Depo-Pro

**Purpose:**

Depo-Pro is a legal transcription SaaS platform designed for deposition transcripts.

**Primary functions:**

- convert deposition audio into transcripts
- allow scopists to review transcripts
- flag low-confidence words
- export final transcripts for legal use

**Technology stack:**

- Next.js App Router
- Supabase Auth
- Supabase Postgres
- Supabase Storage
- Supabase RLS
- Deepgram Speech-to-Text
- TypeScript strict mode

---

## 2. Core Application Structure

The main repository structure:

```
app/
lib/
docs/
scripts/
```

**AI governance files:**

- CLAUDE.md
- AI_MASTER_ORCHESTRATOR.md
- REPO_INTELLIGENCE_MAP.md
- .cursorrules

---

## 3. Next.js Application Layer

**Location:** `app/`

**Important directories:**

**app/(auth)/** — Handles public authentication pages:

- login
- register
- forgot-password
- reset-password

**app/auth/** — Authentication callback routes:

- auth/callback
- auth/confirm
- auth/invite

**Protected application routes:**

- dashboard
- jobs
- transcripts
- admin

These routes require authentication.

---

## 4. Middleware Layer

**Root middleware:** `middleware.ts`

**Responsibilities:**

- validate Supabase session
- refresh cookies
- redirect unauthenticated users

This file is critical to authentication stability.

---

## 5. Supabase Integration

**Location:** `lib/supabase/`

**Important files:**

- browser.ts
- client.ts
- server.ts
- middleware.ts
- admin.ts

**Purpose:** Provide Supabase clients for different environments.

| File | Environment |
|------|-------------|
| browser.ts | Browser client |
| server.ts | Server client |
| admin.ts | Admin client |
| middleware.ts | Middleware client |

---

## 6. Authentication Helpers

**Location:** `lib/auth/`

**Important files:**

- session.ts
- use-auth.ts

**Purpose:** Normalize Supabase session into:

- id
- email
- role
- firmId

---

## 7. Route Protection

**Location:** `lib/middleware/`

**Important file:** `withRouteProtection.ts`

**Purpose:** Protect server-side routes and APIs.

**Enforces:**

- authentication
- RBAC roles
- tenant isolation

---

## 8. Permissions System

**Location:** `lib/permissions/`

**Important files:**

- route-access.ts
- api-guards.ts
- case-access.ts

**Purpose:** Defines which roles can access which routes.

---

## 9. Transcription System

**Location:** `lib/transcription/`, `lib/workers/`

**Components:**

- Deepgram transcription worker
- Transcript parsing service
- Transcript editor UI
- Transcript export engine

**Transcription pipeline:**

```
Audio upload
→ Deepgram transcription
→ transcript_words table
→ editor UI
→ export DOCX
```

---

## 10. Database Layer

Supabase Postgres database.

**Key concepts:**

- multi-tenant architecture
- row-level security

Every table must include:

- **organization_id** (or firm_id where applicable)

**Example tables:**

- users
- organizations
- profiles
- transcripts
- transcript_words
- jobs

---

## 11. Security Rules

**Mandatory rules:**

All queries must include organization_id (or firm_id).

**Example:**

```sql
SELECT * FROM transcripts
WHERE organization_id = auth.jwt().org_id
```

AI agents must never write queries without tenant filtering.

---

## 12. Environment Variables

**Client-safe variables:**

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
- NEXT_PUBLIC_SITE_URL

**Server-only secrets:**

- SUPABASE_SERVICE_ROLE_KEY
- DEEPGRAM_API_KEY
- CRON_SECRET

Secrets must never appear in client code.

---

## 13. Development Commands

**TypeScript validation:**

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

## 14. AI Development Workflow

AI agents must follow this process.

| Step | Action |
|------|--------|
| 1 | Read AI_MASTER_ORCHESTRATOR.md |
| 2 | Read REPO_INTELLIGENCE_MAP.md |
| 3 | Read architecture docs in docs/ |
| 4 | Identify affected files |
| 5 | Implement minimal changes |
| 6 | Run validation commands |

---

## 15. High-Risk Areas

AI agents must be cautious when editing:

- middleware.ts
- lib/supabase/*
- auth callback routes
- database queries

These areas affect authentication and security.

---

## 16. AI Task Categories

Common tasks AI agents may perform:

- authentication fixes
- API implementation
- transcription system development
- UI improvements
- security audits

---

## 17. Repository Navigation Guidance

Before editing code, AI agents should answer:

**Which layer does this task affect?**

- frontend UI
- API routes
- middleware
- database
- transcription pipeline

This prevents incorrect modifications.

---

## 18. Future Architecture Documents

Future documentation will include:

- TRANSCRIPTION_ARCHITECTURE.md
- EDITOR_ARCHITECTURE.md
- STREAMING_ARCHITECTURE.md
- EXPORT_ARCHITECTURE.md

These will expand the repository intelligence system.

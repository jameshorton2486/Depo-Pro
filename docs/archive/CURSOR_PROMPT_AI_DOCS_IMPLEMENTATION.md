# Cursor Prompt: AI Architecture Documentation & Rules

**Usage:** Copy everything from "You are working in the Depo-Pro repository" through the final output line into Cursor Chat (⌘/Ctrl + L) and send.

---

You are working in the Depo-Pro repository.

Your task is to implement the AI architecture documentation and rules system.

Follow these instructions exactly.

---

## STEP 1 — Create documentation folder

Create the folder:

docs/

---

## STEP 2 — Create architecture documentation file

Create:

docs/DEPO_AUTH_ARCHITECTURE.md

Insert the following content:

```
# Depo-Pro Authentication Architecture

## Stack

* Next.js App Router
* Supabase Auth
* Supabase RLS
* Deepgram Transcription
* TypeScript strict mode

## Authentication Flow

User → Protected Route
↓
middleware.ts checks Supabase cookie
↓
If session exists → load page
If no session → redirect to /login

Login flow:

/login → Supabase signIn
↓
Supabase redirect → /auth/callback
↓
exchangeCodeForSession
↓
session cookie created
↓
redirect /dashboard

## Required Files

middleware.ts
lib/supabase/middleware.ts
lib/supabase/server.ts
lib/auth/session.ts
lib/middleware/withRouteProtection.ts

## Security Rules

* Supabase SSR authentication only
* No NextAuth
* Service role key never exposed to browser
* All database queries must include organization_id
* TypeScript strict mode required

## Route Protection

All protected routes must use either:

middleware.ts
or
withRouteProtection()
```

---

## STEP 3 — Create CLAUDE.md

Create file:

CLAUDE.md

Insert:

```
# Depo-Pro AI Agent Rules

Project: Depo-Pro

Stack:
Next.js App Router
Supabase Auth
Supabase RLS
Deepgram transcription
TypeScript strict mode

Architecture Documentation:
docs/DEPO_AUTH_ARCHITECTURE.md

Rules:

1. Authentication
- Supabase SSR authentication only
- Root middleware.ts manages session refresh
- No NextAuth or alternative auth frameworks

2. Multi-Tenant Isolation
- Every database query must include organization_id
- Cross-tenant data access is forbidden

3. Security
- Never expose SUPABASE_SERVICE_ROLE_KEY to the client
- Only NEXT_PUBLIC_* variables may appear in browser code

4. TypeScript
- strict mode required
- no implicit any
- all async functions typed

5. Route Protection
- Protected routes must be enforced by:
  middleware.ts
  OR withRouteProtection()

6. AI Development
AI agents must read docs/DEPO_AUTH_ARCHITECTURE.md
before modifying authentication code.
```

---

## STEP 4 — Create Cursor rules

Create file:

.cursorrules

Insert:

```
Depo-Pro AI coding rules

Architecture reference:
docs/DEPO_AUTH_ARCHITECTURE.md

Security rules:
- Supabase SSR authentication only
- middleware.ts required
- No NextAuth

Multi-tenancy:
- All queries must include organization_id

Secrets:
- Never expose SUPABASE_SERVICE_ROLE_KEY
- Only NEXT_PUBLIC_* allowed in frontend

TypeScript:
- strict mode required

If modifying auth or middleware:
read docs/DEPO_AUTH_ARCHITECTURE.md first.
```

---

## STEP 5 — Verify repository structure

Ensure the repository now contains:

docs/DEPO_AUTH_ARCHITECTURE.md
CLAUDE.md
.cursorrules

---

## STEP 6 — Run TypeScript check

Run:

npx tsc --noEmit

Ensure there are zero errors.

---

## STEP 7 — Commit changes

Stage and commit:

git add docs/DEPO_AUTH_ARCHITECTURE.md
git add CLAUDE.md
git add .cursorrules

Commit message:

docs: add architecture documentation and AI agent rules

---

After completion output:

"AI documentation and rule system successfully installed."

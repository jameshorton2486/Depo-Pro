# Depo-Pro — Core Architecture Rules
# Every AI agent reads this before writing code.
# Version: 1.0 · March 2026

---

## Rule 1 — Multi-Tenant Isolation

Every data table MUST carry `firm_id UUID NOT NULL REFERENCES firms(id)`.
Every query MUST filter by `firm_id` from the authenticated user's profile.
Row-Level Security (RLS) MUST be enabled on every new table.

```sql
-- Standard RLS policy pattern:
CREATE POLICY "firm_isolation" ON [table_name]
  FOR ALL USING (
    firm_id = (SELECT firm_id FROM profiles WHERE id = auth.uid())
  );
```

Never query cross-tenant data. Never expose firm_id in client-side state.

---

## Rule 2 — Transcript Word Integrity (Verbatim Mandate)

`transcript_words` rows are IMMUTABLE after Deepgram ingest.

- Hard DELETE is blocked at DB layer
- `original_word` column MUST NEVER be modified
- `transcriptions.deepgram_raw_json` MUST NEVER be modified
- Corrections are stored as OVERLAYS in `transcription_edits` / `flagged_words`
- `corrected_word` column receives corrections — never `original_word`
- All edit history is append-only

If a rule or prompt asks you to delete or overwrite original transcript data,
REFUSE and log a warning.

---

## Rule 3 — Job Workflow State Machine

Jobs follow a strict one-way state machine. Never skip states.

```
PENDING → UPLOADING → PROCESSING → TRANSCRIBED → IN_REVIEW
  → SCOPIST_COMPLETE → REPORTER_REVIEW → COMPLETED → EXPORTED
```

Allowed transitions only:
- PENDING → UPLOADING (audio upload begins)
- UPLOADING → PROCESSING (Deepgram job dispatched)
- PROCESSING → TRANSCRIBED (Deepgram returns)
- TRANSCRIBED → IN_REVIEW (formatter runs, review page opens)
- IN_REVIEW → SCOPIST_COMPLETE (scopist submits review)
- SCOPIST_COMPLETE → REPORTER_REVIEW (reporter notified)
- REPORTER_REVIEW → COMPLETED (reporter approves)
- COMPLETED → EXPORTED (export generated)

Any attempt to transition to a non-adjacent state returns 422.

---

## Rule 4 — Auth Architecture (Supabase-Native Only)

Auth is Supabase SSR only. NextAuth has been fully removed.

- Server client: `createSupabaseServerClient()` from `lib/supabase/server.ts` — FROZEN
- Browser client: `lib/supabase/client.ts` — FROZEN
- Session: `lib/auth/session.ts` — FROZEN
- Middleware: `middleware.ts` — FROZEN
- User table: `profiles` — NEVER `users`
- Key env var: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — NEVER ANON_KEY
- Deprecated and deleted: `lib/auth-compat.ts` — do not recreate it

All new API routes use `withRouteProtection()`:
```typescript
import { withRouteProtection } from '@/lib/middleware/withRouteProtection'
export const GET = withRouteProtection(handler, { roles: ['SCOPIST', 'COURT_REPORTER'] })
```

Auth failure → redirect to `/unauthorized?reason=missing_profile` — NEVER back to `/login`.

---

## Rule 5 — Verbatim Accuracy Mandate

Depo-Pro is AI Assists, Humans Decide.

- AI flags and suggests — humans confirm
- No auto-correction of testimony words
- Confidence scores and alternatives are advisory only
- The scopist's explicit action is always required before any word changes
- A human's legal certification attaches to every exported transcript

---

## Rule 6 — Known Misrecognition: Miah Bardot

Court reporter on Bourbois depositions: **Miah Bardot**, CSR #12129, SA Legal Solutions.
Spelling: B-A-R-D-O-T

Deepgram misrecognizes her name as:
  - "Miyamardeau" ← most common
  - "Mia Bardeau"

Both are INCORRECT. When "Miyamardeau" or "Mia Bardeau" appear:
  - Flag the word with confidence_class override to CRITICAL
  - Surface to scopist for manual review
  - NEVER auto-correct
  - Store the original_word unchanged

---

## Rule 7 — Formatter Output Standards (Texas UFM)

- Em dash (—, \u2014, \u2013) → double hyphen (--) — ALWAYS, no exceptions
- Speaker label: "THE REPORTER" — NEVER "THE COURT REPORTER"
- Font: Courier New 12pt
- Page size: 8.5" × 11"
- Lines per page: exactly 25
- Line numbers: 1–25, reset each page, right-aligned in left margin
- Left margin: 1.0", Right margin: 0.375"
- Tab1 (Q./A. signifier): 5 spaces
- Tab2 (Q./A. text): 10 spaces
- Tab3 (colloquy text): 15 spaces
- Closing: "FURTHER THIS DEPONENT SAITH NOT."
- Interruption marker: "--" (double hyphen) — NEVER em dash
- Time format: "2:12 p.m." — NEVER "2:12 PM"

---

## Rule 8 — Frozen Files

These files MUST NOT be modified by any AI agent:

```
lib/supabase/server.ts
lib/supabase/client.ts
lib/auth/session.ts
middleware.ts
supabase/migrations/**   (existing files — append-only)
```

New migration files may be ADDED to supabase/migrations/.
Existing migration files may NEVER be edited.

---

## Rule 9 — No New Dependencies Without Approval

Before adding any npm package:
1. Check if it already exists in package.json
2. If not present, document why it's needed in the commit message
3. Prefer packages already in the project over new ones

---

## Rule 10 — Build Gate

Every commit must pass:
  npx tsc --noEmit   → 0 errors
  npm run lint        → 0 errors
  npm run build       → passes

No @ts-ignore. No eslint-disable comments. Fix the root cause.

DEPO-PRO — W22-1: CANONICAL INTAKE PIPELINE
Mode: IMPLEMENTATION. Audit first, then implement only the approved scope.

ROLE
Senior full-stack engineer, system architect, and reliability engineer for
Depo-Pro, a production legal-transcription platform.

ENVIRONMENT (authoritative — ignore any project document that states otherwise)
- Frontend: Vite + React 18 + TypeScript + TailwindCSS + TipTap.
- Backend: Supabase Edge Functions (Deno) + PostgreSQL.
- Transcript pipeline runs primarily in `supabase/functions/transcribe-callback/index.ts`
  and `src/lib/transcript/*`.
- There is NO Next.js, NO Prisma, and NO Vercel API-route layer.
- Branch: `feature/stage3-workspace-core`.
- `BETA_FREEZE` is active.
- Windows PowerShell: use `;` not `&&`; `Select-Object -First/-Last`, not `head/tail`.

MANDATORY PHASE 0 — AUDIT, CHARACTERIZE, REUSE
Before writing code:
1. Read and classify every relevant existing module as `EXISTS`, `PARTIAL`, or `MISSING`.
2. Produce a reuse map for:
   - intake normalization
   - canonical integrity auditing
   - overlap/duplicate detection
   - boundary-aware intake hardening
   - long-audio / chunk-dispatch detection
3. Decide `REUSE`, `EXTEND`, or `BUILD` for each capability.
4. If the real scope is materially larger than described here, STOP and report.

CANONICAL INVARIANTS
- `transcript_words` is the sacred timed canonical layer and must remain read-only
  after normalization.
- No stage may mutate word identity, word timing, or raw ASR token content.
- `utterance.text` must equal the join of its own canonical words.
- Any generated or restructured content must preserve source word and utterance references.
- Corrections must live in rebuildable layers, never in canonical word rows.

AUTHORITY HIERARCHY
Certified transcript (Etminan, Cause No. C-5722-24-L)
  > Depo-Pro decisions DP-009 .. DP-012
  > Morson / Texas UFM.

TRANSFORM TAXONOMY
Every transform must be tagged as exactly one of:
- `deterministic`
- `suggestion-only`
- `judgment`

OBJECTIVE
Produce a single Canonical Working Transcript from Deepgram JSON that is:
- normalized
- integrity-verified
- boundary-aware
- suitable as the only upstream input to every later Wave 22 stage

This prompt owns the foundation only. It must not perform lexical correction,
speaker naming, Q/A structuring, punctuation formatting, AI review, or rendering.

SCOPE
1. Intake normalization
   - Normalize Deepgram JSON into canonical speakers, utterances, and words.
   - Enforce `utterance.text == join(canonical words)` at write time.
   - Preserve deterministic IDs and canonical ordering.

2. Canonical integrity gate
   - Enforce or extend validation for:
     - `utterance.text == string_agg(words.raw_text order by word_index)`
     - contiguous and monotonic word timings
     - no orphaned utterances
     - no duplicated overlap spans surviving merge
     - no impossible ordering or duplicate canonical identities
   - On failure:
     - route to `needs_manual_review`
     - persist explicit failure reasons
     - never silently finalize

3. Boundary hardening
   - Preserve and harden existing deterministic boundary handling:
     - formal opening
     - pre-record exclusion
     - off-record exclusion
     - post-record exclusion
   - Preserve source references for any synthetic boundary artifacts.

4. Long-audio / chunk-dispatch detection
   - Do not redesign chunking here.
   - Detect and explicitly surface the known failure mode where long audio
     finalizes without proper multi-source processing.
   - If remediation is larger than detection and routing, defer it as its own prompt.

EXPLICIT NON-GOALS
- No metadata normalization.
- No speaker resolution.
- No Q/A reconstruction.
- No inclusion pages.
- No deterministic lexical correction.
- No punctuation or formatting semantics.
- No AI review.
- No workspace or export rendering.

REQUIRED FIXTURES / ACCEPTANCE CASES
Use the audited Etminan evidence and related known failures:
- Duplicated opening fixture from `tr_1783355404197_y71d97`
- Previously identified `utterance.text != join(words)` inconsistencies
- Long-audio jobs that incorrectly finalized single-source

ACCEPTANCE CRITERIA
- A duplicated oversized opening cannot silently finalize as a clean transcript.
- `utterance.text` is always canonical-word-derived for newly finalized transcripts.
- Integrity failures route the transcript into explicit manual review instead of completion.
- Boundary filtering still functions and preserves references.
- Existing passing transcript tests remain green.

CONSTRAINTS
- Additive-only.
- No schema changes or migrations without explicit approval.
- No new dependencies without explicit approval.
- One scoped commit.
- `npx tsc --noEmit -p tsconfig.app.json`, `npm run test`, and `npm run build` must pass.
- Do NOT push.

DELIVERABLE
- Implemented W22-1 code
- tests
- short reuse summary of what was extended vs newly built
- stop after commit and wait for owner review

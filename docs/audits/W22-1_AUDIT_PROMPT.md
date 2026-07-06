# DEPO-PRO — W22-1 PHASE 0 AUDIT: CANONICAL INTAKE PIPELINE

Mode: AUDIT ONLY. Produce a report and STOP. No code, schema, or data changes.

## ROLE

Senior full-stack engineer, system architect, and reliability engineer for Depo-Pro, a production legal-transcription platform.

## ENVIRONMENT

Authoritative environment facts — ignore any project document that states otherwise:

- Frontend: Vite + React 18 + TypeScript + TailwindCSS + TipTap.
- Backend: Supabase Edge Functions (Deno) + PostgreSQL. Deepgram Nova-3 via raw fetch().
- There is NO Next.js, NO Prisma, and NO Vercel API-route layer.
- The transcript pipeline runs primarily at finalize in `supabase/functions/transcribe-callback/index.ts` and in `src/lib/transcript/*`.
- Branch: `feature/stage3-workspace-core`.
- `BETA_FREEZE` is active.
- Windows PowerShell: use `;` not `&&`; `Select-Object -First/-Last`, not `head/tail`.

## CANONICAL INVARIANTS

The audit must evaluate the pipeline against these:

- `transcript_words` (`raw_text`, `start_time`, `end_time`, speaker clusters, audio links) is the sacred canonical timed layer and is read-only to every stage after normalize.
- Corrections live in rebuildable layers, never in canonical word rows.
- `utterance.text` must equal the join of its canonical words.
- Restructured/generated content must carry `source_utterances` / `word_id` back-references.

Authority hierarchy:

- certified transcript (Etminan, `C-5722-24-L`)
- `DP-009` .. `DP-012`
- Morson / Texas UFM

Transform taxonomy:

- deterministic
- suggestion-only
- judgment

## OBJECTIVE OF W22-1

This audit is scoping, not building:

A single Canonical Working Transcript produced from raw Deepgram JSON: normalized, integrity-verified, and boundary-aware, that every later Wave 22 stage consumes. It performs NO lexical, metadata, punctuation, or AI correction, and NO rendering.

## AUDIT TASKS

Read-only; cite `file:line` for every finding.

### 1. Pipeline Map

Trace the actual order of operations from Deepgram JSON to the point a transcript is marked complete.

Produce one ordered diagram of what runs today, across:

- `src/lib/transcript/normalize.ts`
- `src/lib/transcript/integrityAudit.ts`
- `src/lib/transcript/boundaryEngine.ts`
- `src/lib/transcript/multifileMerge.ts`
- `src/lib/transcript/autoChunking.ts`
- `supabase/functions/transcribe-callback/index.ts`
- `supabase/functions/transcribe-start/index.ts`

Flag any place where formatting or rendering happens before corrections.

### 2. Normalization State

In `normalize.ts` (around line 233), determine whether persisted `utterance.text` currently derives from canonical words or still prefers the Deepgram utterance transcript string.

Report `EXISTS` / `PARTIAL` / `MISSING` for the invariant:

- `utterance.text == join(words)`

### 3. Integrity Gate

In `integrityAudit.ts`, determine whether it currently enforces, and fails / routes to manual review on:

- `utterance.text == string_agg(words.raw_text by word_index)`
- duplicated spans surviving chunk merges
- contiguous monotonic word timings
- no orphaned utterances

Report which of these are enforced vs absent.

### 4. Known-Defect Confirmation

Do not fix. Characterize only.

- Duplicate opening in transcript `tr_1783355404197_y71d97` / job `d712e806-b75d-45e6-b697-f984882d4235`
  - Cross-reference `docs/audits/DUP_OPENING_AUDIT_2026-07-06.md`
  - Confirm current origin (`utterance.text` vs word layer)
  - Confirm whether the integrity gate would now catch it
- The 8 transcripts previously found with `utterance.text != join(words)`
  - Re-confirm which are still inconsistent
  - Read-only count and list IDs
- Long-audio auto-chunk gap
  - Confirm whether jobs with duration `> 4500s` still finalize as single-response instead of multifile
  - Confirm whether the integrity gate detects it

### 5. Boundary Engine

In `boundaryEngine.ts`, report which detections exist and whether outputs preserve `source_utterance` back-references:

- on/off-record
- formal opening
- pre-record cutoff
- post-record cutoff

Classify each as `EXISTS` / `PARTIAL` / `MISSING`.

## DELIVERABLE

Write to:

- `docs/audits/W22-1_INTAKE_AUDIT_<date>.md`

Required sections:

- `A.` The pipeline-order diagram, with any ordering violations flagged
- `B.` A REUSE MAP: for every W22-1 capability (intake normalization, integrity gate, boundary hardening), classify `REUSE` / `EXTEND` / `BUILD`, citing the file
- `C.` A concrete W22-1 implementation plan derived from `B`, split into scoped commits
- `D.` Freeze impact per planned change (`schema`, `new dep`, `canonical-layer touch`)
- `E.` An explicit list of anything that should be its own prompt rather than folded into W22-1

## CONSTRAINTS

- AUDIT ONLY. No code, schema, migration, or data changes.
- Do not push.
- Do not commit anything other than the audit markdown itself, and only if instructed.
- If any task reveals the scope is materially larger than described, STOP and report; do not expand scope.
- STOP after writing the report.
- Await owner review and explicit approval before W22-1 implementation begins.

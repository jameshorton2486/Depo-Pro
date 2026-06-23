# KEYTERM PHASE 1 BASELINE

Date: 2026-06-23  
Branch: `feature/stage3-workspace-core`  
Mode: Read-only baseline prior to keyterm pipeline repair

## Verdict

The keyterm pipeline already exists end to end. The primary defect is not missing derivation, ranking, pruning, or Deepgram request construction. The primary defect is integrity: the current flow does not explicitly prove that the attached audio and the case-scoped keyterms describe the same proceeding before transcription starts.

Secondary quality gap: the active ranking path does not strongly prioritize difficult-to-spell names and entities over generic legal vocabulary.

## Input Review

Reviewed:

- `AGENTS.md`
- `docs/architecture/MASTER_ARCHITECTURE.md`
- `KEYTERM_PIPELINE_FINDINGS.md`
- `TRANSCRIPT_KEYTERM_AUDIT.md`

Requested but not found in the current workspace:

- `DEPO-PRO_Deepgram_Transcription_Implementation_Report.md`
- `DEPO-PRO_Transcription_Report_Addendum.md`

Those missing reports do not block the baseline because the live code path and prior keyterm audits are clear on the current branch.

## Current Derivation Path

### Durable source

The durable source of transcription keyterms is `CaseRecord.deepgram.keyterms`, persisted inside the case payload.

- `src/components/IntakeScreen/IntakeScreen.tsx`
- `src/api/caseService.ts`

### Managed/UI seed path

Initial managed keyterms are built from:

1. harvested case/provenance suggestions
2. already stored `record.deepgram.keyterms`

Implemented in:

- `src/lib/keyterms/managedKeyterms.ts`
  - `buildManagedKeyterms(...)`

### Derived keyterm generation path

Case-derived candidate generation already exists and is deterministic.

- `src/lib/keytermDerivation.ts`
  - `deriveKeytermsWithBudget(record)`
  - group builders for witnesses, parties, attorneys, firms, organizations, county, addresses, participants, and default legal terms

Key branch behavior:

- witness names are first-priority derived groups
- party/person and organization extraction already exists
- law firms and organization phrases already exist
- default legal terms are appended last
- soft caps are enforced during derivation:
  - `DEEPGRAM_KEYTERM_SOFT_TERM_CAP = 90`
  - `DEEPGRAM_KEYTERM_SOFT_TOKEN_CAP = 400`

## Current Ranking Path

Managed/UI ranking is handled by:

- `src/lib/keytermRanker.ts`
  - `computePriority(...)`
  - `rankKeyterms(...)`

Current ranking inputs:

- category weight
- source weight
- boost
- confidence bonus
- pinned state

Current category order:

1. `proper_name`
2. `company`
3. `location`
4. `legal_term`
5. `technical`
6. `other`

Important gap:

The active ranking path does not currently score:

- unusual spelling
- surname difficulty
- multi-word surnames
- hyphenated names
- organization complexity
- medical-term difficulty

That makes generic legal terms comparatively too competitive when the budget tightens.

## Current Pruning Path

Budget enforcement already exists in two places.

### UI/store pruning

- `src/components/DeepgramKeytermManager/keytermStore.tsx`
- `src/lib/keytermPruner.ts`

This pruning controls which managed terms remain selected in the UI.

### Request-budget pruning

- `src/lib/deepgram/requestBudget.ts`
  - `fitStoredKeytermsToRequestBudget(...)`

This is the live request-budget gate used immediately before the Deepgram request is built.

Current request-budget behavior:

- skips explicitly deselected stored terms
- keeps terms in stored order until soft term/token caps are reached
- does not re-rank at request-build time

## Current Deepgram Request Path

The real transcription path is:

1. `startTranscription(caseId)`
   - `src/api/transcriptionService.ts`
2. Supabase Edge Function `transcribe-start`
   - `supabase/functions/transcribe-start/index.ts`
3. `requireCase(caseId)`
4. `requireOrderedAudio(caseId)`
5. `normalizeCaseRecord(caseRow.payload)`
6. `fitStoredKeytermsToRequestBudget(record.deepgram.keyterms)`
7. `buildDeepgramRequestFromStoredKeyterms({ caseId, keyterms })`
8. submit request to Deepgram

Request builder:

- `src/lib/deepgram/buildDeepgramRequest.ts`

Active request characteristics:

- repeated `keyterm=` query params
- model `nova-3`
- no schema change required for keyterm transport

## Current Failure Points

### 1. Case/audio/keyterm integrity is not explicitly enforced

The current flow assumes:

`case_id` -> attached audio -> stored keyterms

belong to the same proceeding.

That assumption is not explicitly validated before transcription starts.

Relevant files:

- `src/components/IntakeScreen/DocumentUploadPanel.tsx`
- `src/api/fileService.ts`
- `src/api/transcriptionService.ts`
- `supabase/functions/transcribe-start/index.ts`

This is the defect class already confirmed in `KEYTERM_PIPELINE_FINDINGS.md`.

### 2. Wrong keyterms can reach the correct request builder

The request builder itself is not the failure. If the wrong audio is bound to a case, the builder still faithfully sends the keyterms from that case.

Result:

- correct builder
- wrong case/audio pairing
- wrong keyterms boosted for the actual audio

### 3. No explicit transcript-context validation before request submission

There is no explicit guard that compares likely witness/caption/entity signals between:

- case metadata
- derived/stored keyterms
- selected audio asset

before the request is queued.

### 4. Difficult-to-spell names are not promoted strongly enough

The repo already derives:

- names
- organizations
- firms
- legal terms

But the active ranking path does not add extra priority for difficult spellings or high-risk entities. This is the clearest quality seam for Phase 1 after integrity protection.

### 5. `normalizeDeepgramKeyterms()` is not the production path

`src/api/transcriptionService.ts` still contains `normalizeDeepgramKeyterms(...)`, but the real send path uses stored keyterms plus:

- `fitStoredKeytermsToRequestBudget(...)`
- `buildDeepgramRequestFromStoredKeyterms(...)`

This matters because any repair must target the actual Stage 2 path, not the unused helper.

## Repair Surface Recommendation

Phase 1 should target these seams, in order:

1. case-scoped integrity tests around the live request path
2. mismatch rejection when case/audio/keyterm scope is inconsistent
3. ranking changes in `src/lib/keytermRanker.ts`
4. deterministic difficult-spelling promotion using existing case-derived signals

## Constraints Confirmed

- no schema changes required
- no migrations required
- no new dependencies required
- no Deepgram contract change required
- no transcript content change required
- no AI inference required

## Ready For Implementation

PASS

The current pipeline is clear enough to begin Keyterm Phase 1 implementation. The missing reports named in the prompt are not needed to identify the live derivation, ranking, pruning, and request path on this branch.

# KEYTERM PHASE 1 BASELINE

Date: 2026-06-23  
Branch: `feature/stage3-workspace-core`  
HEAD: `9dfeb2d`  
Mode: Read-only audit

## Executive Summary

The keyterm pipeline already exists and is functioning end to end on the current branch. The live path is:

`CaseRecord.deepgram.keyterms` -> request-budget fit -> Deepgram request builder -> `transcribe-start` edge function -> Deepgram Nova-3 request.

The authoritative derivation source is `deriveKeytermsWithBudget()` in `src/lib/keytermDerivation.ts`, the authoritative ranking source is `rankKeyterms()` in `src/lib/keytermRanker.ts`, and the authoritative UI pruning source is `pruneToLimits()` in `src/lib/keytermPruner.ts`. The live wire-request pruning gate is `fitStoredKeytermsToRequestBudget()` in `src/lib/deepgram/requestBudget.ts`.

Historic Garza/Etminan mismatch risk is now partially guarded on current HEAD by `assertCaseAudioIntegrity()` in `src/lib/keyterms/caseAudioIntegrity.ts`, which is called from `supabase/functions/transcribe-start/index.ts`. That closes the "no guard at all" state, but it is still filename-signal validation, not transcript-context validation.

The single highest-value remaining repair opportunity is ranking and request-order hardening for difficult-to-spell names and entities, because the current pipeline already derives them, but quality still depends heavily on their relative priority before request-budget trimming.

## Gate

- Branch confirmed: `feature/stage3-workspace-core`
- HEAD: `9dfeb2d`
- `npm run test`: PASS (`56` files, `281` tests)
- `npm run typecheck`: PASS

## End-to-End Call Graph

### Live request path

1. Case payload persists selected keyterms in `record.deepgram.keyterms`.
   - `src/components/IntakeScreen/IntakeScreen.tsx:1472`
   - `src/api/caseService.ts:74`
2. The transcript creation UI previews the current Deepgram payload from stored case keyterms.
   - `src/components/TranscriptCreationScreen.tsx:30`
   - `src/components/DeepgramKeytermManager/DeepgramPayloadPreview.tsx:75`
3. `startTranscription(caseId)` invokes the `transcribe-start` edge function.
   - `src/api/transcriptionService.ts:124`
4. The edge function loads the case row and ordered audio rows.
   - `supabase/functions/transcribe-start/index.ts:87`
   - `supabase/functions/transcribe-start/index.ts:88`
5. The case payload is normalized into a `CaseRecord`.
   - `supabase/functions/transcribe-start/index.ts:94`
6. Filename-vs-case integrity is checked.
   - `supabase/functions/transcribe-start/index.ts:95`
   - `src/lib/keyterms/caseAudioIntegrity.ts:122`
7. Stored keyterms are fit to the live request budget.
   - `supabase/functions/transcribe-start/index.ts:96`
   - `src/lib/deepgram/requestBudget.ts:15`
8. A Deepgram Nova-3 request preview and wire URL are built from stored keyterms.
   - `supabase/functions/transcribe-start/index.ts:105`
   - `src/lib/deepgram/buildDeepgramRequest.ts:146`
9. The edge function submits the request to Deepgram.
   - `supabase/functions/transcribe-start/index.ts:332`

### Visual pipeline diagram

```text
CaseRecord
  -> record.deepgram.keyterms
  -> serializeManagedKeyterms()
  -> saveCase()
  -> startTranscription(caseId)
  -> transcribe-start edge function
  -> requireCase() + requireOrderedAudio()
  -> normalizeCaseRecord()
  -> assertCaseAudioIntegrity()
  -> fitStoredKeytermsToRequestBudget()
  -> buildDeepgramRequestFromStoredKeyterms()
  -> Deepgram Nova-3 request
```

### Component map

| Step | File | Symbol | Responsibility | Input | Output |
|---|---|---|---|---|---|
| Persistence | `src/components/IntakeScreen/IntakeScreen.tsx` | `serializeManagedKeyterms(...)` call site | Converts managed UI state to stored Deepgram keyterms | `ManagedKeyterm[]` | `DeepgramKeyterm[]` |
| Persistence | `src/api/caseService.ts` | `saveCase(record)` | Persists full case payload | `CaseRecord` | saved case row |
| Managed build | `src/lib/keyterms/managedKeyterms.ts` | `buildManagedKeyterms(...)` | Merges harvested suggestions with stored keyterms | `CaseRecord`, provenance | `ManagedKeyterm[]` |
| Derivation | `src/lib/keytermDerivation.ts` | `deriveKeytermsWithBudget(record)` | Builds deterministic derived candidates with soft caps | `CaseRecord` | included/dropped `DeepgramKeyterm[]` |
| Ranking | `src/lib/keytermRanker.ts` | `rankKeyterms(terms)` | Scores and orders managed terms | `ManagedKeyterm[]` | ranked `ManagedKeyterm[]` |
| UI pruning | `src/lib/keytermPruner.ts` | `pruneToLimits(terms)` | Deselects low-priority items to satisfy UI limits | ranked `ManagedKeyterm[]` | pruned `ManagedKeyterm[]` |
| Request budget | `src/lib/deepgram/requestBudget.ts` | `fitStoredKeytermsToRequestBudget(keyterms)` | Enforces live request caps on stored terms | `DeepgramKeyterm[]` | budget-fit `DeepgramKeyterm[]` |
| Request build | `src/lib/deepgram/buildDeepgramRequest.ts` | `buildDeepgramRequestFromStoredKeyterms(...)` | Produces Deepgram preview + wire URL | case id, stored keyterms | preview object + `wireUrl` |
| Dispatch | `supabase/functions/transcribe-start/index.ts` | edge function body | Assembles and sends final Deepgram request | case id | queued transcription job |

## Live vs Legacy Components

| Component | Status | Evidence | Notes |
|---|---|---|---|
| `src/lib/keytermDerivation.ts` | `LIVE` | `src/lib/keytermDerivation.ts:512`, `src/components/DeepgramKeytermManager/DeepgramKeytermManager.tsx:547` | Authoritative derived-keyterm source for current branch |
| `src/lib/keyterms/managedKeyterms.ts` | `LIVE` | `src/lib/keyterms/managedKeyterms.ts:91`, `src/lib/keyterms/managedKeyterms.ts:171` | UI state/persistence bridge |
| `src/lib/keyterms/harvestKeyterms.ts` | `PARTIAL` | `src/lib/keyterms/harvestKeyterms.ts:188` | Live as a suggestion-seed source, not the final request authority |
| `src/lib/keytermRanker.ts` | `LIVE` | `src/lib/keytermRanker.ts:136`, `src/lib/keytermRanker.ts:150` | Authoritative ranking source |
| `src/lib/keytermPruner.ts` | `LIVE` | `src/lib/keytermPruner.ts:28`, `src/components/DeepgramKeytermManager/keytermStore.tsx:82` | Authoritative UI pruning source |
| `src/lib/deepgram/requestBudget.ts` | `LIVE` | `src/lib/deepgram/requestBudget.ts:15`, `supabase/functions/transcribe-start/index.ts:96` | Authoritative wire-request budget gate |
| `src/lib/parsing/keytermExtractor.ts` | `PARTIAL / LEGACY` | `src/lib/parsing/keytermExtractor.ts:27` | Parser-era helper producing `deepgramKeyterms`, `confirmedSpellings`, and `phoneticMappings`, but not the Stage 2 request authority |
| `src/api/transcriptionService.ts` `normalizeDeepgramKeyterms()` | `UNUSED FOR LIVE SEND PATH` | `src/api/transcriptionService.ts:73`, `supabase/functions/transcribe-start/index.ts:96` | Still tested locally, but not the live request path on this branch |

## Case Scoping Analysis

### How keyterms attach to a request

1. Managed terms are serialized back onto `record.deepgram.keyterms`.
   - `src/components/IntakeScreen/IntakeScreen.tsx:1472`
2. The case payload is saved as a full `CaseRecord`.
   - `src/api/caseService.ts:74`
3. `startTranscription(caseId)` passes only the `caseId` into the edge function.
   - `src/api/transcriptionService.ts:124`
4. The edge function reloads the case payload by that `caseId` and uses `record.deepgram.keyterms`.
   - `supabase/functions/transcribe-start/index.ts:87`
   - `supabase/functions/transcribe-start/index.ts:96`

### Guards that currently exist

- Explicit case reload by `caseId`
- Ordered audio lookup by `caseId`
- Filename-vs-case validation via `assertCaseAudioIntegrity()`

Evidence:

- `supabase/functions/transcribe-start/index.ts:87`
- `supabase/functions/transcribe-start/index.ts:88`
- `supabase/functions/transcribe-start/index.ts:95`
- `src/lib/keyterms/caseAudioIntegrity.ts:98`
- `src/lib/keyterms/caseAudioIntegrity.ts:122`

### Where a mismatch would still occur

The remaining exposure is not "no guard exists." The remaining exposure is that the guard compares case-derived reference tokens to the audio filename. If the filename is generic or carries weak identifying signal, the request is allowed through.

Evidence:

- Generic filenames are allowed when fewer than two distinctive filename tokens exist.
  - `src/lib/keyterms/caseAudioIntegrity.ts:107`
- That behavior is explicitly covered by test.
  - `src/lib/keyterms/caseAudioIntegrity.test.ts:155`

### Explicit answer

Obvious case/audio mismatches are now guarded on current HEAD. Full transcript-context validation does not exist. So the live answer is:

- old state: mismatch was possible without an explicit guard
- current state: mismatch is partially guarded by filename-based integrity validation
- remaining gap: generic filenames and non-filename context mismatches are not fully prevented

## Ranking Analysis

### Current ranking factors

`computePriority()` combines:

- category weight
- source weight
- derived-origin weight
- boost
- confidence bonus
- difficulty bonus

Evidence:

- `src/lib/keytermRanker.ts:136`
- `src/lib/keytermRanker.ts:144`
- `src/lib/keytermRanker.ts:146`

### Current priority order

The current branch already weights people and entities above generic legal vocabulary.

- `proper_name` > `company` > `location` > `technical` > `legal_term` > `other`
- derived origin weights place `witness`, `attorney`, and `expert` above `legal_term`

Evidence:

- `src/lib/keytermRanker.test.ts:23`
- `src/lib/keytermRanker.test.ts:47`
- `src/lib/keytermRanker.test.ts:54`

### Current limits

- UI pruning limits: `MAX_TERMS = 100`, `MAX_TOKENS = 500`
  - `src/lib/keytermPruner.ts:14`
  - `src/lib/keytermPruner.ts:15`
- Derivation/request soft caps: `90` terms / `400` tokens
  - `src/lib/keytermDerivation.ts:9`
  - `src/lib/keytermDerivation.ts:10`

### Tie-breaking behavior

Sort order in `rankKeyterms()` is:

1. pinned first
2. selected before unselected
3. higher priority first
4. alphabetical term order

Evidence:

- `src/lib/keytermRanker.ts:158`
- `src/lib/keytermRanker.ts:159`
- `src/lib/keytermRanker.ts:161`

### Conclusion

Proper names already outrank generic legal terms on the current branch. The remaining question is not whether ranking exists; it is whether request-budget trimming reliably preserves the most accuracy-sensitive names and entities from the stored ordering that reaches the wire.

## Difficult-to-Spell Analysis

| Category | Status | Evidence | Notes |
|---|---|---|---|
| Uncommon surnames | `EXISTS` | `src/lib/keytermRanker.test.ts:54` | Ranking tests confirm uncommon surnames get promoted |
| Hyphenated names | `PARTIAL` | difficulty bonus exists in ranking logic | Present as a heuristic in ranking, but not documented as a dedicated pipeline stage |
| Multi-word surnames | `EXISTS` | `src/lib/keytermRanker.test.ts:54` | Covered by difficulty promotion behavior |
| Organizations | `EXISTS` | `src/lib/keytermDerivation.test.ts:426` | Derived from existing case-linked organization data |
| Medical terminology | `PARTIAL` | `src/lib/keytermDerivation.ts:512` | Medical providers are derived; dedicated medical-vocabulary treatment is limited |
| Firms | `EXISTS` | `src/lib/keytermDerivation.test.ts:656` | Firm tokens derive from attorney/videographer case entries |
| Expert names | `PARTIAL` | derived-origin weights include `expert` | Weighting exists; explicit expert-source derivation path is less visible than witness/attorney paths |

Insertion point if further promotion is needed:

- ranking layer: `src/lib/keytermRanker.ts:136`
- request-budget preservation: `src/lib/deepgram/requestBudget.ts:15`

## Deepgram Request Analysis

### Wire format

The live request uses:

- Deepgram endpoint `https://api.deepgram.com/v1/listen`
- model `nova-3`
- repeated `keyterm` query parameters
- no Nova-2 `keywords` format
- no boost syntax on the wire

Evidence:

- `src/lib/deepgram/buildDeepgramRequest.ts:45`
- `src/lib/deepgram/buildDeepgramRequest.ts:48`
- `src/lib/deepgram/buildDeepgramRequest.ts:116`
- `src/lib/deepgram/buildDeepgramRequest.test.ts:56`

### Budget enforcement before request

Budget fitting happens before request build in the edge function.

Evidence:

- `supabase/functions/transcribe-start/index.ts:96`
- `supabase/functions/transcribe-start/index.ts:105`

### Preview vs wire behavior

The builder keeps metadata in the preview object but strips it off the actual wire params.

Evidence:

- `src/lib/deepgram/buildDeepgramRequest.ts:125`
- `src/lib/deepgram/buildDeepgramRequest.ts:126`
- `src/lib/deepgram/buildDeepgramRequest.ts:142`

## Existing Test Coverage

| Area | Coverage | Evidence |
|---|---|---|
| Derivation | Strong | `src/lib/keytermDerivation.test.ts:254` through `src/lib/keytermDerivation.test.ts:735` |
| Ranking | Strong | `src/lib/keytermRanker.test.ts:23`, `src/lib/keytermRanker.test.ts:47`, `src/lib/keytermRanker.test.ts:54` |
| Harvesting | Present | `src/lib/keyterms/harvestKeyterms.test.ts:117` |
| Request budget | Strong | `src/lib/deepgram/requestBudget.test.ts:17` |
| Request construction | Strong | `src/lib/deepgram/buildDeepgramRequest.test.ts:6` |
| Case/audio integrity | Present | `src/lib/keyterms/caseAudioIntegrity.test.ts:131` |
| Legacy helper normalization | Limited | `src/api/transcriptionService.test.ts:6` |

## Confirmed Gaps

1. There is no end-to-end test proving save -> stored keyterms -> `transcribe-start` -> built wire request using the actual persisted `CaseRecord`.
2. Case/audio integrity validation is filename-based, not transcript-context-aware.
3. Request-budget fitting trims stored keyterms in persisted order; it does not independently re-rank the final request payload at send time.
4. `keytermExtractor.ts` still exists as parser-era logic, which increases cognitive overhead even though it is not the live request authority.

## Recommended Phase 1 Repair Targets

| Target | Severity | Effort | Expected Accuracy Impact | Why |
|---|---|---|---|---|
| Request-order hardening for high-value names/entities | High | Medium | High | Budget trimming still depends on stored ordering reaching the wire |
| End-to-end case-scoped request test | High | Medium | Medium | Verifies the real persistence-to-request path, not just unit layers |
| Stronger difficult-spelling promotion | Medium | Medium | High | Improves witness/attorney/organization recognition before formatting ever begins |
| Transcript-context validation beyond filename signal | Medium | Higher | Medium | Closes the remaining gap when filenames are generic |

## Required Answers

1. **Does a functioning keyterm pipeline already exist?**  
   Yes. Derivation, ranking, pruning, request-budget fitting, and Deepgram request construction are all present and wired into the live path.

2. **What component is the authoritative derivation source?**  
   `deriveKeytermsWithBudget()` in `src/lib/keytermDerivation.ts:512`.

3. **What component is the authoritative ranking source?**  
   `rankKeyterms()` in `src/lib/keytermRanker.ts:150`.

4. **What component is the authoritative pruning source?**  
   UI pruning: `pruneToLimits()` in `src/lib/keytermPruner.ts:28`.  
   Live wire-request pruning: `fitStoredKeytermsToRequestBudget()` in `src/lib/deepgram/requestBudget.ts:15`.

5. **Can keyterms currently mismatch transcripts?**  
   Not in the old unguarded way. Current HEAD adds explicit filename-based case/audio integrity validation, so obvious mismatches are rejected. The remaining gap is that generic filenames and non-filename context mismatches can still pass.

6. **What is the single highest-value repair opportunity?**  
   Harden final request ordering and preservation for difficult-to-spell names and entities, because that improves Deepgram recognition at the source without requiring schema changes or downstream correction logic.

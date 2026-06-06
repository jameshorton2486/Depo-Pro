# DEPO-PRO Final Runtime Acceptance Audit

Date: 2026-06-06  
Branch: `feature/stage3-workspace-core`  
Scope: browser-runtime only

## Executive Summary

This audit was limited to the two remaining runtime unknowns:

1. Case Browser Runtime
2. Workspace Runtime Persistence

The storage and persistence seams behind both areas are already live and previously verified:

- case save/load round-trip: PASS
- upload durability rows + storage objects: PASS
- extraction persistence: PASS
- conflict rehydration from provenance: PASS
- transcript ingest storage: PASS
- `raw_text` immutability: PASS

What remains unproven is the actual browser-level interaction loop.

That browser-level loop was **not completed** in this session because the available in-app browser runtime failed before tab navigation. The failure was in the browser tooling layer, not in the app under test:

- attempted browser-runtime connection through the required in-app browser path
- browser runtime failed before opening a live tab
- diagnostic returned: `node_repl kernel exited unexpectedly ... windows sandbox failed: spawn setup refresh`

Because the acceptance requirement was explicit that these items must be verified through actual browser behavior, both runtime areas remain **not accepted**.

## 1. Case Browser Runtime

Result: `FAIL`

Required runtime checks:
- create Case A
- create Case B
- switch A → B
- verify no leakage
- switch B → A
- verify A restores correctly
- refresh while viewing A
- verify active-case behavior and no data loss

Observed result:
- not executed in a live browser due browser runtime failure before navigation

What is already known from prior evidence:
- [src/context/CaseContext.tsx](/C:/Users/james/Projects/Depo-Pro/src/context/CaseContext.tsx:165) routes all case switching through one active-case seam
- [src/components/DepoEditor.tsx](/C:/Users/james/Projects/Depo-Pro/src/components/DepoEditor.tsx:219) remounts the case-scoped shell under `key={activeCaseId}`
- [src/components/DepoEditor.tsx](/C:/Users/james/Projects/Depo-Pro/src/components/DepoEditor.tsx:191) remounts `StageProvider`, `IntakeProvider`, `ConflictProvider`, and `KeytermProvider` per case

Why this is still `FAIL`:
- this audit required browser-level proof, not code inspection
- no browser interaction means no acceptance evidence for Create / Switch / Return / Refresh behavior

## 2. Workspace Runtime Persistence

Result: `FAIL`

Required runtime checks:
- open a real transcript in the workspace
- edit at least three words
- save or autosave
- refresh
- confirm edits survive
- reopen through Case Browser
- confirm edits still survive

Observed result:
- not executed in a live browser due the same browser runtime failure before navigation

What is already known from prior evidence:
- `node scripts\\verify-transcript-ingest.mjs` passed live against Supabase
- it successfully:
  - inserted a case row
  - inserted a transcript job row
  - inserted canonical speakers / utterances / words
  - verified row counts
  - verified `raw_text` immutability
  - archived the verification case

Why this is still `FAIL`:
- the storage layer is proven
- the browser-level edit / save / refresh / reopen loop is not yet proven
- this audit’s requirement was explicitly runtime behavior, not repository inspection

## 3. Leakage Audit

Result: `FAIL`

Required runtime checks:
- Case A and Case B both opened in browser
- transcript edits remain scoped correctly
- uploads remain scoped correctly
- extraction remains scoped correctly
- conflicts remain scoped correctly

Observed result:
- not executed in a live browser due the browser runtime failure before navigation

What is already known from prior evidence:
- conflict state is case-scoped through provider remounts and persisted provenance replay
- upload rows and extraction rows are keyed by `case_id`
- transcript rows are keyed by `case_id` / `job_id`

Why this is still `FAIL`:
- acceptance required live cross-case runtime observation
- that cross-case observation did not occur

## Release Readiness Update

- Case Browser Runtime: `FAIL`
- Workspace Runtime Persistence: `FAIL`
- Leakage Audit: `FAIL`

These are acceptance failures due missing browser-runtime evidence, not due a newly reproduced product defect.

## Final Recommendation

Recommendation: **OPTION B — FIX SPECIFIC DEFECTS THEN MERGE**

Blocking issue:
- browser-runtime acceptance remains incomplete

Severity:
- High for release readiness
- Medium for product confidence, because the underlying persistence/storage layers are already passing live verification

Estimated effort:
- Short, once a working browser-runtime path is available
- Expected scope is a single live acceptance session, unless that session surfaces a real UI persistence defect

## Bottom Line

`feature/stage3-workspace-core` is **not yet a legitimate release candidate for main** under the standard set by this audit, because the final browser-runtime acceptance was not completed with observed behavior.

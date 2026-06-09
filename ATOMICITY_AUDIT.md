# Conflict / Provenance Atomicity — Characterization Audit

**Date:** 2026-06-09  
**HEAD at audit:** `bef2764`  
**Baseline:** `npm run test` `43 / 228` · `npm run typecheck` pass · `git clean` yes

## Verdict
- Q1 (divergence conditions): **(a) normal-use** — live metadata can drift in a normal single-session flow because `UfmPayloadPreview` reads a stale `activeProvenance` snapshot rather than current conflict/provenance state; durable DB-row divergence between `cases.payload` and `field_provenance` is otherwise failure-only.
- Q2 (provenance nature): **partial** — `field_confirmations` and most `ufm_metadata` are reconstructable from `cases.payload`; `field_sources` is only partially reconstructable, and the full provenance history in `field_provenance` is independent.
- Recommended fix path: **(B) derived / co-located provenance**
- RC status: **known bounded risk**
- Freeze-safe to implement: **yes** for the recommended path, if done as read-time derivation and/or payload-co-located provenance inside existing `cases.payload` JSONB without schema changes

## 1. Save path map

Ordered runtime writes observed in the live intake flow:

1. **User save action -> `persistCase()`**  
   File: [src/components/IntakeScreen/IntakeScreen.tsx](/C:/Users/james/Projects/Depo-Pro/src/components/IntakeScreen/IntakeScreen.tsx:1509)  
   Behavior:
   - gathers `currentRecord`
   - adds `_saveMeta` and `updated_at`
   - calls `saveCase(...)`
   - **awaited**

2. **`saveCase()` -> `cases` upsert**  
   File: [src/api/caseService.ts](/C:/Users/james/Projects/Depo-Pro/src/api/caseService.ts:57)  
   Write:
   - table: `cases`
   - columns: `case_id`, `proceeding_type`, `stage`, `notes`, `payload`
   - payload column receives the full `CaseRecord`
   - **single awaited network write**

3. **Reload after successful save -> local state only**  
   File: [src/components/IntakeScreen/IntakeScreen.tsx](/C:/Users/james/Projects/Depo-Pro/src/components/IntakeScreen/IntakeScreen.tsx:1528)  
   Behavior:
   - after `saveCase()` returns, `loadCase(savedRecord)` is dispatched into Intake state
   - this is not a DB read; it reloads the saved in-memory record into the reducer

Separate provenance writes that participate in the lifecycle, but **not** in the save call itself:

4. **Extraction provenance write(s) -> `field_provenance` insert**  
   Files:
   - [src/components/IntakeScreen/extractionPersistence.ts](/C:/Users/james/Projects/Depo-Pro/src/components/IntakeScreen/extractionPersistence.ts:75)
   - [src/components/conflict/conflictStore.tsx](/C:/Users/james/Projects/Depo-Pro/src/components/conflict/conflictStore.tsx:140)  
   Trigger:
   - `recordExtraction(...)` for each extracted field update
   - `detectConflict(...)` for each extraction conflict
   Write:
   - table: `field_provenance`
   - row-per-event
   - **fire-and-forget, not awaited by the caller**

5. **User confirm provenance write -> `field_provenance` insert**  
   Files:
   - [src/components/ExtractedFieldsTable/ExtractedFieldsTable.tsx](/C:/Users/james/Projects/Depo-Pro/src/components/ExtractedFieldsTable/ExtractedFieldsTable.tsx:579)
   - [src/components/conflict/conflictStore.tsx](/C:/Users/james/Projects/Depo-Pro/src/components/conflict/conflictStore.tsx:370)  
   Trigger:
   - `recordConfirm(...)`
   Write:
   - table: `field_provenance`
   - event type: `confirmed`
   - **fire-and-forget**

6. **User conflict-resolution provenance write -> `field_provenance` insert**  
   Files:
   - [src/components/conflict/ConflictResolutionModal.tsx](/C:/Users/james/Projects/Depo-Pro/src/components/conflict/ConflictResolutionModal.tsx:176)
   - [src/components/ExtractedFieldsTable/ExtractedFieldsTable.tsx](/C:/Users/james/Projects/Depo-Pro/src/components/ExtractedFieldsTable/ExtractedFieldsTable.tsx:720)
   - [src/components/conflict/conflictStore.tsx](/C:/Users/james/Projects/Depo-Pro/src/components/conflict/conflictStore.tsx:332)  
   Trigger:
   - `resolveConflict(...)`
   Write:
   - table: `field_provenance`
   - event type: `conflict_resolved`
   - **fire-and-forget**

7. **UFM metadata build -> no DB write**  
   Files:
   - [src/components/IntakeScreen/UfmPayloadPreview.tsx](/C:/Users/james/Projects/Depo-Pro/src/components/IntakeScreen/UfmPayloadPreview.tsx:98)
   - [src/lib/ufm/buildUfmMetadata.ts](/C:/Users/james/Projects/Depo-Pro/src/lib/ufm/buildUfmMetadata.ts:487)  
   Behavior:
   - `ufm_metadata`, `field_sources`, and `field_confirmations` are built in memory
   - **no persistence call exists**

## 2. Write coupling

There is **no single transaction or RPC** that couples:
- `cases.payload`
- `field_provenance`
- `ufm_metadata`
- `field_sources`
- `field_confirmations`

Observed coupling behavior:

- `cases.payload` is persisted by one awaited `upsert()` to `cases`
- provenance rows are inserted in separate calls from `conflictStore.persistEntry()`
- `persistEntry()` is called without `await` from:
  - `recordExtraction()`
  - `detectConflict()`
  - `resolveConflict()`
  - `recordConfirm()`
- `ufm_metadata`, `field_sources`, and `field_confirmations` are not written at all; they are computed on demand

Partial-failure behavior:

- `saveCase()` errors are surfaced to the user and stop the save path
- `persistEntry()` catches and logs errors, then continues silently from the caller’s point of view
- there is no rollback between `cases` and `field_provenance`
- there is no retry coordination between them

Optimistic/local state:

- Intake local state is updated immediately by reducer actions for extraction, confirmation, and conflict resolution
- conflict/provenance state is also updated immediately in `ConflictProvider`
- neither local state update waits for the corresponding `field_provenance` insert

Conclusion: the system is **not atomically coupled**. It is a classic separated write path, but only one of those writes is in the actual “save case” operation.

## 3. Q1 — Divergence conditions

Concrete divergence points:

1. **Normal-use stale metadata in the live UFM preview**  
   Evidence:
   - `UfmPayloadPreview` reads `activeProvenance` from `CaseContext` in [src/components/IntakeScreen/UfmPayloadPreview.tsx](/C:/Users/james/Projects/Depo-Pro/src/components/IntakeScreen/UfmPayloadPreview.tsx:66)
   - `activeProvenance` is loaded when a case is opened and set via `setActiveProvenance(...)` in [src/context/CaseContext.tsx](/C:/Users/james/Projects/Depo-Pro/src/context/CaseContext.tsx:103)
   - there is no code path updating `activeProvenance` after in-session extraction/confirm/resolve events
   - `ConflictProvider` maintains fresh provenance/history in its own reducer state, but `UfmPayloadPreview` does not read from it

   Result:
   - in a normal session, `record` can be current while `activeProvenance` is stale
   - `buildUfmMetadata()` therefore computes some `field_sources` from stale provenance even without any network failure

   Classification: **normal-use divergence**

2. **Extraction provenance rows can persist even if the case save fails**  
   Evidence:
   - `applyAndPersistExtraction()` first calls `recordExtraction()` / `detectConflict()`, then later `await saveCaseRecord(...)` in [src/components/IntakeScreen/extractionPersistence.ts](/C:/Users/james/Projects/Depo-Pro/src/components/IntakeScreen/extractionPersistence.ts:75)
   - provenance insert failures are swallowed inside `persistEntry()`
   - case save failures are surfaced separately

   Result:
   - `field_provenance` may contain extracted/conflict rows for a case state that never landed in `cases.payload`

   Classification: **failure-only divergence**

3. **Case payload can persist even if provenance inserts fail**  
   Evidence:
   - `persistEntry()` logs and swallows DB errors in [src/components/conflict/conflictStore.tsx](/C:/Users/james/Projects/Depo-Pro/src/components/conflict/conflictStore.tsx:140)
   - `saveCase()` has no awareness of provenance persistence

   Result:
   - case save can succeed while provenance history is missing rows

   Classification: **failure-only divergence**

4. **Conflict resolution can exist in payload before the matching provenance row lands**  
   Evidence:
   - `ConflictResolutionModal` triggers case-side `onResolveConflict(...)` via the table callback chain
   - reducer `"RESOLVE_CONFLICT"` mutates the case record immediately in [src/store/intakeReducer.ts](/C:/Users/james/Projects/Depo-Pro/src/store/intakeReducer.ts:520)
   - provenance `conflict_resolved` insert is separate and fire-and-forget

   Result:
   - a transient mismatch is possible during a normal session
   - a durable mismatch requires failure/interruption

   Classification: **transient normal-use, durable failure-only**

### Q1 answer

**Q1 = (a) normal-use**, because `field_sources` can be stale in normal single-session usage with no failures due to `UfmPayloadPreview` consuming a non-refreshing `activeProvenance` snapshot. Durable persisted DB divergence between `cases.payload` and `field_provenance` is otherwise failure-only.

## 4. Q2 — Provenance nature

### Fully reconstructable from `cases.payload`

1. **`field_confirmations`**  
   Built directly from `ExtractedField.confirmed` flags in [src/lib/ufm/buildUfmMetadata.ts](/C:/Users/james/Projects/Depo-Pro/src/lib/ufm/buildUfmMetadata.ts:597)

2. **Most of `ufm_metadata`**  
   Built from `CaseRecord` values in `buildUfmMetadata()` plus:
   - reporter profile join
   - directory contacts/firms joins
   No DB persistence of the envelope exists.

### Partially reconstructable

3. **`field_sources`**  
   Mixed behavior:
   - direct fields also consult `ExtractedField.source`
   - but `sourceForPath(provenance, path)` is used to distinguish `Notice` vs `Job Sheet` and to source some computed fields like `ufmCustodialAttorney` / `ufmRequestingParty`

   That means exact display/source attribution is **not fully derivable from payload alone** in the current design.

### Independent data

4. **Full provenance history in `field_provenance`**  
   Event log entries such as:
   - `extracted`
   - `conflict_detected`
   - `conflict_resolved`
   - `confirmed`
   - timestamps
   - rejected values/sources
   - resolution user

   This history does not exist in `cases.payload` and cannot be reconstructed from the final saved case state.

### Q2 answer

**Q2 = partial** — `field_confirmations` and most `ufm_metadata` are reconstructable from the case payload, but exact `field_sources` attribution is only partially derivable, and the full provenance audit history is genuinely independent.

## 5. Recommendation

### Chosen path: **(B) derived / co-located provenance**

Why this fits the findings:

1. The current problem is **not** a true “save payload + save UFM metadata” dual-write. There is only one awaited case save write.
2. The live stale-state bug is not transactional; it is architectural. `UfmPayloadPreview` reads an old provenance snapshot.
3. The parts most relevant to Intake/UFM correctness (`field_confirmations`, most `ufm_metadata`) are derived data already.
4. The remaining genuinely independent data is the audit/history log. If it must participate in correctness-sensitive UI state, it should be co-located or refreshed from a single source of truth rather than treated as an asynchronous side-channel.

Why not `(A)`:

- A transactional RPC would not solve the normal-use stale-read problem in `UfmPayloadPreview`
- it also overfits a save path that currently has only one awaited write

Why not `(C)`:

- failure-only acceptance is insufficient because there is already a normal-session stale metadata condition

### Recommended fix (not implemented)

Scoped future change:

1. **Stop treating `activeProvenance` as the live source for UFM preview metadata**
   - either derive source/confirmation metadata directly from the current `record` plus current conflict store state
   - or refresh/co-locate the minimal provenance needed for `field_sources` inside the same `cases.payload` JSONB

2. **Demote `field_provenance` to audit log, not correctness source**
   - keep it for history/review
   - stop requiring it to be current for correct live UFM metadata

Functions likely to change in the future:

- [src/components/IntakeScreen/UfmPayloadPreview.tsx](/C:/Users/james/Projects/Depo-Pro/src/components/IntakeScreen/UfmPayloadPreview.tsx:1)
- [src/lib/ufm/buildUfmMetadata.ts](/C:/Users/james/Projects/Depo-Pro/src/lib/ufm/buildUfmMetadata.ts:1)
- possibly `CaseContext` / `ConflictProvider` integration if a live provenance view is still needed

Freeze safety:

- **yes**, if implemented as:
  - read-time derivation from current in-memory state, or
  - payload-co-located provenance in existing JSONB without schema changes

### Failure-mode test that should accompany the future fix

Add a characterization/integration test that:

1. performs extraction or conflict resolution
2. changes a field source/confirmation
3. saves the case
4. asserts the live UFM preview metadata reflects the updated source/confirmation **without requiring a case reload**

And separately:

1. simulate provenance insert failure
2. simulate successful case save
3. assert load/build uses the correct source of truth and does not reopen a resolved conflict or mislabel sources

### RC status

**Known bounded risk**, not a hard RC blocker.

Reason:

- the core `cases.payload` round-trip remains intact
- the attorney multi-function array survives save/reload
- the main defect is metadata drift/staleness and audit-log coupling, not primary case corruption

## Appendix — files inspected

- [src/components/IntakeScreen/IntakeScreen.tsx](/C:/Users/james/Projects/Depo-Pro/src/components/IntakeScreen/IntakeScreen.tsx:1509)
- [src/api/caseService.ts](/C:/Users/james/Projects/Depo-Pro/src/api/caseService.ts:57)
- [src/components/IntakeScreen/extractionPersistence.ts](/C:/Users/james/Projects/Depo-Pro/src/components/IntakeScreen/extractionPersistence.ts:1)
- [src/components/conflict/conflictStore.tsx](/C:/Users/james/Projects/Depo-Pro/src/components/conflict/conflictStore.tsx:140)
- [src/components/ExtractedFieldsTable/ExtractedFieldsTable.tsx](/C:/Users/james/Projects/Depo-Pro/src/components/ExtractedFieldsTable/ExtractedFieldsTable.tsx:446)
- [src/components/conflict/ConflictResolutionModal.tsx](/C:/Users/james/Projects/Depo-Pro/src/components/conflict/ConflictResolutionModal.tsx:140)
- [src/store/intakeReducer.ts](/C:/Users/james/Projects/Depo-Pro/src/store/intakeReducer.ts:520)
- [src/context/CaseContext.tsx](/C:/Users/james/Projects/Depo-Pro/src/context/CaseContext.tsx:103)
- [src/components/IntakeScreen/UfmPayloadPreview.tsx](/C:/Users/james/Projects/Depo-Pro/src/components/IntakeScreen/UfmPayloadPreview.tsx:66)
- [src/lib/ufm/buildUfmMetadata.ts](/C:/Users/james/Projects/Depo-Pro/src/lib/ufm/buildUfmMetadata.ts:487)
- [src/api/caseLoadService.ts](/C:/Users/james/Projects/Depo-Pro/src/api/caseLoadService.ts:18)
- [src/api/provenanceService.ts](/C:/Users/james/Projects/Depo-Pro/src/api/provenanceService.ts:1)

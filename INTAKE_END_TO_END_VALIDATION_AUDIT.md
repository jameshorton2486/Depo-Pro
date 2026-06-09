# Intake End-to-End Validation Audit

**Date / HEAD:** 2026-06-09 / `4755392`  
**Baseline:** `npm run test` `43/228` pass · `npm run typecheck` pass · `git clean` yes  
**Stream 2 target:** not run (`local` preferred, but local Supabase stack unavailable; no linked non-prod auth token in session)  
**Verdict:** PASS-WITH-RISKS

## RC gate result
- UFM identical after reload? YES — Stream 1 disposable harness produced `ufmEqual=true` and `doubleNormalizeIdempotent=true`.
- Fields lost? none in the valid maximal fixture.
- Fields reconstructed? none in the valid maximal fixture; `normalizeCaseRecord()` was idempotent on the round-tripped record.
- Attorney function arrays survive? YES — array survives unchanged; order is preserved, not canonicalized.
- Provenance + confirmations survive? in-payload confirmations yes · `field_provenance` log separate and not re-proven on disk in this run.

## 1. Workflow trace (8 steps, data structures + persistence layer)

### 1. Notice upload
- The upload panel parses extracted documents and invokes `applyAndPersistExtraction()` after file upload/extraction completes: [src/components/IntakeScreen/DocumentUploadPanel.tsx:538](src/components/IntakeScreen/DocumentUploadPanel.tsx) and [src/components/IntakeScreen/DocumentUploadPanel.tsx:541](src/components/IntakeScreen/DocumentUploadPanel.tsx).
- Uploaded source files are persisted separately through file services, not in `cases.payload`: [src/api/fileService.ts:270](src/api/fileService.ts), [src/api/fileService.ts:318](src/api/fileService.ts).

### 2. Extraction
- Parser output is converted into an `ExtractionApplication` containing `fieldUpdates`, collection adds/patches, conflicts, and derived keyterms: [src/lib/parsing/applyExtraction.ts:62](src/lib/parsing/applyExtraction.ts), [src/lib/parsing/applyExtraction.ts:78](src/lib/parsing/applyExtraction.ts), [src/lib/parsing/applyExtraction.ts:212](src/lib/parsing/applyExtraction.ts).
- Extraction does not write to the database directly. It first dispatches into intake state via `applyExtraction()`: [src/context/IntakeContext.tsx:127](src/context/IntakeContext.tsx), [src/store/intakeReducer.ts:95](src/store/intakeReducer.ts).

### 3. Conflict resolution / confirmation
- The authoritative extracted-field state lives inside `CaseRecord` as `ExtractedField<T> = { value, source, confirmed, conflict, confidence_score }`: [src/types/case.ts:27](src/types/case.ts).
- Conflict resolution and confirmation update the in-memory payload through the intake reducer: [src/context/IntakeContext.tsx:109](src/context/IntakeContext.tsx), [src/context/IntakeContext.tsx:119](src/context/IntakeContext.tsx), [src/store/intakeReducer.ts:127](src/store/intakeReducer.ts).
- The append-only provenance log is a separate UI-layer persistence path through `ConflictProvider`, which dispatches locally and then calls `persistEntry()` to insert into `field_provenance`: [src/components/conflict/conflictStore.tsx:147](src/components/conflict/conflictStore.tsx), [src/components/conflict/conflictStore.tsx:264](src/components/conflict/conflictStore.tsx), [src/components/conflict/conflictStore.tsx:294](src/components/conflict/conflictStore.tsx), [src/components/conflict/conflictStore.tsx:336](src/components/conflict/conflictStore.tsx), [src/components/conflict/conflictStore.tsx:365](src/components/conflict/conflictStore.tsx).
- Open conflicts are reconstructed from provenance rows, not from the payload itself: [src/lib/conflicts/deriveOpenConflicts.ts:35](src/lib/conflicts/deriveOpenConflicts.ts).

### 4. UFM preview build
- `UfmPayloadPreview` builds the envelope in memory from the current `record`, `activeProvenance`, reporter profile, directory contacts, and directory firms: [src/components/IntakeScreen/UfmPayloadPreview.tsx:64](src/components/IntakeScreen/UfmPayloadPreview.tsx), [src/components/IntakeScreen/UfmPayloadPreview.tsx:98](src/components/IntakeScreen/UfmPayloadPreview.tsx).
- `buildUfmMetadata()` is pure and synchronous: [src/lib/ufm/buildUfmMetadata.ts:487](src/lib/ufm/buildUfmMetadata.ts), with direct tests proving it remains synchronous: [src/lib/ufm/buildUfmMetadata.test.ts:373](src/lib/ufm/buildUfmMetadata.test.ts).
- Attorney functions, representation, reporter certificate fields, and appearance labels all flow through this builder: [src/lib/ufm/buildUfmMetadata.ts:259](src/lib/ufm/buildUfmMetadata.ts), [src/lib/ufm/buildUfmMetadata.ts:543](src/lib/ufm/buildUfmMetadata.ts), [src/lib/ufm/buildUfmMetadata.ts:551](src/lib/ufm/buildUfmMetadata.ts).

### 5. Save case
- Save is a single awaited `cases` upsert of the full `CaseRecord` blob into `cases.payload`: [src/components/IntakeScreen/IntakeScreen.tsx:1511](src/components/IntakeScreen/IntakeScreen.tsx), [src/components/IntakeScreen/IntakeScreen.tsx:1528](src/components/IntakeScreen/IntakeScreen.tsx), [src/api/caseService.ts:74](src/api/caseService.ts), [src/api/caseService.ts:78](src/api/caseService.ts).
- `saveCase()` writes `payload: record` directly; there is no second case-save write for UFM metadata or confirmations: [src/api/caseService.ts:47](src/api/caseService.ts), [src/api/caseService.ts:53](src/api/caseService.ts), [src/api/caseService.ts:80](src/api/caseService.ts).
- Extraction persistence explicitly applies extraction, records provenance events, then saves once: [src/components/IntakeScreen/extractionPersistence.ts:97](src/components/IntakeScreen/extractionPersistence.ts), [src/components/IntakeScreen/extractionPersistence.ts:108](src/components/IntakeScreen/extractionPersistence.ts), [src/components/IntakeScreen/extractionPersistence.ts:121](src/components/IntakeScreen/extractionPersistence.ts).

### 6. Reload case
- `loadCase()` selects only `payload` from `cases` and passes it through `normalizeCaseRecord()`: [src/api/caseService.ts:86](src/api/caseService.ts), [src/api/caseService.ts:95](src/api/caseService.ts), [src/lib/normalizeCaseRecord.ts:3](src/lib/normalizeCaseRecord.ts).
- `loadCaseBundle()` reloads the normalized record plus files, audio, transcripts, and provenance in parallel: [src/api/caseLoadService.ts:18](src/api/caseLoadService.ts), [src/api/caseLoadService.ts:19](src/api/caseLoadService.ts), [src/api/caseLoadService.ts:31](src/api/caseLoadService.ts).
- `CaseContext` stores that bundle and passes `initialRecord` and `initialProvenance` into the mounted editor shell: [src/context/CaseContext.tsx:62](src/context/CaseContext.tsx), [src/context/CaseContext.tsx:74](src/context/CaseContext.tsx), [src/context/CaseContext.tsx:110](src/context/CaseContext.tsx), [src/components/DepoEditor.tsx:173](src/components/DepoEditor.tsx), [src/components/DepoEditor.tsx:196](src/components/DepoEditor.tsx).

### 7. Rehydrated intake state
- Intake state is re-seeded from the loaded normalized record through `loadCase()` in `IntakeContext`: [src/context/IntakeContext.tsx:63](src/context/IntakeContext.tsx), [src/context/IntakeContext.tsx:64](src/context/IntakeContext.tsx).

### 8. UFM preview after reload
- The post-reload preview rebuilds from the reloaded `record` and `activeProvenance` using the same `buildUfmMetadata()` seam as before save: [src/components/IntakeScreen/UfmPayloadPreview.tsx:98](src/components/IntakeScreen/UfmPayloadPreview.tsx), [src/lib/ufm/buildUfmMetadata.ts:487](src/lib/ufm/buildUfmMetadata.ts).

## 2. Existing-test coverage (what's proven green vs gaps)

Targeted green run:

```text
npx vitest run src/types/case.rolePreservation.test.ts src/lib/ufm/buildUfmMetadata.test.ts src/store/intakeReducer.participantProvenance.test.ts src/api/caseLoadService.test.ts src/components/IntakeScreen/hydration.test.ts src/components/IntakeScreen/extractionPersistence.test.ts

Test Files  6 passed (6)
Tests      28 passed (28)
```

What existing green tests already prove:
- `src/types/case.rolePreservation.test.ts`
  - multi-role same-name attorneys are not collapsed
  - multi-function attorney arrays survive normalization
  - UFM emits those functions independently of representation
- `src/lib/ufm/buildUfmMetadata.test.ts`
  - reporter certificate fields populate correctly
  - appearance labels flow through
  - directory enrichment works
  - attorney multi-function arrays emit into UFM appearances unchanged
- `src/store/intakeReducer.participantProvenance.test.ts`
  - participant add/remove does not append in-payload provenance
  - confirms provenance logging is a separate layer, not hidden inside `CaseRecord`
- `src/api/caseLoadService.test.ts`
  - bundle hydration returns normalized payload + provenance/files/audio/transcripts together
  - legacy witness payloads survive normalization on load
- `src/components/IntakeScreen/hydration.test.ts`
  - persisted bundle vs blank-case hydration branch is correct
- `src/components/IntakeScreen/extractionPersistence.test.ts`
  - extraction applies, writes provenance callbacks, and triggers exactly one save

Coverage gaps that Stream 1 had to fill:
- no existing test proved `buildUfmMetadata(record) === buildUfmMetadata(normalizeCaseRecord(JSON.parse(JSON.stringify(record))))` for a maximal case
- no existing test proved double-normalization idempotency and UFM equality in the same end-to-end harness

## 3. Schema evidence (migration parity, drift, column shape)

Stream 2 live schema checks were only partially available.

CLI/tool status:
- `supabase --version` → `2.75.0`
- `supabase status -o json` failed because the local Docker-backed Supabase stack is not running on this machine.
- `supabase migration list --local` failed because no local Postgres listener was available.
- `supabase migration list --linked` failed because no `SUPABASE_ACCESS_TOKEN` / `supabase login` session was present.

Because of that, migration parity and live drift were **not** proven against a running database in this audit.

Static schema contract evidence from generated DB types and migrations:
- `cases.payload` exists as `Json` in the generated DB types: [src/types/database.ts:189](src/types/database.ts), [src/types/database.ts:195](src/types/database.ts)
- `field_provenance` includes the columns used by `persistEntry()` and `deriveOpenConflicts()`:
  - `field_path`, `event_type`, `value`, `winning_value`, `rejected_value`, `rejected_source`, `confidence_score`, `resolved_at`: [src/types/database.ts:308](src/types/database.ts)
- The migration files define:
  - `cases.payload jsonb not null default '{}'::jsonb`: `supabase/migrations/20260603210000_create_core_schema.sql`
  - `field_provenance` plus `winning_value`, `rejected_value`, `confidence_score`, `resolved_at`: `supabase/migrations/20260602163903_create_field_provenance_table.sql`

## 4. On-disk corroboration (redacted structure/keys/counts) | not run

Not run.

Reason:
- local Supabase stack unavailable (`supabase status -o json` could not reach Docker/local Postgres)
- no linked non-prod auth token in the session
- no designated non-prod fixture `case_id` was supplied for read-only inspection

## 5. Round-trip idempotency proof (harness output)

Because no existing green test proved the exact RC gate, I ran a disposable offline harness against the real `normalizeCaseRecord()` and `buildUfmMetadata()` implementations using a fabricated maximal `CaseRecord` with:
- a multi-function attorney array
- independent `representing`
- witness, interpreter, videographer, participant, reporter, law-firm, confirmation, and provenance data
- directory contacts/firms for appearance-label and enrichment joins

Harness output:

```text
=== Round-trip Equality ===
recordEqual=true
ufmEqual=true
doubleNormalizeIdempotent=true

=== Record diffs ===
[]

=== UFM diffs ===
[]

=== Double-normalization diffs ===
[]
```

Interpretation:
- JSON serialization + `normalizeCaseRecord()` did not lose or mutate any field in the valid maximal fixture.
- `buildUfmMetadata()` emitted an identical envelope before and after reload normalization.
- Double-normalization was idempotent.

Important correction to an earlier assumption:
- attorney function arrays are **not** canonicalized on load.
- `normalizeAttorneyFunctionArray()` is only used as a validity check inside `normalizeAttorneyFunction()`, and `normalizeExtractedField()` preserves the original valid array order: [src/types/case.ts:596](src/types/case.ts), [src/types/case.ts:926](src/types/case.ts), [src/types/case.ts:971](src/types/case.ts).

## 6. The 7 determination questions — verdicts + evidence

1. **Which data structures are created?**  
   Extraction creates an `ExtractionApplication`; intake state holds a `CaseRecord`; conflict UI holds `FieldProvenanceRow[]`; UFM preview builds an in-memory `UfmMetadataEnvelope`. Evidence: [src/lib/parsing/applyExtraction.ts:62](src/lib/parsing/applyExtraction.ts), [src/types/case.ts:27](src/types/case.ts), [src/api/caseLoadService.ts:10](src/api/caseLoadService.ts), [src/lib/ufm/buildUfmMetadata.ts:487](src/lib/ufm/buildUfmMetadata.ts).

2. **Which persistence layers are used?**  
   `CaseRecord` persists atomically in `cases.payload`; provenance history persists separately in `field_provenance`; uploaded files/audio persist in storage-backed tables. Evidence: [src/api/caseService.ts:74](src/api/caseService.ts), [src/components/conflict/conflictStore.tsx:147](src/components/conflict/conflictStore.tsx), [src/api/fileService.ts:270](src/api/fileService.ts), [src/api/fileService.ts:318](src/api/fileService.ts).

3. **Are any fields lost across save→reload?**  
   Not in the valid maximal offline fixture; `recordEqual=true` and `Record diffs` was empty. Evidence: Stream 1 harness output above.

4. **Are any fields reconstructed/changed by normalization?**  
   Not in the valid maximal offline fixture; double-normalization was idempotent and produced no diffs. Evidence: Stream 1 harness output above and [src/types/case.test.ts:121](src/types/case.test.ts).

5. **Can the UFM payload change after reload?**  
   Not for the valid maximal offline fixture; `ufmEqual=true` with an empty UFM diff. Evidence: Stream 1 harness output above.

6. **Do attorney function arrays survive the entire cycle?**  
   Yes. The multi-function array survived as an array, and UFM emission remained identical after reload. Order is preserved, not canonicalized. Evidence: Stream 1 harness output above, [src/types/case.rolePreservation.test.ts:106](src/types/case.rolePreservation.test.ts), [src/lib/ufm/buildUfmMetadata.test.ts:494](src/lib/ufm/buildUfmMetadata.test.ts), [src/types/case.ts:596](src/types/case.ts), [src/types/case.ts:971](src/types/case.ts).

7. **Do provenance and confirmations survive the cycle?**  
   In-payload confirmations yes: they are part of `ExtractedField<T>` inside `cases.payload` and were preserved in the round-trip harness. The separate `field_provenance` log is a distinct append-only layer loaded via `loadCaseBundle()`; it was not re-proven on a live database in this run because Stream 2 was unavailable. Evidence: [src/types/case.ts:27](src/types/case.ts), [src/api/caseService.ts:74](src/api/caseService.ts), [src/api/caseLoadService.ts:18](src/api/caseLoadService.ts), [src/api/provenanceService.ts:30](src/api/provenanceService.ts).

## Appendix — files inspected, SQL run (redacted), harness (since deleted)

Files inspected:
- `src/components/IntakeScreen/DocumentUploadPanel.tsx`
- `src/components/IntakeScreen/extractionPersistence.ts`
- `src/context/IntakeContext.tsx`
- `src/store/intakeReducer.ts`
- `src/types/case.ts`
- `src/api/caseService.ts`
- `src/api/caseLoadService.ts`
- `src/api/provenanceService.ts`
- `src/context/CaseContext.tsx`
- `src/components/DepoEditor.tsx`
- `src/components/conflict/conflictStore.tsx`
- `src/lib/conflicts/deriveOpenConflicts.ts`
- `src/components/IntakeScreen/UfmPayloadPreview.tsx`
- `src/lib/ufm/buildUfmMetadata.ts`
- `src/types/database.ts`
- `supabase/migrations/20260602163903_create_field_provenance_table.sql`
- `supabase/migrations/20260603210000_create_core_schema.sql`

Supabase CLI commands run:
- `supabase --version`
- `supabase migration list --help`
- `supabase db diff --help`
- `supabase status --help`
- `supabase status -o json` → failed: local stack unavailable
- `supabase migration list --local` → failed: local DB unavailable
- `supabase migration list --linked` → failed: no access token

Harness:
- disposable file created at `scripts/_audit_scratch/roundtrip.audit.ts`
- executed with `npx tsx scripts/_audit_scratch/roundtrip.audit.ts`
- deleted before commit

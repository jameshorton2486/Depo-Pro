# Intake Real vs. Mock Audit

## Dashboard-Oriented Summary
This report is structured as a status board for the Intake Case Assembly Engine.

### Status legend
- `REAL`: writes/reads real Supabase state in this repo
- `MOCK`: driven by fixtures or MSW, not by the real case package
- `MISSING`: UI exists or model exists, but no durable workflow exists
- `MIXED`: real persistence boundary exists, but the visible data is still partly mock-seeded

## Status Table

| Subsystem | Intake responsibility type | Current status | Source of truth today | Evidence | Dashboard truthfulness |
|---|---|---|---|---|---|
| Case package row (`cases.payload`) | Collect / assemble | `REAL` | Supabase `cases.payload` | `saveCase(record)` upserts the whole record; `loadCase(caseId)` reads it back. `src/api/caseService.ts:12-40` | Truthful when a save occurs |
| Contact library | Collect reusable people/orgs | `REAL` | Supabase `contacts` | `createContact`, `searchContacts`, `updateContact`. `src/api/contactService.ts:21-97` | Truthful |
| Field provenance history | Human-review audit trail | `REAL` | Supabase `field_provenance` | `persistEntry(entry)` inserts, `fetchHistory(...)` reads. `src/components/conflict/conflictStore.tsx:123-178` | Truthful |
| Visible extracted metadata on Intake | Human-review input | `MIXED` | Mock seed unless persisted row exists | Hydration falls back to `mockCaseRecord` in DEV. `src/components/IntakeScreen/IntakeScreen.tsx:1020-1034`, `src/components/ExtractedFieldsTable/mockRecord.ts:14-115` | Can look real while still fixture-backed |
| Attorney cards already on a mock row | Collect | `MIXED` | `cases.payload` if saved, otherwise mock fallback | Mock row ships two attorneys. `src/components/ExtractedFieldsTable/mockRecord.ts:78-99` | Can look complete even before real user collection |
| Interpreter/videographer/participant contact create/select/save chain | Collect | `REAL` | `contacts` plus `cases.payload` | UI uses `create(...)` and reducer-backed add actions; case save persists the record. `src/components/IntakeScreen/IntakeScreen.tsx:357-379`, `src/components/IntakeScreen/IntakeScreen.tsx:556-590`, `src/api/caseService.ts:12-29` | Truthful when saved |
| Attorney add from empty picker | Collect | `MISSING` | None | Empty-state picker calls `handleSelect("attorney", ...)`, but no attorney branch exists. `src/components/IntakeScreen/IntakeScreen.tsx:556-592`, `src/components/IntakeScreen/IntakeScreen.tsx:697-702` | Current UI suggests capability it does not actually provide |
| Notice / scheduling / supporting / audio uploads | Collect artifacts | `MISSING` | Component-local `slots` state only | `DocumentUploadPanel` stores `File` objects only in local state. `src/components/IntakeScreen/IntakeScreen.tsx:247-314` | Not truthful as durable assembly |
| `CaseRecord.audio` | Collect artifact metadata | `MISSING` | Never written by Intake | Type exists, schema exists, Intake never sets it. `src/types/case.ts:227-235`, `supabase/migrations/20260603210000_create_core_schema.sql:67-91`, `src/components/IntakeScreen/IntakeScreen.tsx:247-314` | No live signal |
| Keyterm seed list | Generate-side planning | `MOCK` | Hardcoded `SEED_KEYTERMS` in `DepoEditor` | `KeytermProvider` gets `initialTerms={SEED_KEYTERMS}`. `src/components/DepoEditor.tsx:22-68`, `src/components/DepoEditor.tsx:137-145` | Not truthful as case-specific collected data |
| Keyterm edits on Intake | Generate-side planning | `MISSING` durable path | In-memory `KeytermProvider` only | No persistence from keyterm reducer into `CaseRecord` or Supabase. `src/components/DeepgramKeytermManager/keytermStore.tsx:18-24`, `src/components/DeepgramKeytermManager/keytermStore.tsx:147-216` | Not durable |
| Deepgram request preview | Generate-side planning | `MOCK` / local | Hardcoded base params + in-memory selected terms | `BASE_PARAMS` and `useKeyterms()` drive the preview. `src/components/DeepgramKeytermManager/DeepgramPayloadPreview.tsx:27-90` | Not truthful as saved downstream contract |
| Intake readiness banner | Gate / validation | `MIXED` | Reducer validation plus conflict store only | Ignores unconfirmed fields. `src/components/IntakeScreen/IntakeScreen.tsx:135-176`, `src/store/intakeReducer.ts:674-717` | Can show green while human review is incomplete |
| Intake Gate 1 checklist | Gate / validation | `MIXED` | Local derived booleans | Audio is hardcoded false; “case record created” means only “case name exists.” `src/components/IntakeScreen/IntakeScreen.tsx:1055-1071` | Partly misleading |
| Transcript document load/save/review | Generate outputs | `MOCK` | MSW handlers and dev local storage | `main.tsx` starts mocks in DEV; `api/client.ts` feeds transcript calls; handlers return mock docs and persist dev-only state locally. `src/main.tsx:13-26`, `src/api/client.ts:42-70`, `src/mocks/handlers.ts:101-159`, `src/mocks/handlers.ts:240-316` | Not Intake-real |
| Transcript media playback | Generate outputs | `MOCK` | MSW-generated WAV | `handlers.ts` serves `mock-audio`. `src/mocks/handlers.ts:19-72`, `src/mocks/handlers.ts:248-250` | Not Intake-real |
| UFM payload generation | Generate later from collected package | `MISSING` | None on Intake | Placeholder button only. `src/components/IntakeScreen/IntakeScreen.tsx:922-929` | Not implemented |

## Real Intake Persistence Boundary
- The real Intake boundary today is three Supabase-backed stores: `cases`, `contacts`, and `field_provenance`. `src/api/caseService.ts:12-40`, `src/api/contactService.ts:4-97`, `src/components/conflict/conflictStore.tsx:123-178`
- `cases` already contains a full JSON package (`payload jsonb`), so the real durable contract is broader than the visible UI currently exploits. `supabase/migrations/20260603210000_create_core_schema.sql:38-65`

## Mock Boundary
- Transcript/editor APIs still go through the central `api/client.ts` fetch module and are mocked in DEV by MSW. `src/api/client.ts:42-70`, `src/main.tsx:13-26`, `src/mocks/handlers.ts:240-316`
- Intake is the exception: it bypasses `api/client.ts` and goes straight to Supabase through `caseService`, `contactService`, and `ConflictProvider`. `src/api/client.ts:1-36`, `src/api/caseService.ts:1-40`, `src/api/contactService.ts:1-97`, `src/components/conflict/conflictStore.tsx:123-178`

## Missing Workflow Boundary
- The upload panel visually implies durable case-assembly of intake docs and media, but no persistence path exists. `src/components/IntakeScreen/IntakeScreen.tsx:247-314`
- `case_audio` exists in schema but is unused by Intake. `supabase/migrations/20260603210000_create_core_schema.sql:67-91`
- The case storage spec expects `case.json`, `keyterms.json`, intake docs, audio, and transcript outputs as distinct artifacts; current Intake only durably assembles the `case.json` equivalent. `docs/architecture/CASE_STORAGE_SPEC.md:17-30`

## Human-In-The-Loop Status
- `REAL`: provenance event persistence for confirm/resolve actions. `src/components/conflict/conflictStore.tsx:301-355`
- `MIXED`: visible extracted state already includes pre-confirmed extracted values from `mockCaseRecord`, which violates the strict extract → confidence → human confirms rule at the initial-state level. `src/components/ExtractedFieldsTable/mockRecord.ts:21-24`, `src/components/ExtractedFieldsTable/mockRecord.ts:29-37`, `src/components/ExtractedFieldsTable/mockRecord.ts:68-72`, `src/components/ExtractedFieldsTable/mockRecord.ts:80-85`

## Bottom Line For A Live Status Dashboard
- `REAL NOW`: case row persistence, contact persistence, provenance persistence.
- `MOCK NOW`: extracted seeds, transcript/media/editor workflows, keyterm seed content.
- `MISSING NOW`: durable intake-file assembly, durable audio state in the case package, true Transcript-Creation request contract, UFM payload generation, empty-state attorney add.
- `WATCH CLOSELY`: green Intake status indicators, because they currently overstate package completeness and human-review completion. `src/components/IntakeScreen/IntakeScreen.tsx:135-176`, `src/components/IntakeScreen/IntakeScreen.tsx:1055-1071`

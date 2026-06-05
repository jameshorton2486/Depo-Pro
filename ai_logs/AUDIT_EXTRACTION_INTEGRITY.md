# Extraction Integrity & Case Contamination Audit

Date: 2026-06-05  
Scope: Audit only. No code changes. Live Supabase reads only.

## Section 1 — `job_demo_001` row, field by field

Live `cases` query for `case_id = 'job_demo_001'` shows a real persisted row last updated at `2026-06-05T18:35:36.809548+00:00`. The row is not a fresh extraction of the uploaded Texas PDF. It is a mixed row containing:

- previously saved extracted-looking values
- manual edits
- one applied value from the Texas extraction

Table below covers the populated fields visible on Intake.

| Field | Screen value | Flags / metadata | Origin | Evidence |
| --- | --- | --- | --- | --- |
| `caption.case_name` | `Smith v. Meridian Infrastructure Partners` | source `extracted`, confirmed `true`, confidence `0.97` | `UNKNOWN` | Live payload. Does not match `mockCaseRecord` [src/components/ExtractedFieldsTable/mockRecord.ts](C:/Users/james/projects/depo-pro/src/components/ExtractedFieldsTable/mockRecord.ts:22). |
| `caption.case_style` | `1234` | source `manual`, confirmed `true` | `MANUAL_EDIT` | Live payload source is manual. |
| `caption.case_number` | `2024-CV-08821` | source `extracted`, confirmed `true`, confidence `0.91` | `MOCK_SEED` | Exact match to [mockRecord.ts](C:/Users/james/projects/depo-pro/src/components/ExtractedFieldsTable/mockRecord.ts:24). |
| `caption.court_name` | `Superior Court of California, County of Los Angeles` | source `extracted`, confirmed `true`, confidence `0.88` | `UNKNOWN` | Live payload. Does not match `mockCaseRecord` court name at [mockRecord.ts](C:/Users/james/projects/depo-pro/src/components/ExtractedFieldsTable/mockRecord.ts:25). |
| `caption.county` | `Bexar County` | source `manual`, confirmed `true` | `MANUAL_EDIT` | Live payload source is manual. |
| `caption.venue` | `Civil` | source `manual`, confirmed `true` | `MANUAL_EDIT` | Live payload source is manual. |
| `caption.department` | `Dept. 32` | source `extracted`, confirmed `true`, confidence `0.73` | `UNKNOWN` | Live payload. `mockCaseRecord` department is `null` at [mockRecord.ts](C:/Users/james/projects/depo-pro/src/components/ExtractedFieldsTable/mockRecord.ts:28). |
| `session.deposition_date` | `2026-06-10` | source `extracted`, confirmed `true`, confidence `0.99` | `MOCK_SEED` | Exact match to [mockRecord.ts](C:/Users/james/projects/depo-pro/src/components/ExtractedFieldsTable/mockRecord.ts:33). |
| `session.start_time` | `09:30` | source `extracted`, confirmed `true`, confidence `0.82` | `MOCK_SEED` | Exact match to [mockRecord.ts](C:/Users/james/projects/depo-pro/src/components/ExtractedFieldsTable/mockRecord.ts:35). |
| `session.location_address` | `350 S. Grand Avenue` | source `extracted`, confirmed `true`, confidence `0.85` | `UNKNOWN` | Live payload. `mockCaseRecord` has a different address at [mockRecord.ts](C:/Users/james/projects/depo-pro/src/components/ExtractedFieldsTable/mockRecord.ts:37). |
| `session.location_city` | `Los Angeles` | source `extracted`, confirmed `true`, confidence `0.96` | `UNKNOWN` | Live payload. `mockCaseRecord` city is `Dallas` at [mockRecord.ts](C:/Users/james/projects/depo-pro/src/components/ExtractedFieldsTable/mockRecord.ts:38). |
| `session.location_state` | `CA` | source `extracted`, confirmed `true`, confidence `0.98` | `UNKNOWN` | Live payload. `mockCaseRecord` state is `TX` at [mockRecord.ts](C:/Users/james/projects/depo-pro/src/components/ExtractedFieldsTable/mockRecord.ts:40). |
| `session.location_zip` | `90071` | source `extracted`, confirmed `true`, confidence `0.71` | `UNKNOWN` | Live payload. `mockCaseRecord` ZIP is `75201` at [mockRecord.ts](C:/Users/james/projects/depo-pro/src/components/ExtractedFieldsTable/mockRecord.ts:41). |
| `session.location_county` | `Bexar County` | source `manual`, confirmed `true` | `MANUAL_EDIT` | Live payload source is manual. |
| `session.reporting_method` | `In Person` | source `manual`, confirmed `true` | `MANUAL_EDIT` | Live payload source is manual. |
| `reporter.name` | `Jennifer L. Castillo, CSR` | source `imported`, confirmed `true` | `MOCK_SEED` | Exact match to [mockRecord.ts](C:/Users/james/projects/depo-pro/src/components/ExtractedFieldsTable/mockRecord.ts:58). |
| `reporter.firm` | `Pacific Reporting Services` | source `imported`, confirmed `true` | `UNKNOWN` | Live payload. `mockCaseRecord` firm is `Lone Star Reporting` at [mockRecord.ts](C:/Users/james/projects/depo-pro/src/components/ExtractedFieldsTable/mockRecord.ts:61). |
| `reporter.cert_state` | `CA` | source `imported`, confirmed `true` | `UNKNOWN` | Live payload. `mockCaseRecord` cert state is `TX` at [mockRecord.ts](C:/Users/james/projects/depo-pro/src/components/ExtractedFieldsTable/mockRecord.ts:60). |
| `reporter.cert_number` | `CSR-14872` | source `imported`, confirmed `true` | `UNKNOWN` | Live payload. `mockCaseRecord` cert number is `CSR 12876` at [mockRecord.ts](C:/Users/james/projects/depo-pro/src/components/ExtractedFieldsTable/mockRecord.ts:59). |
| `witnesses[0].name` | `Junior Hernandez` | source `extracted`, confirmed `true`, confidence `0.79` | `MOCK_SEED` | Exact match to [mockRecord.ts](C:/Users/james/projects/depo-pro/src/components/ExtractedFieldsTable/mockRecord.ts:77). |
| `witnesses[0].title` | `Senior VP, Operations` | source `extracted`, confirmed `true`, confidence `0.68` | `MOCK_SEED` | Exact match to [mockRecord.ts](C:/Users/james/projects/depo-pro/src/components/ExtractedFieldsTable/mockRecord.ts:79). |
| `witnesses[0].employer` | `Meridian Infrastructure Partners` | source `extracted`, confirmed `true`, confidence `0.91` | `MOCK_SEED` | Exact match to [mockRecord.ts](C:/Users/james/projects/depo-pro/src/components/ExtractedFieldsTable/mockRecord.ts:80). |
| `witnesses[0].party_affiliation` | `plaintiff` | source `extracted`, confirmed `false`, confidence `1` | `GARZA_EXTRACTION` | Live payload plus same-batch provenance row `event_type = extracted`, `resolved_at = 2026-06-05T18:35:36.485+00:00`. |
| `attorneys` | empty array | no attorney payload rows | `UNKNOWN` | Live payload contains no current attorney rows. |

Finding: `job_demo_001` is not “all mock data.” It is a polluted persisted row containing some exact mock-seed matches, some later manual edits, and some unrelated extracted/imported values that do not match the current fixture file.

## Section 2 — Where did the Garza / Goldman-Peterson extraction go?

### 2.1 Provenance rows from the Texas upload batch

Live `field_provenance` query for `job_demo_001` in the extraction window `2026-06-05T18:35:36.000Z` to `2026-06-05T18:35:37.000Z` returned these rows:

| Time | Field | Event | Winning / current value | Rejected / incoming value | Source |
| --- | --- | --- | --- | --- | --- |
| `18:35:36.485Z` | `witnesses[0].party_affiliation` | `extracted` | `plaintiff` | — | `Notice` |
| `18:35:36.486Z` | `caption.case_number` | `conflict_detected` | `2024-CV-08821` | `C-1628-25-E` | `Notice` |
| `18:35:36.486Z` | `witnesses[0].name` | `conflict_detected` | `Junior Hernandez` | `MARIA L. LOPEZ DE MARTINEZ` | `Notice` |
| `18:35:36.486Z` | `session.location_county` | `conflict_detected` | `Bexar County` | `HIDALGO COUNTY` | `Manual` vs `Notice` |
| `18:35:36.486Z` | `caption.court_name` | `conflict_detected` | `Superior Court of California, County of Los Angeles` | `DISTRICT COURT, 275TH JUDICIAL DISTRICT` | `Notice` |
| `18:35:36.486Z` | `session.deposition_date` | `conflict_detected` | `2026-06-10` | `2026-05-07` | `Notice` |
| `18:35:36.486Z` | `caption.venue` | `conflict_detected` | `Civil` | `275TH JUDICIAL DISTRICT` | `Manual` vs `Notice` |
| `18:35:36.486Z` | `session.reporting_method` | `conflict_detected` | `In Person` | `zoom` | `Manual` vs `Notice` |
| `18:35:36.486Z` | `session.location_address` | `conflict_detected` | `350 S. Grand Avenue` | `Remote via Zoom` | `Notice` |
| `18:35:36.486Z` | `caption.county` | `conflict_detected` | `Bexar County` | `HIDALGO COUNTY` | `Manual` vs `Notice` |
| `18:35:36.486Z` | `caption.case_style` | `conflict_detected` | `1234` | `MARIA L. LOPEZ DE MARTINEZ AND ALFREDO MONTES NAVARRO v. RAFAEL ROBLES CALDERON AND ALL AMERICAN HEAVY EQUIPMENT LEASING, LLC` | `Manual` vs `Notice` |
| `18:35:36.486Z` | `session.start_time` | `conflict_detected` | `09:30` | `10:00` | `Notice` |

Recovered summary from provenance and the summary builder:

- `appliedCount = 1`
- `conflictCount = 11`

That aligns with [extractionPersistence.ts](C:/Users/james/projects/depo-pro/src/components/IntakeScreen/extractionPersistence.ts:55) through [extractionPersistence.ts](C:/Users/james/projects/depo-pro/src/components/IntakeScreen/extractionPersistence.ts:64).

### 2.2 Ground-truth Texas values: present or absent

| Ground-truth value | Status | Evidence |
| --- | --- | --- |
| `C-1628-25-E` | `PRESENT as conflict alternate` | `caption.case_number` rejected value in provenance batch. |
| `275th Judicial District` / Texas court | `PRESENT as conflict alternate` | `caption.court_name` rejected value `DISTRICT COURT, 275TH JUDICIAL DISTRICT`. |
| `Hidalgo County, Texas` | `PRESENT as conflict alternate` | `caption.county` and `session.location_county` rejected value `HIDALGO COUNTY`. |
| Full Texas case style | `PRESENT as conflict alternate` | `caption.case_style` rejected value matches the Texas style. |
| `2026-05-07` | `PRESENT as conflict alternate` | `session.deposition_date` rejected value. |
| `10:00 AM` | `PRESENT as conflict alternate` | `session.start_time` rejected value `10:00`. |
| `Maria L. Lopez De Martinez` | `PRESENT as conflict alternate` | `witnesses[0].name` rejected value. |
| `Alfredo Montes Navarro` | `ABSENT` | No payload field, no provenance row, no conflict row in the batch. |
| `Raul Garza` | `ABSENT` | No attorney payload rows, no provenance rows for attorney adds or patches in this batch. |
| `Gregory J. Peterson` | `ABSENT` | Same as above. |
| `Derek I. Salinas` | `ABSENT` | Same as above. |
| `Zoom` / remote | `PRESENT as conflict alternate` | `session.reporting_method = zoom` and `session.location_address = Remote via Zoom` both recorded as rejected values. |
| `SA Legal Solutions` reporter | `ABSENT` | No reporter provenance row from this batch; persisted reporter fields remain unrelated prior values. |

### 2.3 Collision path and where the losing value lives

When an incoming extracted value hits a confirmed existing field, the parser does not overwrite the payload. It queues a conflict instead:

- [applyExtraction.ts](C:/Users/james/projects/depo-pro/src/lib/parsing/applyExtraction.ts:362) through [applyExtraction.ts](C:/Users/james/projects/depo-pro/src/lib/parsing/applyExtraction.ts:402): `queueField()` compares the incoming value with the current record field. If `current.confirmed && !isEmpty(current.value)`, it pushes an `ExtractionConflict` and returns without adding a field update.
- [extractionPersistence.ts](C:/Users/james/projects/depo-pro/src/components/IntakeScreen/extractionPersistence.ts:89) through [extractionPersistence.ts](C:/Users/james/projects/depo-pro/src/components/IntakeScreen/extractionPersistence.ts:112): `applyAndPersistExtraction()` applies non-conflicting updates, records extracted fields, persists each conflict via `detectConflict()`, then saves the current case.
- [conflictStore.tsx](C:/Users/james/projects/depo-pro/src/components/conflict/conflictStore.tsx:264) through [conflictStore.tsx](C:/Users/james/projects/depo-pro/src/components/conflict/conflictStore.tsx:296): `detectConflict()` creates an `ActiveConflict`, stores it in in-memory `state.active`, and writes a `field_provenance` row.
- [conflictStore.tsx](C:/Users/james/projects/depo-pro/src/components/conflict/conflictStore.tsx:123) through [conflictStore.tsx](C:/Users/james/projects/depo-pro/src/components/conflict/conflictStore.tsx:139): provenance is durably inserted into Supabase.

Where the losing value lives:

- durably: `field_provenance.rejected_value`
- in memory during the session: `ConflictStore.state.active`
- not in the case payload: the payload keeps the winning preexisting field value

### 2.4 Does the losing value survive refresh?

Durably in the database: **yes**.  
Durably in the visible Intake conflict UI: **no, not currently**.

Evidence:

- Conflict state initializes empty on mount at [conflictStore.tsx](C:/Users/james/projects/depo-pro/src/components/conflict/conflictStore.tsx:106) through [conflictStore.tsx](C:/Users/james/projects/depo-pro/src/components/conflict/conflictStore.tsx:112).
- `selectActiveConflicts()` only reflects current in-memory `state.active` at [conflictStore.tsx](C:/Users/james/projects/depo-pro/src/components/conflict/conflictStore.tsx:411).
- History can be reloaded from Supabase only when a field path is explicitly requested through `fetchHistory()` / `loadHistory()` at [conflictStore.tsx](C:/Users/james/projects/depo-pro/src/components/conflict/conflictStore.tsx:141) through [conflictStore.tsx](C:/Users/james/projects/depo-pro/src/components/conflict/conflictStore.tsx:149) and [conflictStore.tsx](C:/Users/james/projects/depo-pro/src/components/conflict/conflictStore.tsx:367) through [conflictStore.tsx](C:/Users/james/projects/depo-pro/src/components/conflict/conflictStore.tsx:369).
- The table’s projected conflict alternate comes only from the `conflictAlternates` prop at [fieldProjection.ts](C:/Users/james/projects/depo-pro/src/components/ExtractedFieldsTable/fieldProjection.ts:112) through [fieldProjection.ts](C:/Users/james/projects/depo-pro/src/components/ExtractedFieldsTable/fieldProjection.ts:122).
- Intake currently passes the empty `mockConflictAlternates` object into the table at [IntakeScreen.tsx](C:/Users/james/projects/depo-pro/src/components/IntakeScreen/IntakeScreen.tsx:1513) through [IntakeScreen.tsx](C:/Users/james/projects/depo-pro/src/components/IntakeScreen/IntakeScreen.tsx:1517), and also computes visible rows against that same empty object at [IntakeScreen.tsx](C:/Users/james/projects/depo-pro/src/components/IntakeScreen/IntakeScreen.tsx:190).

Conclusion: the Texas extraction is **not silently dropped**. It is durably recorded in provenance as conflicts. But the current Intake hydration path does **not** reconstruct those rejected values into the visible conflict table after a refresh.

## Section 3 — Did the document upload land durably?

Live `case_files`, Storage, and `case_audio` checks for `job_demo_001`:

| Check | Result | Evidence |
| --- | --- | --- |
| `case_files` notice row exists | `PASS` | Row `file_id = f_1780684476375_wr7u`. |
| `original_filename` correct | `PASS` | `05-07-26 @ 10am & 2pm - Goldman & Peterson (2).pdf` |
| `file_type = 'notice'` | `PASS` | Live row value. |
| `checksum` populated | `PASS` | `f5d6ebc6e4a7f7502196c8974cc9d9971c9df2a41b4af8493c756e1d283f3f4a` |
| `storage_path` matches convention | `PASS` | `cases/job_demo_001/notice/f_1780684476375_wr7u_05-07-26_10am_2pm_-_Goldman_Peterson_2.pdf` |
| `status = 'active'` | `PASS` | Live row value. |
| Storage object exists in bucket `case-files` | `PASS` | Storage list returned object `f_1780684476375_wr7u_05-07-26_10am_2pm_-_Goldman_Peterson_2.pdf`, size `441406`, MIME `application/pdf`. |
| `case_audio` row exists | `FAIL` | Live `case_audio` query returned `[]`. |

Formal close of browser-pass steps 3–4:

- Notice durability: **proven**
- Audio durability: **not evidenced for `job_demo_001`**

## Section 4 — Cross-case integrity check

### 4.1 Live `cases` rows

Live `cases` list returned exactly five rows:

| case_id | stage | updated_at | archived |
| --- | --- | --- | --- |
| `case_verify_1780681376883` | `intake` | `2026-06-05T17:42:57.728871+00:00` | `true` |
| `case_verify_1780682136673` | `intake` | `2026-06-05T17:55:37.51473+00:00` | `true` |
| `case_verify_1780682912773` | `intake` | `2026-06-05T18:08:33.611634+00:00` | `true` |
| `case_verify_1780683579225` | `intake` | `2026-06-05T18:19:39.711105+00:00` | `true` |
| `job_demo_001` | `intake` | `2026-06-05T18:35:36.809548+00:00` | `false` |

This matches the expected boundary: `job_demo_001` plus Task 0 verifier rows only.

### 4.2 Can extraction write into a different case row?

I found no code path that takes extraction results from one case and writes them into another case’s row.

Evidence:

- Standalone dev always mounts the fixed case id `job_demo_001` in [index.html](C:/Users/james/projects/depo-pro/index.html:15).
- Intake hydration loads the current `recordCaseIdRef.current || jobId` and then hydrates that same bundle at [IntakeScreen.tsx](C:/Users/james/projects/depo-pro/src/components/IntakeScreen/IntakeScreen.tsx:1355) through [IntakeScreen.tsx](C:/Users/james/projects/depo-pro/src/components/IntakeScreen/IntakeScreen.tsx:1369).
- `handleExtractNotice()` passes `caseId: record.case_id` into extraction persistence at [DocumentUploadPanel.tsx](C:/Users/james/projects/depo-pro/src/components/IntakeScreen/DocumentUploadPanel.tsx:439) through [DocumentUploadPanel.tsx](C:/Users/james/projects/depo-pro/src/components/IntakeScreen/DocumentUploadPanel.tsx:449).
- `applyAndPersistExtraction()` uses that same `caseId` for every provenance write and then calls `saveCaseRecord()` for the current case at [extractionPersistence.ts](C:/Users/james/projects/depo-pro/src/components/IntakeScreen/extractionPersistence.ts:89) through [extractionPersistence.ts](C:/Users/james/projects/depo-pro/src/components/IntakeScreen/extractionPersistence.ts:112).
- `persistCase()` saves `recordRef.current` and updates the currently loaded record only at [IntakeScreen.tsx](C:/Users/james/projects/depo-pro/src/components/IntakeScreen/IntakeScreen.tsx:1417) through [IntakeScreen.tsx](C:/Users/james/projects/depo-pro/src/components/IntakeScreen/IntakeScreen.tsx:1426).

Boundary check result: the defect is **single-case reuse**, not cross-case bleed.

## Section 5 — Verdict

**A — Design working, row contaminated**

Why:

- The California values on screen were already persisted in `job_demo_001`.
- The Texas notice produced durable provenance rows for the overlapping Texas values.
- Those Texas values landed as:
  - `11` conflict alternates in provenance
  - `1` applied unconfirmed field (`witnesses[0].party_affiliation = plaintiff`)
- No evidence shows the Texas extraction wrote into any other case row.
- No evidence shows the California values were fabricated by this extraction batch.

Important nuance:

- The extraction/collision path worked.
- The visible conflict UI is not fully restored after refresh because Intake still passes `mockConflictAlternates` instead of hydrating alternates from provenance.

That nuance does not change the contamination answer. It changes only how much of the rejected Texas data is visible after reload.

Secondary observation, not the blocker under audit:

- This batch did not capture the second deponent or the attorneys into payload/provenance.
- That is a separate extraction completeness issue, not evidence that the California values came from this PDF.

## Section 6 — Prompt 3 acceptance addendum

Use `C:\Users\james\Downloads\05-07-26 @ 10am & 2pm - Goldman & Peterson (2).pdf` as the canonical post-Prompt-3 fixture.

### Acceptance test

1. `New Deposition` opens a blank case with:
   - a fresh `case_id`
   - `NOT SAVED` badge
   - zero conflicts
   - zero pre-populated fields

2. Upload this PDF.
   - `case_files` gets a new notice row under the **new** case id
   - `storage_path` lives under `cases/{new_case_id}/notice/...`

3. Extract.
   - Texas values appear under the new case only
   - all values start unconfirmed
   - zero conflicts, because nothing is pre-confirmed
   - required values to verify:
     - `275th Judicial District` / Texas court
     - `Hidalgo County`
     - `C-1628-25-E`
     - full Texas case style
     - `2026-05-07`
     - `10:00 AM`
     - `Maria L. Lopez De Martinez`
     - `Raul Garza`, `Gregory J. Peterson`, `Derek I. Salinas` with firms if the current extractor supports them

4. Forbidden carryover.
   None of these may appear in the new case:
   - `Superior Court of California, County of Los Angeles`
   - `Dept. 32`
   - `2026-06-10`
   - `09:30`
   - anything from `Smith v. Meridian Infrastructure Partners`

5. Refresh.
   - extracted Texas values survive
   - badge returns `SAVED` without a manual save click
   - no California carryover appears

6. Open `job_demo_001` from the case browser.
   - its contaminated data remains intact
   - the new case’s extraction did not modify `job_demo_001`

Documented case-model question for the Prompt 5 rewrite, explicitly out of Prompt 3 scope:

- This PDF contains two deponents / two sessions in one file (`10:00 AM` and `2:00 PM`).
- The current Intake model still assumes one witness/session path.
- Prompt 3 should fix case identity first; it should not silently expand the case model here.

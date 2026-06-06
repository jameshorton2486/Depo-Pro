## Prompt 5B Report

### Task 1 — pre-existing, skipped

Task 1 was already satisfied by earlier commits and was not reimplemented:

- `55b0e75` `fix: harden case browser summary projection`
- `81fc229` `fix: archive transcript ingest verification case`

That earlier work already:
- made `listRecentCases()` tolerate sparse payloads without throwing
- added the `{}` payload regression test
- updated `scripts/verify-transcript-ingest.mjs` to archive its verifier case row on completion

### New commits

1. `f8583a0` `feat: location type select per field reference group d`
2. `99ec156` `fix: field confirm preserves scroll and table state`
3. `5dfd90f` `feat: confirm flow advances focus to next unconfirmed`

### Task 2 — location type / is_remote derivation

Implemented in:
- `src/types/case.ts`
- `src/store/intakeReducer.ts`
- `src/components/ExtractedFieldsTable/fieldProjection.ts`
- `src/components/ExtractedFieldsTable/ExtractedFieldsTable.tsx`
- `src/lib/parsing/applyJobSheetExtraction.ts`
- `src/lib/parsing/jobSheetFields.ts`

#### Payload and UI

- Added `session.location_type` as the editable extracted-field path.
- The old `Remote Proceeding` yes/no display is replaced by `Location Type`.
- Allowed values:
  - `zoom`
  - `in_person`
  - `hybrid`
  - `phone`
- Display labels:
  - `Zoom`
  - `In Person`
  - `Hybrid`
  - `Phone`

#### is_remote derivation rules

Implemented in `src/store/intakeReducer.ts`:

- `zoom` → `is_remote = true`
- `phone` → `is_remote = true`
- `hybrid` → `is_remote = true`
- `in_person` → `is_remote = false`
- empty / null `location_type` → `is_remote = false`

#### Never-guess load rule

Implemented via the local case model defaulting and covered in `src/types/case.test.ts`:

- legacy payload with `session.is_remote = true` and no `session.location_type`
  - leaves `session.location_type` empty/unconfirmed
  - does **not** infer `zoom`, `phone`, `hybrid`, or `in_person`

#### Job-sheet mapping

Implemented in `src/lib/parsing/applyJobSheetExtraction.ts` and covered in `src/lib/parsing/applyJobSheetExtraction.test.ts`:

- `Via Zoom` from the job-sheet parser maps to `session.location_type = "zoom"`

### Task 3 — confirm preserves scroll and table state

Implemented in:
- `src/components/ExtractedFieldsTable/ExtractedFieldsTable.tsx`
- `src/components/ExtractedFieldsTable/tableBehavior.ts`
- `src/components/ExtractedFieldsTable/tableBehavior.test.ts`

#### Root cause found

The confirm flow was already optimistic in local state, but the table did not preserve viewport position across the local `setLocalConfirmed(...)` update in `src/components/ExtractedFieldsTable/ExtractedFieldsTable.tsx`. The row keys were already field-path-based in practice, but that stability was implicit rather than codified.

#### Fix

- made row identity explicit through `getFieldRowKey(row) => row.id`
- preserved window scroll position around confirm/update transitions
- kept confirm as an optimistic local state change so the action area swaps to `Done` in place
- added `data-testid` row markers for the row identity seam

### Task 4 — confirm advances focus to next unconfirmed

Implemented in:
- `src/components/ExtractedFieldsTable/ExtractedFieldsTable.tsx`
- `src/components/ExtractedFieldsTable/tableBehavior.ts`
- `src/components/ExtractedFieldsTable/tableBehavior.test.ts`

#### Behavior

- after confirm, focus advances to the next visible unconfirmed row
- confirmed, empty, and conflict rows are skipped
- order wraps across the filtered visible list
- the next button is kept in view with `scrollIntoView({ block: "nearest" })`
- focus lands on the next `Confirm` button, so repeated `Enter` presses can work down the list

### Verification

After each implemented task:

- `npm run typecheck`
- `npm run test`

Final test count:
- `24` test files passed
- `95` tests passed

### Boundary log

No new boundary-log entries were required for Prompt 5B.

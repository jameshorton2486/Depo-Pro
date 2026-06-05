# Verify Persistence

Run this after James applies the new migration with `npx supabase db push`.

## Browser flow

1. Start the app with `VITE_USE_MOCKS=false`.
2. Create or open a saved case and note the `case_id`.
3. Upload a Notice of Deposition and an audio file.
4. Confirm both slots show filenames and `View` links.
5. Hard refresh the browser.
6. Confirm the Notice and audio slots are restored from the database with working `View` links.
7. Click `Extract from Document`.
8. Confirm the case badge transitions through `SAVING...` and ends at `SAVED` without clicking `Save Intake`.
9. Hard refresh again.
10. Confirm the extracted Intake fields are still present.
11. Remove the Notice file from the slot.
12. Hard refresh again.
13. Confirm the Notice slot stays empty after refresh.

## Database checks

1. Confirm the `cases` row still exists for the active `case_id`.
2. Confirm the latest `case_audio` row exists for that `case_id`.
3. Confirm the removed Notice row remains in `case_files` with `status = 'removed'`.
4. Confirm the Notice storage object still exists in the `case-files` bucket even after removal.

## Expected result

- Notice and audio survive refresh through Supabase-backed restoration.
- Extraction persists through the same case save path as the footer save button.
- Removing a document hides it from Intake while preserving the metadata row and storage object for auditability.

## Conflict rehydration flow

1. Open `job_demo_001` from the Case Browser.
2. Confirm the 11 audit-documented Texas conflicts appear in the Extracted Fields table with `Notice` source badges and Resolve actions.
3. Hard refresh the browser.
4. Confirm the same 11 conflicts reappear after refresh.
5. Resolve one conflict in either direction.
6. Confirm the visible conflict count drops from 11 to 10.
7. Hard refresh the browser again.
8. Confirm the count remains 10 and the resolved conflict does not reappear.
9. Open a different existing case, or create a new case from the Case Browser.
10. Confirm no conflicts from `job_demo_001` leak into the other case.

## Conflict rehydration expected result

- Unresolved conflicts are restored from `field_provenance` on case load.
- Resolving a conflict persists the closing provenance event and survives refresh.
- Conflict state remains scoped to the active case provider remount.

## Job sheet extraction flow

1. Open the Garza case, or create a fresh case from the Case Browser.
2. Upload `depo notes (7).pdf` into the `Scheduling Notes / Job Sheet` slot.
3. Click `Extract from Document`.
4. Confirm the Extracted Fields table shows unconfirmed `Job Sheet` values for:
   - ordering attorney `Raul Garza`
   - ordering firm `Goldman & Peterson`
   - ordering address `10100 Reunion Place Suite 800, San Antonio TX 78216`
   - ordering phone `(210) 340-9800`
   - ordering email `Raul@LJGLaw.com`
   - copy attorney `Derek I. Salinas`
   - copy firm `Tijerina Legal Group, P.C.`
   - location showing `Via Zoom` / `San Antonio, TX`
   - scheduled start time `10:00 AM` or normalized equivalent
5. Confirm the job-sheet extraction does not write:
   - `reporter.firm_registration_number`
   - `reporter.firm_address`
   - any CSR, charges, or certificate fields
   - any cause number, court, county, or witness identity from this slot
6. If the Notice already confirmed a different value, confirm a visible conflict appears instead of an overwrite.
7. Hard refresh the browser.
8. Confirm the extracted `Job Sheet` values and any conflicts still appear after refresh.
9. Upload the same job-sheet PDF into `Supporting Documents`.
10. Confirm the slot now offers `Extract as Notice` and `Extract as Job Sheet`.
11. Click `Extract as Job Sheet`.
12. Confirm the resulting extracted values match the Scheduling Notes path for the same document.
13. Create a new blank case from the Case Browser.
14. Confirm the new case opens with zero `Confirmed` fields anywhere in the Extracted Fields table.

## Job sheet extraction expected result

- The Scheduling Notes slot runs the existing `reporterNotesParser` through the shared extraction, provenance, conflict, and auto-save path.
- Supporting documents require an explicit extract mode and never auto-detect type.
- Job-sheet extraction is limited to JOB-owned or shared fields from the field reference.
- Empty fields never default to `Confirmed` on a new case.

## Intake autosave and flush flow

1. Open any real saved case from the Case Browser.
2. Edit an Intake field such as `Case Name` or `County`.
3. Do not click `Save Intake`.
4. Confirm the status badge shows `MODIFIED`.
5. Wait 10 seconds without further edits.
6. Confirm the badge transitions through `SAVING...` and ends at `SAVED`.
7. Hard refresh the browser.
8. Confirm the edited Intake value persists.
9. Make another Intake edit.
10. Immediately click into another case from the Case Browser.
11. Confirm the switch succeeds without showing a dialog when save succeeds.
12. Reopen the original case.
13. Confirm the last Intake edit persisted even though you switched immediately.
14. Trigger a save failure if possible, then try to switch cases again.
15. Confirm the dialog appears only after the failed flush and offers `Retry Save`, `Discard and Switch`, and `Cancel`.

## Workspace save integrity flow

1. Open a case with transcript workspace data.
2. Make a transcript text edit.
3. Before the 2-second autosave completes, make another text edit in the same utterance.
4. Wait for save completion.
5. Confirm the toolbar still shows unsaved state until the later edit is saved.
6. Wait for the follow-up autosave.
7. Confirm the toolbar ends in `Saved HH:MM`.
8. Hard refresh the browser.
9. Confirm both text edits are still present.

## Autosave expected result

- Intake autosaves 10 seconds after the last edit without removing the manual `Save Intake` button.
- Case switches and new-case actions flush automatically; the dialog appears only on save failure.
- `beforeunload` warns while Intake or workspace has dirty or in-flight saves.
- Workspace autosave never clears dirty state for edits that landed during an in-flight save.

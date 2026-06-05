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

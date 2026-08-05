# SPEAKER_REASSIGNMENT_FIX_REPORT

## Result

**PASS**

Durable speaker reassignment persistence is now working in the local mock runtime.

## Files Modified

- `src/api/types.ts`
- `src/components/SpeakerPanel/SpeakerPanel.tsx`
- `src/mocks/handlers.ts`

## Fix Summary

The fix keeps the existing speaker-definition persistence path intact and adds utterance-level speaker mapping persistence.

### What changed

1. `SpeakersPayload` now supports an optional `utterance_speaker_map` field.
2. `SpeakerPanel` includes the active utterance reassignment in the existing `saveSpeakers()` call.
3. The mock `PUT /:jobId/speakers` handler now:
   - preserves the existing speaker metadata override behavior
   - applies `utterance_id -> speaker_id` assignments to the mutable working document
   - persists the updated working document through the existing localStorage-backed mock persistence path
4. `GET /:jobId/document` now returns the reassigned speaker mapping because it is part of the persisted working document state.

## Validation

Target reassignment:
- `utt_0002`
- from `spk_001` / `THE WITNESS`
- to `spk_002` / `MR. SMITH`

### Soft Re-fetch

Status: **PASS**

Verified:
- live editor DOM changed to `data-speaker-id="spk_002"`
- `PUT /speakers` succeeded with status `200`
- request payload contained `utterance_speaker_map`
- soft `GET /document` returned `utt_0002.speaker_id = "spk_002"`

### Hard Refresh

Status: **PASS**

Verified:
- app returned to Intake after refresh
- after re-entering Workspace, the editor still showed `utt_0002` assigned to `spk_002`
- fetched document still returned `utt_0002.speaker_id = "spk_002"`

## Behavior Preserved

Unchanged:
- speaker definition persistence
- TranscriptEditor rendering behavior
- AudioPlayer behavior
- gate logic
- Intake flow
- Suggestions / Confidence / Exhibits behavior

## Test Results

- `npm run test`: **PASS**
- `27/27` tests passed

## Conclusion

Speaker reassignment persistence is now closed for the local mock runtime.

Validated end-to-end:

Reassign
Save
Soft re-fetch
Assignment preserved

Reassign
Save
Hard refresh
Re-enter Workspace
Assignment preserved

# Large Transcript And Export QA Checklist

Run the automated harness first:

```powershell
npx vitest run src/validation/workflowHarness.test.ts
```

Use this manual checklist after the harness passes.

## Large Transcript

1. Open a synthetic case with a transcript larger than 250 utterances.
2. Confirm the workspace loads without a blank editor, console error, or frozen first paint.
3. Scroll from top to bottom, then back to the top.
4. Verify offscreen scrolling remains smooth and active utterance blocks render correctly when they enter view.
5. Click several words near the start, middle, and end of the transcript.
6. Confirm audio seeks correctly and the `word-playing` highlight tracks playback.
7. While audio is playing, verify the highlight still advances correctly and no visible transcript sections disappear.
8. Edit an early utterance, a middle utterance, and a late utterance.
9. Wait for autosave and confirm no save error banner appears.
10. Reopen the case and confirm those edits persisted.
11. Open the utterance context menu in multiple regions of the transcript.
12. Confirm speaker-side tools, corrections, confidence, and changelog panels still react to the selected utterance.

Pass criteria:
- No editor lockup.
- No missing visible blocks while scrolling.
- Audio sync remains accurate during playback.
- Edits persist across autosave and reopen.

## Export

Prerequisite:
- Complete Stage 4, Stage 5, and Stage 6 so export actions are enabled.

1. Open Stage 7 Export.
2. Confirm `Export TXT`, `Export Package`, `Export Word`, and `Print / Save PDF` are enabled.
3. Run `Export TXT`.
4. Open the TXT output and confirm:
- Q/A structure is present when structure is confirmed.
- No inline flag markup appears in the exported text.
- Transcript text includes late-document content, not just the opening page.
5. Run `Export Package`.
6. Confirm the JSON includes `job_id`, `case_name`, `case_number`, `generated_at`, `transcript_text`, and `word_count`.
7. Run `Export Word`.
8. Open the generated file in Word or Word-compatible software and confirm:
- The document opens without repair prompts.
- Transcript text is complete.
- Escaped characters render correctly.
9. Run `Print / Save PDF`.
10. In the browser print dialog, save the file as PDF.
11. Open the PDF and confirm:
- The document is printable and readable.
- Text is complete across the full transcript.
- The title and body content match the current transcript state.

Pass criteria:
- All export actions succeed.
- Exported content matches the current certified transcript.
- No placeholder or beta-gated messaging remains in the active export path.

## Regression Notes

Record these if a failure appears:

- Case ID
- Transcript utterance count
- Browser used
- Whether audio was playing during the failure
- Exact stage and action
- Whether the issue reproduces after reload

# Codex Task — STEP 4: migrate reassignment off raw rewrites onto the overlay

**Mode: IMPLEMENTATION. One commit. Audit-first. BETA_FREEZE in effect.**

**Forward-looking prompt:** written assuming Steps 1–3 landed as planned (overlay tables exist,
resolver exists, normalization writes the overlay and the panel reads resolved state). Task 0
RE-VERIFIES this before any change. If the world differs from these assumptions, STOP and
report.

Step 4 of `SPEAKER_RESOLUTION_ARCHITECTURE_DECISION`. The remaining raw-mutation violation:
speaker **reassignment** currently rewrites raw `transcript_utterances.speaker_id` /
`speaker_label` and `transcript_words.speaker_id`. This step moves reassignment to the overlay
so raw utterance/word speaker linkage is never written post-ingest.

Known raw-rewrite sites (re-confirm in Task 0):
- `src/api/workspaceService.ts:618` (`transcript_utterances`)
- `src/api/workspaceService.ts:631` (`transcript_words`)
- `supabase/functions/editor-api/index.ts:536` (`transcript_utterances`)
- `supabase/functions/editor-api/index.ts:548` (`transcript_words`)
- the utterance-reassignment flow at `SpeakerPanel.tsx:417`

---

## Task 0 — Audit first (read-only; report before coding). Contains a real design crux.

1. **Re-verify state.** Confirm Steps 1–3 are in place: overlay tables exist, the resolver is
   wired into the panel, normalization writes the overlay, raw `transcript_speakers` is no
   longer written by mapping. Quote the current reassignment writes (the five sites above) and
   confirm they still rewrite raw. If any assumption is false, STOP and report.

2. **THE CRUX — granularity mismatch.** Normalization (Step 3) operates at the **speaker-label
   level** (`raw_speaker_index → participant`), and the Step 1 overlay
   `speaker_resolution_current` is keyed on `(transcript_id, raw_speaker_index/raw_speaker_id)`.
   But reassignment may operate at a **finer grain** — reassigning *specific utterances/words*
   to a different speaker, not the whole label. Determine exactly what the current reassignment
   does:
   - Does it reassign an entire raw speaker label (all of `spk_005` → different participant)?
     → fits the existing overlay key, straightforward.
   - Or does it reassign *individual utterances/words* (this utterance, not all of `spk_005`)?
     → the existing overlay key (per raw_speaker_index) **cannot represent** per-utterance
     reassignment. That would need either a different/additional overlay shape (keyed on
     `utterance_id`) or a product decision that reassignment is label-level only.

   **If reassignment is per-utterance and the overlay can't represent it: STOP and report.**
   Do not invent a schema change or silently downgrade per-utterance reassignment to
   label-level. This is a product/architecture decision for the owner, not a thing to guess.
   Report the granularity clearly so the decision can be made.

3. **The reassignment write path.** Trace how reassignment is triggered (UI → save → write) for
   both local and real-API modes, and how it differs from the normalization path built in
   Step 3 (which already writes the overlay). Can reassignment reuse the Step 3 overlay-write
   helper, or does it need its own?

4. **Read consistency.** After reassignment writes the overlay, confirm the resolver +
   panel (from Step 3) will reflect it the same way normalization does — i.e. reassignment and
   normalization converge on one write path and one read path.

**Stop and report Task 0 — especially the granularity crux (#2).** Scope depends on the answer.

---

## Task 1 — Implement (only if Task 0 confirms label-level reassignment fits the overlay)

- Replace the four raw rewrites (`:618/631`, `:536/548`) so reassignment writes
  `speaker_resolution_current` + `speaker_resolution_history` instead of mutating raw
  utterance/word rows. Raw `transcript_utterances` / `transcript_words` speaker columns are NOT
  written.
- Reassignment and normalization converge: both write the overlay, both are read via the
  resolver. Reuse the Step 3 helper where possible.
- Behavior-neutral for un-reassigned transcripts (no overlay row → resolver fallback = today).

If Task 0 surfaced per-utterance reassignment that the overlay can't represent, implement
NOTHING and report the decision needed (extend overlay to utterance grain, or make
reassignment label-level).

## Task 2 — Tests
- Reassigning a label writes the overlay, NOT raw utterance/word rows (assert raw unchanged).
- Resolver + panel reflect the reassignment.
- History row appended.
- No-overlay transcript unchanged.

---

## Verification gate (report all)
- `git rev-parse HEAD` before/after (parent must be the certified Step 3 commit). Both.
- `git status --porcelain` after. Clean.
- `npm run typecheck` tail.
- `npm test` before/after counts.
- Files changed (name everything).
- One-paragraph note: raw utterance/word speaker columns NO LONGER written; reassignment now
  writes overlay+history; converges with normalization's path; un-reassigned transcripts
  behavior-neutral. State the granularity finding from Task 0.

## Commit
```
feat(speakers): migrate reassignment to overlay (raw utterances/words no longer rewritten)

Step 4 of the speaker-resolution overlay architecture. Reassignment now writes
speaker_resolution_current + history instead of rewriting transcript_utterances
/transcript_words speaker columns, converging with Step 3 normalization on one
overlay write path and the resolver read path. Raw utterance/word speaker
linkage is no longer mutated post-ingest.
```

## Do NOT
- Do NOT write raw `transcript_utterances` / `transcript_words` / `transcript_speakers`.
- Do NOT migrate export/`buildEditorContent` readers — Step 5.
- Do NOT add a schema change or downgrade reassignment granularity without reporting first.
- Do NOT change Stage S or the resolver.
- One concern, one commit. Full verification block.
```

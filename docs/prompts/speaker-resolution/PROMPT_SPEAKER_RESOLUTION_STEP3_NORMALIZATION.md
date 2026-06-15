# Codex Task — STEP 3: speaker-mapping normalization via overlay (many labels → one participant)

**Mode: IMPLEMENTATION. One commit. Audit-first. BETA_FREEZE in effect (overlay tables already
exist from Step 1; no new schema needed).**

**PREREQUISITE:** the Step 1 migration (`20260615002253_speaker_resolution_overlay_tables.sql`)
must already be applied to the live DB. If it is not applied, STOP and report — this step
writes to those tables.

Step 3 of `SPEAKER_RESOLUTION_ARCHITECTURE_DECISION`. This is the **first step that touches a
live write path** and the step where the overlay **goes live**. It does two things:
1. The speaker-mapping save path writes the OVERLAY (`speaker_resolution_current` +
   `speaker_resolution_history`) instead of writing labelling/role onto raw `transcript_speakers`.
2. Multiple raw diarization labels can resolve to ONE participant (alias / many-to-one), so the
   revert bug disappears (mapping Speaker 2 → Nunez then Speaker 5 → Nunez keeps BOTH).

Frozen principles: raw is immutable (incl. `transcript_speakers`); humans write overlays;
alias not merge; the Step 2 resolver (`1de29ff`) is the read side this populates.

Committed foundation: Step 1 `48292d5f` (tables), Step 2 `1de29ff` (resolver, unwired).

---

## Task 0 — Audit first (read-only; report before coding). The sequencing question is the crux.

Report, with file:line:

1. **The speaker-mapping write path today.** Trace `SpeakerPanel` save → `saveSpeakers`
   wrapper → the actual write. Confirm it currently writes `assigned_name`/`role`/etc to raw
   `transcript_speakers` at `workspaceService.ts:591` (local) and `editor-api/index.ts:516`
   (real API). Quote both.
2. **The speaker-mapping READ path today.** How does `SpeakerPanel` (and the transcript
   display) currently READ the speaker label/role to show in the UI — directly off
   `transcript_speakers`, or via something else? Cite it.
3. **THE CRUX — the sequencing tension.** If Step 3 makes the save path write ONLY the overlay
   and STOPS writing raw `transcript_speakers`, but the read path (panel + display) still reads
   raw `transcript_speakers`, then **the user's mapping would become invisible** (written to
   overlay, read from raw). For the revert bug to actually disappear and the map to be
   confirmable, the panel must also READ resolved state (via the Step 2 resolver) — not just
   write it. Report: what is the minimal set of READ sites that must switch to the resolver in
   THIS step so that writing the overlay is actually reflected in the speaker panel and the
   confirm flow? Distinguish these "must-migrate-now" panel/confirm reads from the broader
   downstream readers (export, `buildEditorContent`) that are explicitly **Step 5** and should
   NOT be touched here.
4. **The confirm flow.** How does "Speakers: Unconfirmed" → confirmed work today, and what does
   it key off (`speaker_map_confirmed` on the transcript)? Confirm that flag is NOT raw speaker
   data and can still be set (it's transcript-level state, not a raw speaker label). The map
   must be confirmable once all participants are resolved via overlay.
5. **Participant identity for normalization.** When two labels map to one participant, what is
   the `participant_id` value? (Per Step 1 it's a bare identifier — likely derived from the
   assigned name/role, or a generated id.) Report the simplest stable scheme so two labels
   assigned the same name+role get the SAME `participant_id`.
6. **History write.** Confirm how to append to `speaker_resolution_history` on each resolution
   change (the append-only table), and that the existing `assign_speaker` audit-log write still
   happens.

**Stop and report Task 0 findings — especially #3.** The sequencing answer (which reads move
now vs. stay for Step 5) determines the commit's scope. If #3 reveals that making the mapping
visible requires touching more than the panel's own read loop, STOP and report so the scope can
be decided deliberately rather than sprawling into Step 5.

---

## Task 1 — Implement normalization via overlay

Against the Task 0 findings:

1. **Write path → overlay.** The speaker-mapping save writes `speaker_resolution_current` rows
   (one per raw speaker label being resolved) carrying `participant_id`, `resolved_role`,
   `resolved_label`, `resolved_by`, `resolved_at`, `owner_user_id`; and appends a
   `speaker_resolution_history` row. It must STOP writing `assigned_name`/`role`/`speaker_label`
   onto raw `transcript_speakers` (`:591`, `:516`). **Raw `transcript_speakers` is not written.**
2. **Many-to-one.** Two (or more) raw labels assigned the same participant get the same
   `participant_id` and BOTH persist — no revert, no "duplicate" rejection. The one-row-one-name
   enforcement found in Task 0 is removed/replaced.
3. **Panel read → resolver.** The speaker panel (and only the reads Task 0 identified as
   necessary for the panel/confirm to reflect the overlay) reads via the Step 2 resolver so the
   user sees their mapping. Do NOT migrate export/`buildEditorContent` — those are Step 5.
4. **Confirm still works.** The map can be confirmed (`speaker_map_confirmed`) once participants
   are resolved.
5. **Behavior-neutral for un-resolved speakers.** A transcript with no overlay rows displays
   exactly as today (the resolver's no-overlay fallback guarantees this).

## Task 2 — Tests
- Two raw labels → one participant: both persist, resolver groups them, panel reflects one
  participant. (The end of the revert bug.)
- Save writes overlay, NOT raw `transcript_speakers` (assert raw speaker rows unchanged after a
  mapping save).
- History row appended on resolution.
- No-overlay transcript: panel display unchanged vs. pre-Step-3 behavior.
- Confirm flow still flips `speaker_map_confirmed`.

---

## Verification gate (report all — full block)
- `git rev-parse HEAD` before/after (parent must be `1de29ff`). Include both.
- `git status --porcelain` after commit. Include it.
- `npm run typecheck` passing tail.
- `npm test` before/after counts (state both; baseline from temp checkout if needed).
- Files changed (name everything).
- One-paragraph note confirming: raw `transcript_speakers` is NO LONGER written by the mapping
  save (and no raw utterance/word writes were added — that's Step 4); the overlay + history are
  written; the panel reads resolved state; many-to-one works; un-resolved transcripts are
  behavior-neutral; which read sites were migrated and which were left for Step 5.

## Commit

One commit. Suggested message:
```
feat(speakers): normalize speaker mapping via overlay (many labels -> one participant)

Step 3 of the speaker-resolution overlay architecture. Speaker mapping now
writes speaker_resolution_current + history instead of labelling raw
transcript_speakers; multiple diarization labels can resolve to one
participant (alias), ending the revert bug. The speaker panel reads resolved
state via the Step 2 resolver; export/editor-content readers stay on Step 5.
Raw tables untouched; un-resolved transcripts render unchanged.
```

## Do NOT
- Do NOT write to raw `transcript_speakers`, `transcript_utterances`, or `transcript_words`.
- Do NOT migrate reassignment (the utterance/word rewrites) — that is Step 4.
- Do NOT migrate export / `buildEditorContent` readers — that is Step 5.
- Do NOT change `buildIndexMap` or Stage S.
- Do NOT change the no-overlay (un-resolved) display behavior.
- If Task 0 #3 shows the scope must exceed the panel's own read loop, STOP and report.
- One concern, one commit. Include the full verification block.
```

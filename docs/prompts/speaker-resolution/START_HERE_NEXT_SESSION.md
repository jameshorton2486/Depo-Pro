# START HERE — Depo-Pro speaker-resolution work (resume point)

_Last session: 2026-06-14. Read this first, then the index, then run Step 3._

## Where things stand (all certified)

- **Step 1 `48292d5f`** — overlay tables (`speaker_resolution_current` +
  `speaker_resolution_history`), additive/dark. Nothing reads/writes them yet.
- **Step 2 `1de29ff`** — read-time resolver (`src/lib/transcript/speakerResolution.ts`),
  pure logic, **unwired**. Groups aliased raw speaker indices → one participant; no-overlay
  path reproduces current behavior.
- **Branch:** clean on `1de29ff` (`feature/stage3-workspace-core`).
- Full record: `Depo-Pro_Phase1_Prompt_Commit_Index.md` (the "Session 2026-06-14" section).
- Frozen architecture: `SPEAKER_RESOLUTION_ARCHITECTURE_DECISION.md`.

## DO THIS FIRST (gating action before Step 3 can be tested live)

**Apply the Step 1 migration to the live Supabase DB.** The overlay tables exist in the repo
(`supabase/migrations/20260615002253_speaker_resolution_overlay_tables.sql`) but must exist in
the actual database before normalization can write to them.
```
supabase db push          # or your usual migration-apply command
```
(The `editor-api` Edge Function is already redeployed — that one's done.)

## Then run Step 3

`PROMPT_SPEAKER_RESOLUTION_STEP3_NORMALIZATION.md` (in this folder).

**What Step 3 does:** the speaker-mapping panel starts writing the OVERLAY (not raw), and
multiple diarization labels can resolve to one participant. This is what makes the revert bug
disappear (map Speaker 2 → Nunez, then Speaker 5 → Nunez, and BOTH stick) and lets the
8-speaker `tr_1781456706021_4bdiwu` transcript map to its 4 real people — so the speaker map
can finally be **confirmed**.

**This is the first non-zero-risk step** — it touches a live write path. So:
- It's audit-first (read the panel's read/write loop before changing it).
- Verification matters more than for Steps 1–2.
- Raw tables must stay untouched (that's the whole point).

## The bigger arc (why this matters)

The original goal — the **Stage S export visual diff** (Thomas/Baier/Etminan in Word vs
hand-built references) — is still the destination. It's gated behind being able to map a
transcript correctly, which Step 3 unlocks. After Step 3, that ugly transcript maps cleanly,
the map confirms, and the export diff becomes meaningful again.

## Remaining steps after 3

- **Step 4** — migrate reassignment (the raw `utterances`/`words` rewrites at
  `workspaceService.ts:618/631`, `editor-api:536/548`) onto the overlay.
- **Step 5** — migrate downstream readers (export, `buildEditorContent`). Certifying test =
  **empty-overlay byte-identity** (zero overlay rows → export unchanged), not just aliasing.
  A reverted prototype of this exists as a preview.
- **Step 6** — write-protect raw speaker columns post-ingest (final hardening).

## Don't forget (launch checklist — before real users)

Re-enable Supabase "Confirm email"; disable anonymous sign-ins; ensure `VITE_DEV_AUTH_BYPASS`
and `VITE_USE_STAGE_S_EXPORT` never ship enabled; reconcile live Storage bucket config with the
migration's 2 GiB; change the dev account password (exposed in chat).

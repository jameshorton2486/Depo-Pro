# SPEAKER RESOLUTION AUDIT

**Mode:** Read-only sizing audit  
**Scope:** Existing overlay, workspace, speaker-panel, and export paths only  
**Writes:** This report only  
**Code changes:** None

---

## Bottom Line

The speaker-resolution system is **mostly built**. The app already has:

- an overlay store in `speaker_resolution_current` / `speaker_resolution_history`
- a resolver that merges raw Deepgram speakers with overlay rows
- a workspace save path that persists speaker edits
- a paragraph model that consumes resolved speakers for both workspace and export

This is **not** a net-new engine. The work is primarily **finish-job correction/wiring**, with one
small structural gap: attorney honorifics are not modeled in `CaseRecord.attorneys`, so `MR./MS.`
by-lines cannot be derived cleanly from attorney metadata alone.

### Overall verdict

**Mostly built, needing correction and stricter fallbacks.**  
Per-gap sizing:

| Gap | Verdict |
|---|---|
| G1 — over-attribution | `finish-job` |
| G2 — name correction | `finish-job` |
| G3 — honorific byline | `small build` |
| G4 — unmapped indices | `finish-job` |

---

## Current Architecture

### Overlay read path

- `src/api/transcriptRepository.ts:319-344` loads `speaker_resolution_current` into
  `speakerResolutionOverlay` as part of every transcript snapshot.
- `src/api/workspaceService.ts:237` feeds that overlay into `buildResolvedSpeakerViews(...)` for
  the local workspace path.
- `src/components/ExportScreen/exportDocx.ts:59-66` does the same for export: snapshot speakers +
  overlay -> resolved speakers -> canonical paragraph model -> DOCX paragraph specs.

### Overlay resolver

- `src/lib/transcript/speakerResolution.ts:37-39` resolves each raw speaker from overlay when
  present, else falls back to the raw transcript values:
  - `participant_id` -> `raw:${rawSpeaker.speaker_id}`
  - `resolved_role` -> raw role
  - `resolved_label` -> raw assigned/display label
- `src/lib/transcript/resolvedSpeakers.ts:15-27` converts the resolved participants into
  `ResolvedSpeakerView[]` for workspace/export.
- `src/lib/transcript/resolvedSpeakers.ts:53-54` marks mapping complete only when every resolved
  speaker has a non-empty display name and role. That is a completeness check, not a correctness
  check.

### Identity/render path

- `src/lib/transcript/workspaceParagraphs.ts:143-160` builds a speaker-view map from
  `buildTranscriptSpeakerIdentityMap(...)`.
- `src/lib/transcript/speakerIdentity.ts:38-79` maps raw speaker ids to transcript-facing
  identities and labels.
- `src/lib/transcript/workspaceParagraphs.ts:53-88` turns those identities into canonical
  paragraph kinds/labels consumed by both workspace and export.

### Manual editing path

- `src/components/SpeakerPanel/SpeakerPanel.tsx:100-108` saves participant-level edits through
  `workspaceApi.saveSpeakers(...)`.
- `src/components/SpeakerPanel/SpeakerPanel.tsx:408-419` also persists utterance-level speaker
  reassignment through the same API using `utterance_speaker_map`.
- `src/api/workspaceService.ts:933-1099` persists those changes into
  `speaker_resolution_current/history` and updates utterance/word speaker ids for reassigned
  utterances.

---

## Gap Sizing

## G1 — over-attribution

**Gap:** `THE REPORTER:` applied to attorney/witness speech.

### Where it is handled now

- `src/lib/transcript/speakerResolution.ts:37-39` keeps raw role/label whenever overlay rows do
  not override them.
- `src/lib/transcript/speakerIdentity.ts:82-180` tries to resolve a participant candidate from
  `CaseRecord` once a stage role already exists.
- `src/lib/transcript/speakerIdentity.ts:305-310` hard-falls by stage role:
  - reporter -> `THE REPORTER`
  - witness -> `THE WITNESS`
  - otherwise raw normalized fallback label
- `src/lib/transcript/workspaceParagraphs.ts:185-203` classifies attorney speech as `Q`, witness
  speech as `A` or colloquy, and everything else as colloquy based on the resolved role.

### What the code implies

- If a raw speaker arrives as reporter or is manually saved as reporter, the label path will
  faithfully render `THE REPORTER` downstream.
- There is **no guard** against “reporter” being the wrong role; completeness only checks that a
  role exists (`src/lib/transcript/resolvedSpeakers.ts:53-54`), not that the role is plausible.
- Correct attribution is therefore enforced only by the overlay row quality, not by any higher
  validation rule.

### Sizing verdict

`finish-job`

### Why

The overlay, persistence, and downstream consumption all exist. The missing work is to **tighten
the fallback/validation behavior** so unmapped or weakly mapped speech does not silently inherit an
incorrect reporter role and produce `THE REPORTER:` everywhere.

---

## G2 — name correction

**Gap:** `Mia Bardado` -> `Miah Bardot`; similar participant-name cleanup from raw Deepgram labels.

### Where it is handled now

- `src/lib/transcript/speakerIdentity.ts:92` resolves reporter identity from
  `record.reporter.name.value`, not from the raw transcript label, once stage role is
  `court_reporter`.
- `src/lib/transcript/speakerIdentity.ts:102-176` attempts exact/suffix/surname matching for
  witness/interpreter/videographer/participant names.
- `src/lib/transcript/speakerIdentity.ts:353-370` `findNamedMatch(...)` normalizes casing,
  punctuation, and surname matching, but does **not** do edit-distance or fuzzy spelling repair.
- `src/lib/transcript/speakerIdentity.ts:194-239` assigns attorneys deterministically by exact
  label match first, then by question-density heuristic, then by remaining-order fallback.

### What the code implies

- Reporter correction is already mostly available if the role is right, because the reporter label
  comes from `CaseRecord`.
- Witness correction is partly available because a single witness can be deterministically chosen.
- Attorney name correction is weaker: no fuzzy matching exists for `Zahn` -> `Zhan`; correction
  depends on exact match or on the attorney-cluster assignment logic.
- There is no general known-entity normalization table in `src/`; this is record-driven matching,
  not transcript-text normalization.

### Sizing verdict

`finish-job`

### Why

The identity overlay already reaches into `CaseRecord` and can replace raw names with case
participants. The remaining gap is **correction quality**, not missing infrastructure. It needs
better deterministic matching and/or stricter use of existing case metadata.

---

## G3 — honorific byline

**Gap:** `BY NUNEZ:` instead of `BY MR. NUNEZ:` and mismatches like `Lucia Zahn` / `BY CUKJATI:`.

### Where it is handled now

- `src/lib/transcript/workspaceParagraphs.ts:282-284` builds by-lines strictly from the current
  speaker label: `BY ${normalizeSpeakerLabel(label)}:`.
- `src/lib/transcript/workspaceParagraphs.ts:143-160` uses `identity?.transcriptLabel` when
  available; otherwise it falls back to role/display-name-based labels.
- `src/lib/transcript/speakerIdentity.ts:185-191` builds attorney candidates from `CaseRecord`,
  but hard-codes `honorific: ""` for attorneys.
- `src/editor/speakerMapping.ts:82-107` only emits `MR./MS./MRS./DR.` labels when a valid
  honorific exists; otherwise `participantLabel(...)` returns `""`.
- `src/types/case.ts:130-145` shows `Attorney` has no `prefix_suffix` field.
- `src/types/case.ts:149-155` shows `Witness` does have `prefix_suffix`, which is why witness
  honorific handling is structurally easier than attorney honorific handling.
- `src/components/SpeakerPanel/SpeakerPanel.tsx:76-77`, `91-92`, `412-413` only persist
  `display_name` plus `role`; there is no separate honorific field in the UI payload.

### What the code implies

- The by-line renderer is not the root problem; it renders whatever label it is given.
- The real gap is upstream: attorney identities do not carry structured honorific metadata, and
  the panel save path does not persist honorific separately from `display_name`.
- Correct output is still possible if the stored `resolved_label` already includes `MR.` / `MS.`,
  but that is a manual label string, not a clean participant/honorific model.

### Sizing verdict

`small build`

### Why

This is bigger than a pure wiring fix. The overlay and label pipeline exist, but the app lacks a
clean structured way to derive/persist attorney honorifics from case metadata. That is a **small
capability addition** around attorney identity data, not a new speaker system.

---

## G4 — unmapped indices

**Gap:** bare `6:` / `7:` leaking as labels when raw speaker indices have no participant mapping.

### Where it is handled now

- `src/lib/transcript/speakerResolution.ts:37` assigns unmapped speakers synthetic participant ids
  like `raw:${rawSpeaker.speaker_id}`.
- `src/lib/transcript/speakerResolution.ts:39` falls back to the raw current label.
- `src/lib/transcript/workspaceParagraphs.ts:164-169` falls back to a speaker view built only from
  the raw `speakerId`.
- `src/lib/transcript/speakerIdentity.ts:310` then normalizes the fallback label rather than
  suppressing or reclassifying it.
- `src/api/workspaceService.ts:1047` also persists utterance speaker labels as
  `speaker?.display_name ?? assignment.speaker_id`, so raw ids can still leak if no resolved label
  exists.

### What the code implies

- Unmapped speakers are not a missing-path problem; they already traverse the full pipeline.
- The leak happens because the current fallback behavior is deliberately permissive: the app would
  rather render raw labels/ids than stop or surface “unmapped speaker.”

### Sizing verdict

`finish-job`

### Why

The overlay and downstream consumers already exist. The remaining work is to change the fallback
behavior and/or enforce mapping completion more strictly so bare indices never become transcript
labels.

---

## Heath Thomas Transcript ID Evidence

This audit did not query live data. From repository evidence only:

- `docs/audits/fixtures/tr_1781456706021_4bdiwu_deepgram_response.json` is a committed raw
  Deepgram fixture for the Heath Thomas deposition; multiple prior audits explicitly name it as the
  Heath Thomas transcript fixture.
- `docs/audits/TRANSCRIPT_SOURCE_OF_TRUTH_AUDIT.md` and
  `docs/audits/TRANSCRIPT_FIDELITY_GAP_AUDIT.md` identify `tr_1781559088619_7rch7i` as the later
  workspace/export transcript under live review.

### Practical takeaway

For a later live speaker-resolution validation:

- use `tr_1781456706021_4bdiwu` as the committed raw-fixture reference
- use `tr_1781559088619_7rch7i` as the likely current live-workspace/export target, subject to
  confirmation in the running app

---

## Recommended Scope for the Next Build

The next implementation should be framed as **finish/correct the existing speaker-resolution
overlay**, not “build a new speaker engine.” The code already has the right major pieces:

- overlay tables
- read/write API path
- workspace/export consumption
- transcript identity layer

The work to size next is:

1. remove permissive raw/reporter fallbacks that produce wrong transcript labels
2. tighten deterministic case-participant matching for reporter/attorney/witness names
3. add a structured attorney-honorific path or equivalent deterministic label source
4. prevent unmapped raw speaker ids from surfacing as transcript labels

That is a correction-oriented continuation of the current overlay architecture, not a greenfield
build.

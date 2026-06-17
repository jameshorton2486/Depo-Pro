# CODEX TASK — Corrections Layer: design and build the separate human-edits layer

**Run with:** `codex --profile depo --no-resume`
**Repo:** `C:\Users\james\Projects\Depo-Pro`
**Shell:** PowerShell; `;` not `&&`

This prompt is for the branch where the audit proves that workspace edits currently persist directly
into canonical transcript rows. In that case, the system needs a real corrections layer.

This is a staged architecture task:

1. read-only design + persistence audit
2. design approval artifact
3. implementation only if the design can be shipped safely on the current branch

No deploy. No push. No merge.

---

## Goal

Build the transcript correction model so a reporter can:

- edit words without re-running transcription
- reassign speakers without re-running transcription
- eventually split/merge Q/A without re-running transcription
- run `Refine` or re-transcribe later without silently losing human corrections

The architecture must be:

1. **Canonical layer**
   - raw Deepgram-derived words / utterances / timings
   - source of truth for audio sync
   - rebuilt only by retranscription or Refine

2. **Corrections layer**
   - separate persisted human corrections keyed to canonical IDs
   - append-only or revision-safe
   - never baked directly into canonical rows

3. **Display layer**
   - canonical plus corrections applied on top
   - then pure-formatting transforms applied last

---

## Governing principles

- `original_word` / `raw_text` remains immutable
- audio sync always reads canonical timings, never rendered display text
- no correction button may silently overwrite human work
- canonical rebuilds must re-apply surviving corrections where anchors still match
- when anchors no longer match after rebuild, surface a conflict; never silently drop
- do not fake this by copying corrected transcript text into canonical rows

---

## PHASE 0 — Preflight

1. Confirm repo root
2. `git branch --show-current`
3. `git status --short`

STOP and report if:

- on deploy/release branch
- unrelated dirty files make the implementation unsafe to isolate

---

## PHASE 1 — Read-only audit and design proof

Before changing code, prove all of the following.

### A. Current persistence model

Trace and report file:line for:

- word edit persistence
- speaker reassignment persistence
- review-state persistence
- any existing Q/A split/merge persistence if present

State plainly:

- edits currently live in canonical rows
- no durable corrections layer exists yet

or the opposite, if the code proves otherwise.

### B. Existing schema and reuse opportunities

Inspect current persisted structures for anything that can support the corrections layer:

- transcript audit log
- review-state tables
- suggestion tables
- speaker-resolution current/history
- any version or snapshot structures

Report what can be reused and what cannot.

### C. Proposed corrections model

Design the minimal durable corrections model needed for:

1. word text edits
2. speaker reassignment
3. correction flags/notes

Q/A split/merge can be defined now but may be implemented later if it would enlarge scope too much.

For each correction type, specify:

- anchor key
  - `word_id`
  - `utterance_id`
  - or ordered range of canonical IDs
- payload shape
- author / timestamp / status fields
- conflict behavior after canonical rebuild
- whether it is reversible and how

### D. Application model

Define where corrections are applied:

- workspace render path
- export path
- clipboard path

The correction application path must be shared. Do not fork three separate correction engines.

### E. Refine interaction

Define exactly how canonical rebuild interacts with corrections:

- rebuild canonical
- re-apply matching corrections by anchor ID
- surface non-matching corrections as conflicts
- never silently discard

### F. Deliverable

Write:
`docs/audits/CORRECTIONS_LAYER_DESIGN.md`

It must contain:

- current persistence findings
- proposed schema / structure
- application path
- conflict model
- phased implementation scope
- explicit verdict:
  - `READY TO IMPLEMENT`
  - or `STOP — schema/design risk unresolved`

Print a short summary in chat before implementing anything.

---

## PHASE 2 — Implement, only if Phase 1 verdict is READY TO IMPLEMENT

If the design requires a schema change, implement it carefully and minimally.

### Minimum implementation scope

Ship only these correction types in this prompt:

1. word text edits
2. speaker reassignment

Do not implement Q/A split/merge unless it falls out naturally and safely from the same mechanism.

### Required behavior

#### 1. Persist corrections separately

Workspace word edits and speaker reassignments must write to the corrections layer, not directly into
canonical transcript rows.

#### 2. Preserve canonical

Canonical rows remain readable and timing-complete.
Do not mutate canonical text as part of normal editing.

#### 3. Apply corrections at render time

Workspace, export, and clipboard must render:

- canonical
- plus corrections
- plus display-only formatting transforms

#### 4. Refine compatibility

After a Refine rebuild, corrections must be re-applied automatically where anchors still match.
If anchors fail to match, surface a conflict state instead of silently dropping the correction.

#### 5. Reversibility

Reporter must be able to remove or disable a correction without corrupting canonical state.

---

## PHASE 3 — Verify

Run:

- `npm run typecheck`
- `npm run test`
- `npm run build`

Add focused tests proving:

1. word edits persist outside canonical rows
2. speaker reassignment persists outside canonical rows
3. render path applies corrections without mutating canonical timings
4. Refine rebuild re-applies matching corrections
5. non-matching corrections surface as conflicts, not silent loss

Do not weaken or delete tests.

STOP on unrelated failures.

---

## PHASE 4 — Commit

Commit only if implementation completed safely.

Suggested commit message:

`feat(transcript): add separate corrections layer for human edits`

Do not push, deploy, or merge.

Final report must include:

- whether edits used to live in canonical rows
- what schema/structures were added
- which correction types are now supported
- how Refine interacts with the corrections layer
- conflict behavior
- files changed
- test/build results
- commit hash

---

## Definition of done

Success means:

- human word edits and speaker reassignments no longer persist directly into canonical transcript rows
- canonical timings remain authoritative
- workspace/export/clipboard render corrected output from a shared correction application path
- Refine no longer destroys surviving human corrections
- conflicts are surfaced instead of silently dropped

This prompt is the full architecture branch. Do not use it if the audit proves edits already exist as
a separate durable record.

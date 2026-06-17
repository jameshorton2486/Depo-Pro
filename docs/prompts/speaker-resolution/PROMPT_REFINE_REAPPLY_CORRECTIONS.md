# CODEX TASK — Refine: re-apply existing separate corrections after canonical rebuild

**Run with:** `codex --profile depo --no-resume`
**Repo:** `C:\Users\james\Projects\Depo-Pro`
**Shell:** PowerShell; `;` not `&&`

This prompt is for the branch where the audit proves that human edits already persist in a separate
durable record, outside canonical transcript rows.

If that is true, the correct next step is not a new corrections architecture. It is to make Refine
re-apply those existing corrections after canonical rebuild.

No deploy. No push. No merge.

---

## Goal

After `Refine` rebuilds canonical transcript rows from raw Deepgram JSON:

- existing separate human corrections must be re-applied automatically where their anchors still match
- corrections whose anchors no longer match must surface as conflicts
- no correction may be silently dropped

Do not redesign persistence in this prompt. Use the already-existing separate correction record.

---

## Governing principles

- canonical rebuild logic itself stays unchanged
- correction replay happens after canonical rebuild
- matching anchors re-apply automatically
- non-matching anchors become explicit conflicts
- audio sync continues to read canonical timings
- display/export/clipboard use the shared corrected render path

---

## PHASE 0 — Preflight

1. Confirm repo root
2. `git branch --show-current`
3. `git status --short`

STOP and report if:

- on deploy/release branch
- unrelated dirty files make safe isolation impossible

---

## PHASE 1 — Read-only proof first

Before changing code, prove all of the following.

### A. Existing corrections record

Identify the exact persisted correction structures already in use.

Report file:line and storage location for:

- word corrections
- speaker corrections
- any correction status / metadata / author / timestamp fields

### B. Anchor model

For each existing correction type, report how it anchors back to canonical:

- `word_id`
- `utterance_id`
- speaker id mapping
- range of ids
- other key

### C. Current Refine rebuild path

Trace:

- preview
- apply
- canonical row replacement
- post-apply reload

Report exactly where a replay step should be inserted.

### D. Conflict criteria

Define when a correction is:

- re-applicable automatically
- in conflict

For example:

- anchor id still exists -> re-apply
- anchor id missing or split incompatibly -> conflict

### E. Deliverable

Write:
`docs/audits/REFINE_CORRECTION_REPLAY_PLAN.md`

Include:

- existing correction store
- anchor model
- replay insertion point
- conflict criteria
- verdict:
  - `READY TO IMPLEMENT`
  - or `STOP — separate correction record not actually sufficient`

Print a short summary in chat before implementing.

---

## PHASE 2 — Implement replay, only if verdict is READY TO IMPLEMENT

### Required behavior

#### 1. Replay after rebuild

After Refine replaces canonical transcript rows, replay all still-valid separate corrections onto the
rebuilt transcript state.

#### 2. Conflict surfacing

If a correction can no longer be applied cleanly because its anchor is gone or incompatible:

- do not silently discard it
- mark it as conflict / unresolved
- surface it for reporter review

#### 3. Shared corrected output

Workspace, export, and clipboard must all reflect the post-rebuild corrected state from the same
shared correction application path.

#### 4. Preserve current Refine safety gate

Do not remove confirmation/snapshot protections already added. Replay is layered on top of that.

---

## PHASE 3 — Verify

Run:

- `npm run typecheck`
- `npm run test`
- `npm run build`

Add focused tests proving:

1. a correction with a surviving anchor re-applies after Refine
2. a correction with a missing anchor becomes a surfaced conflict
3. no correction is silently dropped
4. canonical timings remain intact
5. workspace and export both reflect replayed corrections

Do not weaken or delete tests.

STOP on unrelated failures.

---

## PHASE 4 — Commit

Commit only if implementation completed safely.

Suggested commit message:

`feat(refine): re-apply separate corrections after canonical rebuild`

Do not push, deploy, or merge.

Final report must include:

- which correction records were replayed
- where replay runs in the Refine path
- conflict criteria
- how conflicts are surfaced
- files changed
- test/build results
- commit hash

---

## Definition of done

Success means:

- Refine rebuilds canonical rows
- existing separate corrections re-apply automatically where valid
- invalid anchors surface as conflicts
- no correction is silently lost
- workspace/export/clipboard stay aligned

This prompt is only for the branch where a real separate correction record already exists.

# Codex Task — STEP 5: migrate downstream readers to the resolved participant view

**Mode: IMPLEMENTATION. Audit-first. BETA_FREEZE in effect.** May be ONE commit or a short
sequence (see Task 0); if split, each sub-commit independently verified.

**Forward-looking prompt:** assumes Steps 1–4 landed (overlay live for normalization +
reassignment; resolver is the single read authority for the panel). Task 0 re-verifies. If
state differs, STOP and report.

Step 5 of `SPEAKER_RESOLUTION_ARCHITECTURE_DECISION`. Migrate the remaining **downstream
readers** that still read raw speaker labels directly, so they consume the resolver's resolved
participant view. After this, the overlay is the single participant authority for export and
editor content — and the Stage S export finally consumes resolved participants (the thing that
makes the long-deferred visual diff meaningful).

Known reader sites (re-confirm in Task 0):
- `src/lib/buildEditorContent.ts:16` (workspace/editor content)
- `src/components/ExportScreen/exportDocx.ts:108` (Stage S participant builder)
- `src/components/ExportScreen/docxFormatter.ts:181` (legacy painter)
- `src/components/ExportScreen/exportAssembly.ts:13` (TXT export)
- `src/components/ExportScreen/ExportScreen.tsx:366` (export snapshot → editor doc mapping)

**A reverted prototype of the export-reader wiring exists** (from the out-of-order experiment).
It is a useful starting point for `exportDocx.ts` / `buildStageSParticipants`, but it was NOT
certified and lacked the neutrality test below. Treat it as reference, re-derive properly.

---

## THE CERTIFYING REQUIREMENT — read first

The gate for this step is **NOT** "aliasing works." It is **empty-overlay byte-identity**:

> With ZERO overlay rows, every migrated reader must produce **byte-identical** output to
> pre-Step-5 behavior.

Because the resolver's no-overlay fallback reproduces current label/role, wiring it in must
change nothing for un-resolved transcripts. The aliasing improvement only appears when overlay
rows exist. Both must be proven. A reader migration that changes empty-overlay output is a
regression, not a feature.

---

## Task 0 — Audit first (read-only; report before coding)

1. **Re-verify state.** Steps 1–4 in place; resolver is the read authority for the panel.
   Confirm the five reader sites still read raw speaker labels directly. Quote each.
2. **Per reader, the exact swap.** For each of the five, what raw speaker value does it read,
   and what resolver output replaces it? Confirm the resolver already exposes what each needs
   (label, role, grouped `speakerIndices` for Stage S). If a reader needs something the
   resolver doesn't expose, report it (small resolver addition may be needed — flag, don't
   assume).
3. **Sourcing the overlay at read time.** Each reader needs the overlay rows for its
   transcript. Where does each reader get its data, and is the overlay already loaded alongside
   (as the resolver expects), or must it be loaded? Prefer reusing the load path Step 3
   established; do NOT add new queries without reporting.
4. **One commit or several?** Recommend whether the five migrate cleanly in one commit or
   should be sequenced (e.g. export readers together, editor-content separately). Bias toward
   the smallest safe units, each with its own neutrality proof.
5. **The neutrality test mechanism.** How to assert byte-identical empty-overlay output per
   reader — e.g. snapshot the current output for a no-overlay fixture, then assert the migrated
   reader matches. Confirm the test harness supports this.

**Stop and report Task 0.**

---

## Task 1 — Migrate readers to the resolver

- Switch each reader from raw speaker label → resolver's resolved participant view.
- Stage S (`exportDocx.ts:108`) feeds `buildIndexMap` grouped participants
  (`speakerIndices: [...]`) — this is where aliased labels finally render as continuous
  `Q.`/`BY MR. NUNEZ:` in export.
- Do NOT change the resolver's logic or Stage S itself; only the feed.
- Raw tables are READ-only here (never written); this step only changes reads.

## Task 2 — Tests (the gate)
- **Empty-overlay byte-identity** per migrated reader: no overlay rows → output identical to
  pre-Step-5. THIS IS THE CERTIFYING TEST.
- **Aliasing in export:** with overlay rows grouping `[2,5,7] → one participant`, Stage S export
  emits continuous `Q.` under one `BY MR. NUNEZ:` attribution. (The prototype's regression test
  is a starting point.)
- Editor content reflects resolved participants when overlay exists; unchanged when it doesn't.

---

## Verification gate (report all, per commit if sequenced)
- `git rev-parse HEAD` before/after (parent = certified Step 4 commit, or prior sub-commit).
- `git status --porcelain` clean.
- `npm run typecheck` tail.
- `npm test` before/after counts.
- Files changed.
- One-paragraph note: which readers migrated; **empty-overlay output proven byte-identical**;
  raw never written; resolver/Stage S logic unchanged (only the feed); aliasing now visible in
  export.

## Commit (if single)
```
feat(speakers): route downstream readers through resolved participant view

Step 5 of the speaker-resolution overlay architecture. Migrates editor content
and the export readers (Stage S participant builder, legacy painter, TXT
assembly, snapshot mapping) to the resolver's resolved participant view. With
no overlay rows, output is byte-identical to before (proven); with overlay rows,
aliased labels render as one participant. Raw read-only; resolver/Stage S
logic unchanged.
```

## Do NOT
- Do NOT write any raw table.
- Do NOT change resolver logic or Stage S algorithms — only what feeds them.
- Do NOT migrate without the empty-overlay byte-identity proof for that reader.
- Do NOT add new queries without reporting in Task 0.
- One concern per commit. Full verification block each.
```

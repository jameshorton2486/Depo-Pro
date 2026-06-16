# TRANSCRIPT_FIDELITY_AUDIT

## Summary

- `DEST`: `docs/audits`
- Source docs imported from: `C:\Users\james\Downloads`
- Mode: read-only audit
- Consistency gate: `PASS`

## Stale Files Deleted

- `docs/audits/TRANSCRIPT_FIDELITY_BACKLOG.md`

## Canonical Files Placed

- `docs/audits/TRANSCRIPT_GEOMETRY_STANDARD.md`
- `docs/audits/MORSONS_TRANSCRIPT_RULES.md`
- `docs/audits/TRANSCRIPT_ASSEMBLY_STANDARD.md`
- `docs/audits/WORKSPACE_EDITING_AND_PROOFING.md`
- `docs/audits/TRANSCRIPT_FIDELITY_BACKLOG.md`
- `docs/audits/GEOMETRY_ENGINE_DEFINITION.md`
- `docs/audits/GEOMETRY_ENGINE_RULES.md`

## 4a. Consistency Gate

Result: `PASS`

Checks verified:

- Tab model resolves to Model A everywhere it is asserted:
  - `docs/audits/TRANSCRIPT_GEOMETRY_STANDARD.md`
  - `docs/audits/GEOMETRY_ENGINE_RULES.md`
  - `docs/audits/TRANSCRIPT_FIDELITY_BACKLOG.md`
- Hanging indent resolves to wrap at `0.0"` / left text margin:
  - `docs/audits/TRANSCRIPT_GEOMETRY_STANDARD.md`
  - `docs/audits/GEOMETRY_ENGINE_RULES.md`
- Honorific spacing resolves to one space after honorific periods, while preserving separate two-space colon and sentence-ending rules:
  - `docs/audits/MORSONS_TRANSCRIPT_RULES.md`
  - `docs/audits/GEOMETRY_ENGINE_DEFINITION.md`
  - `docs/audits/TRANSCRIPT_ASSEMBLY_STANDARD.md` §16
- No live `UFM_FORMATTING_DATA.md` reference remains except the allowed breadcrumb:
  - `docs/audits/TRANSCRIPT_ASSEMBLY_STANDARD.md:3`
- `GEOMETRY_ENGINE_DEFINITION.md` explicitly states it does not consume `TRANSCRIPT_ASSEMBLY_STANDARD.md`:
  - `docs/audits/GEOMETRY_ENGINE_DEFINITION.md:124`

Open conflicts intentionally not hard-failed by this gate:

- Dash glyph conflict `#3`
- `EXAMINATION` / `BY` alignment conflict `#4`

Both remain tracked in `docs/audits/TRANSCRIPT_ASSEMBLY_STANDARD.md` §16 as open.

## 4b. Duplicate-Rule Audit

### Intentional Cross-Reference

1. Open-conflict register ownership
   - Rule: all open transcript-fidelity conflicts point back to Assembly §16
   - Files:
     - `TRANSCRIPT_ASSEMBLY_STANDARD.md` §16
     - `TRANSCRIPT_GEOMETRY_STANDARD.md`
     - `MORSONS_TRANSCRIPT_RULES.md`
     - `GEOMETRY_ENGINE_RULES.md`
     - `WORKSPACE_EDITING_AND_PROOFING.md`
   - Classification: `Intentional cross-reference`

2. Former-name breadcrumb
   - Rule: `TRANSCRIPT_ASSEMBLY_STANDARD.md` is formerly `UFM_FORMATTING_DATA.md`
   - Files:
     - `TRANSCRIPT_ASSEMBLY_STANDARD.md`
   - Classification: `Intentional cross-reference`

### Duplicated Authority

1. Tab model values
   - Rule: Model A tab stops (`360 / 900 / 1440 / 2160 / 2880`)
   - Files:
     - `TRANSCRIPT_GEOMETRY_STANDARD.md` §5
     - `GEOMETRY_ENGINE_RULES.md` §0.1
     - `TRANSCRIPT_FIDELITY_BACKLOG.md`
   - Classification: `Duplicated authority`
   - Owner per hierarchy: `TRANSCRIPT_GEOMETRY_STANDARD.md`
   - Cleanup direction: reduce `GEOMETRY_ENGINE_RULES.md` and backlog references to pointers where exact values are not needed inline

2. Hanging-indent rule
   - Rule: wrapped Q/A and colloquy return to `0.0"`
   - Files:
     - `TRANSCRIPT_GEOMETRY_STANDARD.md`
     - `GEOMETRY_ENGINE_RULES.md`
     - `TRANSCRIPT_FIDELITY_BACKLOG.md`
   - Classification: `Duplicated authority`
   - Owner per hierarchy: `TRANSCRIPT_GEOMETRY_STANDARD.md`

3. Honorific-spacing resolution
   - Rule: one space after honorific periods
   - Files:
     - `MORSONS_TRANSCRIPT_RULES.md`
     - `GEOMETRY_ENGINE_DEFINITION.md`
     - `TRANSCRIPT_ASSEMBLY_STANDARD.md` §16
   - Classification: `Duplicated authority`
   - Owner per hierarchy: `MORSONS_TRANSCRIPT_RULES.md`
   - Note: the Assembly copy is appropriate as conflict-register history; the engine-definition copy is the one most likely to be reduced to a reference later

### Conflicting Authority

- None found on resolved decisions

### Expected Divergence Pending Open Conflict

1. `EXAMINATION` / `BY` alignment
   - Files:
     - `TRANSCRIPT_ASSEMBLY_STANDARD.md` §16
     - `GEOMETRY_ENGINE_DEFINITION.md`
     - `GEOMETRY_ENGINE_RULES.md`
   - Classification: `Expected divergence pending open conflict #4`

2. Dash glyph
   - Files:
     - `TRANSCRIPT_ASSEMBLY_STANDARD.md` §16
     - `MORSONS_TRANSCRIPT_RULES.md`
     - `GEOMETRY_ENGINE_RULES.md`
   - Classification: `Expected divergence pending open conflict #3`

## 4c. Spec-to-Code Locus Map + Divergence

### 1. `TRANSCRIPT_GEOMETRY_STANDARD.md`

- Likely governing loci:
  - `src/lib/buildEditorContent.ts`
  - `src/lib/transcript/workspaceParagraphs.ts`
  - `src/extensions/UtteranceNode.ts`
  - `src/index.css`
  - `src/components/ExportScreen/docxFormatter.ts`
  - `src/components/ExportScreen/exportDocx.ts`
- Current state: `Partially satisfies`
- Evidence:
  - Workspace and export share one paragraph model (`buildTranscriptParagraphs(...)` -> `buildTranscriptDocxParagraphSpecsFromParagraphModel(...)`)
  - DOCX path has explicit tab stops and hanging-indents in `docxFormatter.ts`
  - Workspace still uses CSS/layout classes rather than a dedicated geometry engine, so UFM-exact page/line shaping is only partially represented
- Missing / divergent:
  - No dedicated geometry engine exists
  - Pagination/render invariants from the spec are distributed across renderer code rather than enforced by one geometry layer

### 2. `MORSONS_TRANSCRIPT_RULES.md`

- Likely governing loci:
  - `src/editor/stageS/colloquy.ts`
  - `src/editor/stageS/lineBuilder.ts`
  - `src/lib/transcript/speakerIdentity.ts`
  - `src/index.css`
  - Read-only reference only: `reference/wave8/backend/corrections/typography.py`
- Current state: `Partially satisfies`
- Evidence:
  - Active code normalizes speaker/honorific presentation and colon spacing
  - Workspace CSS already supports display italics in transcript rendering
  - No active application-side punctuation/number/date correction engine exists in `src/`
- Missing / divergent:
  - No live `depo_qa_fixer.py` or equivalent deterministic correction engine in the active runtime
  - Most Morson language rules remain specification-only today

### 3. `TRANSCRIPT_ASSEMBLY_STANDARD.md`

- Likely governing loci:
  - `src/validation/intakeValidation.ts`
  - `src/types/case.ts`
  - `src/lib/normalizeCaseRecord.ts`
  - `src/components/ExportScreen/exportDocx.ts`
- Current state: `Partially satisfies`
- Evidence:
  - The codebase has case/intake structures and validation for caption/court metadata
  - Export code currently focuses on transcript-body rendering, not full assembly of caption/appearances/index/certificate pages
- Missing / divergent:
  - No Assembly Engine exists
  - No runtime component builds the page sequence defined in the assembly standard
  - Certificates, indexes, and caption-page ordering are not implemented as an active engine

### 4. `WORKSPACE_EDITING_AND_PROOFING.md`

- Likely governing loci:
  - `src/components/TranscriptEditor/TranscriptEditor.tsx`
  - `src/api/workspaceService.ts`
  - `src/lib/buildEditorContent.ts`
  - `src/extensions/WordMark.ts`
  - `src/extensions/ConfidencePlugin.ts`
  - `src/lib/transcript/speakerIdentity.ts`
- Current state: `Partially satisfies`
- Evidence:
  - Live editor exists and saves through `workspaceService.ts`
  - Confidence/review plumbing exists (`reviewed`, checklist loading, confidence plugin)
  - Speaker identity and transcript structure are already surfaced in the workspace
- Missing / divergent:
  - The spec’s richer Word-style structural editing remains incomplete
  - Structural-edit serialization is still an open design area

### 5. `TRANSCRIPT_FIDELITY_BACKLOG.md`

- Likely governing loci:
  - No single runtime locus; roadmap artifact only
- Current state: `Not addressed`
- Evidence:
  - The file is planning inventory, not runtime behavior
  - It references future engine work rather than defining active execution paths

### 6. `GEOMETRY_ENGINE_DEFINITION.md`

- Likely governing loci:
  - `src/lib/transcript/workspaceParagraphs.ts`
  - `src/lib/buildEditorContent.ts`
  - `src/components/ExportScreen/docxFormatter.ts`
  - `src/components/ExportScreen/exportDocx.ts`
- Current state: `Partially satisfies`
- Evidence:
  - Current code already respects a shared paragraph representation across workspace/export
  - Some boundary separation is already visible: identity resolution upstream, geometry-ish rendering downstream
- Missing / divergent:
  - No dedicated Geometry Engine module exists
  - Responsibilities and refusal boundaries are spread across existing render code rather than implemented as one engine

### 7. `GEOMETRY_ENGINE_RULES.md`

- Likely governing loci:
  - `src/components/ExportScreen/docxFormatter.ts`
  - `src/extensions/UtteranceNode.ts`
  - `src/index.css`
  - `src/editor/stageS/colloquy.ts`
  - `src/editor/stageS/lineBuilder.ts`
- Current state: `Partially satisfies`
- Evidence:
  - Deterministic label/QA/colloquy shaping already exists in multiple active files
  - Export formatter already encodes Q/A tab stops and attribution handling
- Missing / divergent:
  - No single implementation consumes this rule set as an engine contract
  - Workspace geometry and export geometry still depend on separate renderer technologies, even though they now share paragraph structure

## 4d. Engine Readiness

- Geometry Engine: `READY`
  - Boundary, transforms, and core geometry values are all documented; only open conflicts `#3` and `#4` remain unresolved
- Assembly Engine: `READY`
  - The assembly standard defines page inventory, ordering, gating, and field ownership clearly enough for an implementation prompt
- Editing Engine: `NOT READY`
  - `WORKSPACE_EDITING_AND_PROOFING.md` is strong, but the structural-edit serialization design remains explicitly open
- Procedural Reconstruction Engine: `NOT READY`
  - Referenced by other docs, but no standalone definition/contract doc yet
- Index Engine: `NOT READY`
  - Rules are referenced inside Assembly, but no dedicated engine-boundary spec exists
- Certificate Engine: `NOT READY`
  - Assembly describes variants and placement, but there is no dedicated engine definition yet
- Punctuation / Correction Engine: `NOT READY`
  - Morson rules exist, but there is not yet a dedicated implementation-boundary spec for the active app runtime

## Observations

- The imported set is internally consistent on the resolved decisions that matter most for future implementation prompts.
- The current codebase is strongest in shared transcript representation, workspace rendering, export parity, and editing foundations.
- The biggest gap is not missing docs; it is the absence of dedicated runtime engines for geometry, assembly, and language normalization.
- The imported backlog is correctly non-authoritative and should stay that way.

## Closing

No application code was modified and no engine was implemented as part of this task.

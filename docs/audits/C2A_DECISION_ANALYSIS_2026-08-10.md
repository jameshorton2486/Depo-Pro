# C2a Decision Analysis — confirmStructure, keepRawLabels, and the export/workspace divergence

---
authority_tier: T5
status: ACTIVE
owner: Architecture
scope: c2a-confirmstructure-keeprawlabels-decision
supersedes: null
superseded_by: null
approved_by: null
version: null
effective_date: 2026-08-10
ratified_date: null
last_reviewed: 2026-08-10
next_review: 2027-08-10
ratification: NOT_REQUIRED
implementation_status: NOT_APPLICABLE
---

Date: 2026-08-10 · Read-only analysis (no code changes). Controlling architecture: Raw Evidence → Controlled AI Proposals → One Working Transcript → Workspace Human Review → UFM/Certification.

This report supports three owner decisions. It states current behavior and recommends the simplest behavior consistent with the controlling architecture; the **exact decisions requiring approval** are listed per section. It does not implement anything.

## 0. Headline — the highest-consequence finding first

**The reporter can review one structure and certify a different one.** The Workspace render is gated on `structureConfirmed` (default `false`, reset on every load), so by default it shows **raw, unstructured** speaker labels. The certified-export render (`buildCanonicalExportRenderModel`, [exportAdapter.ts:112-133](../../src/lib/export/exportAdapter.ts:112)) **ignores** `structureConfirmed` and **always** infers Q/A/COLLOQUY structure — via a **different classifier** than the Workspace uses. A reporter who reviews before pressing "Format and Correct" reviews raw labels but certifies inferred structure; even after confirming, the two classifiers (`workspacePresentation.buildTranscriptParagraphs` vs `transcriptParagraphs.buildTranscriptParagraphs`) are not guaranteed to agree. **No test covers this.** This is a certification-integrity gap (A8: rendering reads; the reviewed artifact must equal the certified artifact), and it is the strongest driver for the `line_type` migration.

## 1. `confirmStructure` / `structureConfirmed`

**Current behavior.** Ephemeral reducer boolean ([DocumentContext.tsx:52,287](../../src/context/DocumentContext.tsx:287)), default `false`, force-reset to `false` on every `LOAD_OK` ([:117](../../src/context/DocumentContext.tsx:117)). Gates `shouldInferStructure = structureConfirmed && !keepRawLabels` in the **Workspace** render only ([buildEditorContent.ts:226](../../src/lib/buildEditorContent.ts:226)). Set only by the FormatCorrectBanner's two buttons. **Never persisted** (no DB column, no API field, no `structure_confirmed` anywhere). Design smell: the banner flips it → `saveNow()` → `loadDocument()` which resets it to `false`, so the flag does not survive the reload the banner itself triggers.

**Effect on data.** None — it selects a display projection; `buildDisplayDocument` is a pure in-memory re-derivation, never written back. Confirming structure changes no stored words or speaker records.

**Confidence-signal dependency (decisive).** Surfacing "what the AI is uncertain about" for the reporter is **not a UI change** — it's a change to the classifier's **output contract**. Q/A/COLLOQUY/PARENTHETICAL classification is purely deterministic (speaker-role → `q`/`a` mapping, [cfe.ts:172-181](../../src/lib/format/cfe.ts:172); regex parenthetical), and the output types (`WorkspaceParagraphDescriptor`, `TranscriptParagraph`) carry **no** confidence/uncertainty field. The only confidence-adjacent data — `FormattedLine.flags` `LOW_CONFIDENCE` (acoustic < 0.70) and `UNCERTAIN_SPEAKER` (no role) — is **dropped at the paragraph layer** (paragraph types have no `flags` field). So an uncertainty affordance requires either (a) emitting a real per-classification confidence from the classifier, or (b) plumbing the existing line flags through the paragraph layer as a partial proxy.

**Legitimate product requirement.** A reporter decision point over inferred structure. But today it is an all-or-nothing, non-persisted, one-time toggle — not review.

**Recommended target behavior.** Keep the concept, redefine it as an **explicit Workspace human-review affordance**: where the classifier is uncertain (or a line carries `UNCERTAIN_SPEAKER`/`LOW_CONFIDENCE`), surface that for the reporter rather than silently applying an automatic all-or-nothing structural authority. The reviewer's decisions **persist as `line_type` per utterance** — this affordance is the front-end of the `line_type` authority.

- **UI implications:** replace the binary "confirm all" button with per-item review of flagged structure; accepted/overridden decisions are visible and revertible.
- **Persistence implications:** reviewed structure must persist per utterance (`line_type`); today nothing does.
- **Effect on `line_type`:** this **is** the `line_type` authority's write path. Settling `confirmStructure` = defining how reviewed structure is captured and persisted.
- **Effect on `qaFixer` retirement:** `qaFixer`'s heuristic Q/A splitting is precisely the "hidden automatic structural authority" to be replaced. Persisted, reviewed `line_type` is the surviving owner that lets `qaFixer` retire.
- **Risks:** the classifier-contract change is real work (not a UI tweak); the export divergence (§0) must be closed in the same migration or the review is meaningless.

**Exact decisions requiring approval:**
- D1. Redefine `confirmStructure` as an uncertainty/review affordance (recommended), or remove it entirely?
- D2. Add a per-classification confidence/uncertainty signal to the classifier output contract, or start with the existing `LOW_CONFIDENCE`/`UNCERTAIN_SPEAKER` flags as an interim proxy?
- D3. Persist reviewed structure as `line_type` per utterance (the migration's core)?

## 2. `keepRawLabels`

**Current behavior.** Ephemeral reducer boolean ([DocumentContext.tsx:53](../../src/context/DocumentContext.tsx:53)), default `false`, reset on load; set only by the banner's "Keep Raw Labels" button, which also sets `structureConfirmed: true`. When true, the render keeps the **provider speaker labels** ("SPEAKER 1:", from `deepgram_speaker` index) instead of inferred roles/names. **Never persisted.**

**Relationship to raw evidence.** It is **not** the immutable raw-evidence layer — that is the separate `RenderLayer` `"canonical"` mode (`CanonicalBaselineView`, per-word `raw_text`, read-only, Pipeline Inspector). `keepRawLabels` is a **competing display variant of the working transcript** on the labels/structure axis; word text still resolves through the working-text overlay, not raw evidence.

**Certified-output reach.** The certified **DOCX** ignores `keepRawLabels` (always inferred) — raw labels cannot reach the signed DOCX. **But** the Export screen's `.txt` / package-JSON / "copy transcript" use `buildFormattedTranscriptText(..., { keepRawLabels })` ([transcriptDownloads.ts:17](../../src/lib/transcript/transcriptDownloads.ts:17), [ExportScreen.tsx:144-151](../../src/components/ExportScreen/ExportScreen.tsx:144)), so **provider labels ("SPEAKER 1:") can reach the delivered `.txt`/JSON artifacts** — an asymmetry between certified DOCX and secondary exports.

**Legitimate product requirement.** Unclear and probably thin: a session escape hatch to reject inference and keep provider labels. It does not serve the raw-evidence need (the canonical view already does), and it introduces a second user-facing transcript representation.

**Recommended target behavior.** Raw Deepgram labels stay available as **internal immutable evidence** (the canonical/evidence view), **not** as a normal user-facing transcript representation. Remove `keepRawLabels` as a competing working-transcript mode; if reporters genuinely need provider labels during review, expose them only through the **explicit evidence/diagnostic view**, not the normal transcript. Separately, close the `.txt`/JSON raw-label path so delivered artifacts don't carry provider labels.

- **UI implications:** remove the "Keep Raw Labels" button; if needed, a labeled evidence/debug view.
- **Persistence implications:** none (removal simplifies).
- **Effect on `line_type`:** in the target (persisted reviewed `line_type`), "raw labels" is simply the pre-review state, not a competing mode.
- **Effect on `qaFixer` retirement:** removes one competing display mode, moving the render toward a single authority.
- **Risks:** confirm with Miah whether provider-label visibility is a real review need before removing; the `.txt`/JSON leak is a correctness issue regardless of the decision.

**Exact decisions requiring approval:**
- D4. Remove `keepRawLabels` as a working-transcript display mode (recommended), keeping raw labels only in the evidence view?
- D5. Is provider-label visibility a real reporter review need (→ explicit evidence view) or not (→ remove)? (Miah input.)
- D6. Close the `.txt`/package-JSON raw-label path so secondary exports match the certified DOCX?

## 3. Export/workspace divergence (see §0)

**Exact decision requiring approval:**
- D7. Adopt the principle **"the reporter certifies exactly what she reviewed"** — one persisted, reviewed structural authority (`line_type`) consumed by **both** the Workspace render and the export/certification render, replacing the two divergent classifiers and the `structureConfirmed`-gated-vs-unconditional asymmetry? (This is the same migration D1–D3 imply, viewed from the certification side.)

## Recommended migration sequence (once D1–D7 are settled)

1. Add a structural confidence/uncertainty signal to the classifier output contract (or adopt the line-flag proxy) — D2.
2. Persist reviewed `line_type` per utterance; Workspace surfaces uncertainty for review and writes decisions — D1/D3.
3. Route **both** the Workspace render and `buildCanonicalExportRenderModel` through the persisted `line_type` (one authority) — D7; unify/retire the divergent second classifier.
4. Retire `qaFixer` through the four-part deletion gate (its responsibility now owned by reviewed `line_type`).
5. Remove `keepRawLabels` as a transcript mode (evidence view retains raw labels) and close the secondary-export leak — D4/D6.

## Cross-cutting risks

- The whole sequence is behavioral and touches the certified-output path — **BETA_FREEZE gates it**; these are product decisions to settle first, then a scoped migration.
- The classifier-contract change (D2) is the item most likely to be under-estimated as "just UI."
- Gating on clean input: the correction/inference tuning must run against a verified clean baseline, not chunk-interleaved data (see the Thomas-baseline caveat tracked separately).

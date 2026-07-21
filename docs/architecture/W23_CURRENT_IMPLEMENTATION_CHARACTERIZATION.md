# Wave 23 — Current Implementation Characterization

**Governs:** Wave 23 (Deposition Production) — implementation reality
**Type:** Checkpoint (Wave 23.1), not a sprint. Read-only characterization.
**Generated:** 2026-07-13

> **What this is.** A map of what the pre-workspace pipeline **actually is in
> code today** — not what the architecture says, not what the implementation plan
> assumed. Architecture answers "what should exist?"; this answers "what exists?"
> The two should converge. This checkpoint exists because the code moved ahead of
> the plan: the plan's extraction targets (`workspacePresentation.ts`,
> `qaFixer.ts`) are already deleted, and several proposed "new" modules already
> exist under other names.

---

## Actual pipeline ordering (from `supabase/functions/transcribe-callback/index.ts`)

```
raw Deepgram parse
  → integrityAudit()                     raw payload integrity
      → [fail] persistManualReviewTranscript + status=needs_manual_review
  → advanceOrFinalizeMultifileJob
  → mergeSourceTranscriptSegments()      multifile merge → canonical
  → auditCanonicalTranscript()           canonical integrity gate
  → boundaryEngine (pre/off/post record, formal opening)
  → buildPreWorkspaceStructure()         speakers + utterance line-types + inclusion pages
  → persist finalized working-layer state
```

The plan's Phase A/B ("explicit callback ordering, pre-workspace orchestrator,
`needs_manual_review` routing") is **already implemented** here.

---

## Module characterization

| Module (lines) | Owns (actual) | Consumed by | Depends on | Status |
|---|---|---|---|---|
| `integrityAudit.ts` (329) | Raw Deepgram payload integrity audit | transcribe-callback | types | 🟢 Active |
| `normalize.ts` (260) | Deepgram → canonical speaker/utterance/word rows | callback, transcriptRepository | types | 🟢 Active |
| `multifileMerge.ts` (452) | Merge ordered source segments → canonical merged transcript | callback | types, normalize | 🟢 Active |
| `canonicalIntegrity.ts` (138) | Post-normalize/merge integrity gate — **currently only timing + duplicate checks** | callback | multifileMerge, normalize | 🟡 Active but thin |
| `boundaryEngine.ts` (258) | Pre/off/post-record cutoff, formal opening, synthetic parentheticals | callback | — | 🟢 Active |
| `preWorkspaceStructure.ts` (119) | **Pre-workspace orchestration** — speakers + utterance line-types (Q/A/SP/PN/HEADER) + inclusion pages | callback | speakerResolutionEngine, transcriptParagraphs, structuredTranscript | 🟢 Active |
| `speakerResolutionEngine.ts` (677) | **Speaker semantics** — roles, speaker map, mid-depo verification, attribution overrides, exam transitions | workspaceService, preWorkspaceStructure, structuredTranscriptPackage, transcriptParagraphs | — | 🟢 Active |
| `structureEngine.ts` (569) | **Structure** — block classification, Q/A vs colloquy, objection extraction, split, flow validation | (assembly) | — | 🟢 Active |
| `depositionRegionEngine.ts` (115) | **Region model** — CAPTION/PROCEEDINGS/TESTIMONY/CERTIFICATION | structuredTranscriptPackage, transcriptParagraphs | structuredTranscript | 🟢 Active |
| `transcriptParagraphs.ts` (1229) | **Paragraph production** — semantic assignments, by-lines, workspace paragraphs, render text | package, preWorkspaceStructure | speakerResolutionEngine, depositionRegionEngine, qaStructureUtils, paragraphDisplayImprovements | 🟢 Active |
| `structuredTranscriptPackage.ts` (435) | **Contract assembly** — versioned workspace-ready package (speaker/paragraph/boundary producers) | buildEditorContent, transcriptDownloads | depositionRegionEngine, speakerResolutionEngine, transcriptParagraphs | 🟢 Active |
| `correctionRegistry.ts` (363) | **Central deterministic registry** — token/phrase/multiword corrections, garble maps, stutter rules (DP-012) | correctionEngines, correctionOrchestrator, cfe | — | 🟢 Active |
| `correctionEngines.ts` (387) | Deterministic correction application (metadata, confirmed spellings) | correctionValidator | correctionRegistry | 🟢 Active |
| `correctionValidator.ts` (267) | Correction-log validation (verbatim, consistency, evidence, speaker) | formattingEngine | correctionEngines | 🟢 Active |
| `correctionOrchestrator.ts` (317) | Correction report / defect layers | **CorrectionsPanel, DocumentContext (render-time)** | correctionRegistry | 🟠 Active but render-consumed (drift) |
| `formattingEngine.ts` (223) | Geometry checks + block formatting | (render) | correctionValidator | 🟢 Active |
| `aiReview.ts` (254) | AI residual review (prompt version, review rows, skip logic) | (AI trigger) | — | 🟢 Active |

---

## Planned → Implemented → Remaining

### Already exists (do NOT rebuild)
- Raw integrity audit · normalize · multifile merge · canonical integrity gate
- Boundary semantics · pre-workspace orchestration
- **Speaker resolution** (`speakerResolutionEngine.ts`)
- **Structure reconstruction** (`structureEngine.ts` + `depositionRegionEngine.ts`)
- **Paragraph production** (`transcriptParagraphs.ts`)
- **Contract assembly** (`structuredTranscriptPackage.ts`)
- Deterministic corrections + central registry · correction validation
- AI residual review · `needs_manual_review` routing

### Partial (exists, but incomplete or drifted)
- **`canonicalIntegrity.ts`** — has timing + duplicate; **missing** ordinal contiguity, orphan word/utterance detection, post-merge overlap residue, explicit word/utterance coherence.
- **`correctionOrchestrator.ts`** — consumed at **render time** (`DocumentContext`, `CorrectionsPanel`) rather than upstream. Ownership drift vs the "render is presentation-only" target.
- **Review-queue curation** — `correctionValidator.ts` validates the correction log; a *curated, ranked unresolved-review queue* for the workspace is only partially present.

### Missing (genuine new work)
- **Canonical integrity extensions** (the checks above) — highest-value additive gap.
- **`entityRegistry.ts`** — a working-layer case-term registry (witness/attorney/firm/case-style/repeated terms) feeding speaker resolution + corrections + AI. Distinct from `keytermDerivation.ts`, which is **recognition/Deepgram-focused**, not a working-layer registry.
- **Recognition benchmarking** — Wave 21, separate track.

---

## Obsolete portions of the original plan (superseded by reality)

| Plan item | Reality | Action |
|---|---|---|
| Create `speakerResolution.ts` (extract from render) | `speakerResolutionEngine.ts` exists | **Drop** — already done |
| Create `structureReconstruction.ts` | `structureEngine.ts` (+ `depositionRegionEngine.ts`) | **Drop** — already done |
| Create `preWorkspaceOrchestrator.ts` | `preWorkspaceStructure.ts` + callback sequencing | **Drop / optional DRY** |
| Create `punctuationNormalization.ts` | `formattingEngine.ts` + `correctionRegistry.ts` | **Drop** — covered |
| Extract from `workspacePresentation.ts` | Deleted | **Moot** |
| Trim `qaFixer.ts` | Deleted | **Moot** |

---

## Rewritten roadmap — remaining work only (Wave 23.1 → TP-1)

1. **Extend `canonicalIntegrity.ts`** (+ `canonicalIntegrity.test.ts`): ordinal contiguity, orphan detection, overlap residue, word/utterance coherence. Additive, read-only gate, honors "never mutate `raw_text`." **Highest-value, lowest-risk first sprint.**
2. **Re-scope `correctionOrchestrator.ts` ownership** off render-time consumers (`DocumentContext`/`CorrectionsPanel`) toward upstream review assembly. Behavior-preserving.
3. **`entityRegistry.ts`** — working-layer case-term registry (only if not already served well enough by `keytermDerivation.ts` for the working layer).
4. Review-queue curation on top of `correctionValidator.ts`.

Then TP-1 (Proceedings Events) continues on the existing region/structure modules.

**Constraint (unchanged):** do not rewrite canonical raw transcript state to "look
better." All remaining work is either a stricter read-only gate, an ownership
move, or an additive registry — never a mutation of `raw_text`, word identity,
timing, or confidence.

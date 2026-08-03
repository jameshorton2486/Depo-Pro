# Canonical Transcript Architecture Audit

**Phase:** Transcript Architecture Audit (read-only findings)
**Date:** 2026-08-02
**Branch:** `feat/canonical-transcript-audit`
**Method:** Three independent read-only code traces (speaker identity/boundaries/proceedings; corrections/STT; rendering/canonical-vs-presentation), each citing `file:line`, cross-checked against the documented design (`docs/architecture/W22-2A_STRUCTURED_TRANSCRIPT_CONTRACT.md`, `W23_REGION_MODEL.md`, `W23B_CANONICAL_INTEGRITY.md`). Five load-bearing claims were independently re-verified from source (§4). No files were modified.

> This document records **findings only**. It proposes no fixes and ratifies no target design — the prescriptive companions (`CANONICAL_TRANSCRIPT_GOVERNANCE.md`, `CANONICAL_TRANSCRIPT_ARCHITECTURE.md`, `TRANSCRIPT_CORRECTION_POLICY.md`) require the design decisions in §6, which are the reporter/owner's call.

---

## 1. Thesis

The documented design mandates **single semantic ownership** per responsibility (W22-2A: "ownership must remain singular"; W23: one region owner, regions immutable once assigned). The code does the opposite in every domain examined: **authority for each responsibility is spread across 3–4 layers, and TypeScript and Python re-implement the same jobs with drift.** In two cases the documented owner file does not exist in the tracked tree.

This is the transcript-side analog of the Intake finding ("no single formatting authority"): correction, speaker, and structure semantics are re-derived in the presentation layer on every render instead of being resolved once upstream and read read-only.

---

## 2. Authoritative source per responsibility (as-built)

| Responsibility | Documented owner | Actual authority (as-built) |
|---|---|---|
| **Speaker identity** | `speakerResolutionEngine.ts` (W22-2A:301-305) | **Owner file does not exist** (tracked). Split across ingest write, two divergent API resolvers, and a render-time regex override. |
| **Utterance boundaries** | single boundary decision | Decided in `normalize.ts`; then **re-numbered post-completion** by `boundaryEngine`; plus a non-round-tripping presentation re-boundary in `qaFixer`. |
| **Proceedings / region** | one immutable region owner (W23) | **Not persisted at all.** Reconstructed at render by **three independent constructors** (2 TS + Python). |
| **Editorial corrections** | single registry (ATIA intent) | **No single registry.** Canonical text written by `editor-api`; proposals in `corrections` tables; deterministic rules duplicated across TS display, dead TS code, and Python. |
| **Rendering** | one Structured Transcript Contract | Two consumer paths (editor TipTap, Python DOCX export) derive from `EditorDocument`; the Contract is built **only** on the export path; nothing enforces parity. |
| **Canonical writes** | edge functions only | ✅ **Correct** — canonical mutation is cleanly isolated to `editor-api` + `ai-review` edge functions. |
| **Integrity gate** | read-only validation | ✅ **Correct** — `canonicalIntegrity.ts` is a pure read-only gate (matches W23B). |
| **DOCX/PDF layout** | layout-only | ✅ **Correct** — Python `formatter_core` reads no canonical data; `export-adapter` edge fn is authz/staging only. |

---

## 3. Findings by domain

### 3.1 Speaker identity
- **Documented owner absent.** `speakerResolutionEngine.ts` exists only in gitignored `.tmp/pr18/` — not in the tracked tree. (Verified, §4.)
- **Redundant storage, no constraint.** The same fact is stored in **three name columns** (`display_name`, `speaker_label`, `assigned_name`), **two role columns** (`role`, `speaker_role`), **two index columns** (`deepgram_speaker`, `speaker_index`), synced only by writer convention.
- **Two API resolvers disagree.** `workspaceService.ts:111` = `assigned_name || speaker_label || display_name` vs `editor-api/index.ts:409` = `assigned_name || display_name || speaker_label` — 2nd/3rd fallbacks swapped → same speaker can display different names by path. (Verified, §4 — concrete defect.)
- **Render-time override is a 4th authority.** `workspacePresentation.buildDisplayDocument` (`:376-528`) re-infers name/role from regex and overrides the DB-resolved values at render (`:516,:524`), reconciled back to nothing.
- **Two identity tables, no FK.** `transcript_speakers` (human) vs `speaker_resolution_current` (AI staging table, not a view) coordinated only by imperative clear-on-confirm call sites.

### 3.2 Utterance boundaries
- **Boundary decision** is made once in `normalize.ts` (`splitUtterancesBySpeaker`, canonical ids) — good.
- **But two sequential writers of the authoritative fields.** `ingestTranscript` sets ordinals; then post-completion `runBoundaryEngine` **re-numbers `ordinal`/`utterance_index`** and, on throw, **swallows the failure silently** (`transcriptFinalize.ts:840-845`) — leaving ingest-era ordinals.
- **AI-fabricated rows in the authoritative table.** `boundaryEngine.generateSyntheticParentheticals` persists synthetic recess/resume utterances with no Deepgram provenance.
- **Dual ordering columns** (`ordinal` vs `utterance_index`) both consumed; only `utterance_index` contiguity is validated.
- **Presentation re-boundary never round-trips.** `qaFixer` splits/merges DB utterances into Q/A/COLLOQUY paragraphs at render — a second "where a turn ends" authority.

### 3.3 Proceedings
- **Not stored.** No region/proceedings column; region is recomputed in-memory each render (`depositionRegionEngine.classifyDepositionRegions`).
- **Three independent constructors** (Verified, §4 — two share the name `buildTranscriptParagraphs`): `workspacePresentation.ts:647` (editor; inserts PROCEEDINGS), `transcriptParagraphs.ts:140` (export; testimony-only, drops caption/proceedings), Python `classifier.py`+`caption.py` (DOCX; rebuilds from intake metadata).
- **Fabricated text with no provenance.** Python `classifier.py:410-431` synthesizes entire oath exchanges never spoken; TS synthetic paragraphs carry empty word lists — both violate the W22-2A provenance invariant.
- **Duplicated regex + divergent fallbacks.** "solemnly swear" appears in ≥3 modules; objection-speaker fallback is `"MR. RAMON"` (TS) vs `"COUNSEL"` (Python).

### 3.4 Editorial corrections
- **No single registry.** Canonical corrected text is written only by `editor-api` (`working_text`); proposals live in `corrections`/`correction_runs`/`correction_decisions`; the deterministic rule inventory is `correctionRegistry.ts` (display) — but the **same rules are duplicated** in Python `spec_engine/corrections.py` and in the dead `correctionEngines.ts`.
- **Objection-spacing drift, incl. internal TS inconsistency.** `correctionRegistry.ts:154` emits `Objection. Form.` (one space) while `:216` emits `Objection.  Form.` (two spaces); Python emits one space. (Verified, §4.)
- **`correctionEngines.ts` is dead** — canonical-capable (mutates `working_text`) but imported only by its own tests. (Verified, §4 — latent duplicate.)
- **Display ≠ canonical.** `cfe.ts` *shows* corrections (garble/date/number/stutter) without persisting them; unless a reporter accepts a correction, canonical `raw_text` keeps the garble → the correction a user sees is not the correction stored.
- **Hidden auto-apply.** `ai-review` legacy mode can silently overwrite `working_text` when `AI_REVIEW_AUTO_APPLY` is on — competing with "AI proposes, human disposes."
- **Structural corrections accepted but not applied.** `qa_split`/`objection_attribution` decisions are logged but not written to canonical (`pending_reason=structural_apply_engine_v2`), so accepted state and canonical text can disagree.

### 3.5 Rendering
- **Two consumer paths, no enforced parity.** Editor (TipTap via `buildEditorContent`+`cfe`) and export (Python via `UnifiedRenderModel`) both derive from `EditorDocument`, but assemble paragraphs with *different* builders and the editorial rewrite (`applyEditorialRulesToRenderModel`) runs **only on export** → on-screen ≠ DOCX.
- **6 boundary violations** (presentation doing canonical work): consumer-local speaker resolution; consumer-local Q/A reconstruction; deterministic corrections inside the formatter; export-only editorial rewrite; two competing paragraph assemblers; the editor bypassing the Structured Transcript Contract entirely.

---

## 4. Independently re-verified claims

| Claim | Result |
|---|---|
| `speakerResolutionEngine.ts` not in tracked tree (only `.tmp/pr18`) | ✅ confirmed |
| `correctionEngines.ts` has no production import (dead/test-only) | ✅ confirmed |
| Two `buildTranscriptParagraphs` (`workspacePresentation.ts:647`, `transcriptParagraphs.ts:140`) | ✅ confirmed |
| Objection-spacing drift, incl. TS-internal (`:154` 1-space vs `:216` 2-space) vs Python 1-space | ✅ confirmed (worse than reported) |
| Swapped coalesce precedence `workspaceService.ts:111` vs `editor-api:409` | ✅ confirmed (concrete name-display defect) |

---

## 5. Design-vs-code divergence
- **W22-2A** (single owners + full provenance) — violated: 4-way speaker authority; provenance-free synthesized proceedings/boundary rows.
- **W23_REGION_MODEL** (one classifier → immutable regions) — violated: region recomputed in ≥4 places, persisted nowhere.
- **W23B_CANONICAL_INTEGRITY** — ✅ matches code (read-only gate).
- **ATIA/TIE blueprint** — the intended single design; the wired bridge (`aiCorrectionBridge` + `corrections` tables + `editor-api` apply) is Phase 1; the Python `services/tie/` mirror and the whole `transcript_formatter/` deterministic app remain outside the live web pipeline.

---

## 6. Open design decisions (required before the prescriptive docs)
These are ratification calls, not findings:
1. **Correction persistence:** should deterministic display corrections (`cfe`/`qaFixer`) be **recorded as corrections against canonical**, or remain display-only? (Resolves display≠canonical drift.)
2. **Single paragraph-assembly owner:** consolidate the two `buildTranscriptParagraphs` into one, shared by editor + export? Which becomes authoritative?
3. **Python `transcript_formatter/` status:** authoritative, deprecated, or reference-only? (Resolves TS-vs-Python duplication and drift.)
4. **Speaker identity owner:** restore/create the single `speakerResolutionEngine` owner and forbid consumer-local re-inference?
5. **`AI_REVIEW_AUTO_APPLY`:** retain the hidden-mutation path, or remove it in favor of proposals-only?
6. **Proceedings/region:** persist as canonical, or keep recomputed — and if recomputed, single owner?

---

## 7. Scope notes
- Read-only; no code changed.
- The `corrections`/`correction_runs` **schema drift** surfaced by the DB-types work (those tables exist in local migration `20260729120000`, not on prod) is a **related but separate** workstream (`fix/edge-database-types`, blocked on the prod-vs-local schema-authority decision). Do not couple it into the transcript refactor.
- `CANONICAL_FIELD_GOVERNANCE.md` / `CANONICAL_FORMATTING_ARCHITECTURE.md` (repo root) govern **case-record field normalization** — a different domain from STT/editorial correction; do not conflate.

# AI Pipeline Inventory and Simplification Map (Phase G)

---
authority_tier: T5
status: ACTIVE
owner: Architecture
scope: ai-pipeline-inventory-phase-g
supersedes: null
superseded_by: null
approved_by: null
version: null
effective_date: 2026-08-10
ratified_date: null
last_reviewed: 2026-08-10
next_review: 2027-08-10
ratification: NOT_REQUIRED
implementation_status: PARTIAL
---

Date: 2026-08-10
Branch: `feature/stage3-workspace-core`
Program: V2 Autonomous Architecture Simplification — Phase G (§21, AI Pipeline Simplification)
Method: five read-only characterization sweeps (invocation surface, TS engines, Python providers/pipeline, Python spec/ufm engines, prompt+model inventory), each applying the Complexity Justification Test (§15); cross-verified by direct source reads where two sweeps disagreed.

This document is evidence, not a ratified architecture standard. It governs the Phase G elimination plan. Dispositions marked `RETIRE`/`CONSOLIDATE` are proposals subject to the four-part deletion gate (§22); production-behavior and destructive-deletion items are flagged as Human Gates.

## Executive conclusion

The deployed AI/correction pipeline runs **entirely in TypeScript + Supabase Deno edge functions**. The entire Python `transcript_formatter/` tree is a Tkinter **desktop GUI application, wholly unwired from the deployed product** (repo-wide grep for `transcript_formatter` across `*.ts/*.tsx/*.js/*.json/*.yaml/Dockerfile` = 0 hits; no shell-out; the only `src/` references are two provenance comments). It duplicates the live TS owners and additionally **fabricates on-record content** (oath/colloquy, objection text, speaker turns) — a liability, but desktop-only and therefore not a production-corruption path.

Within the live TS surface, the "competing correction authority" problem concentrates in a **dead-or-disabled ASR-repair cluster** that a proven-clean Deepgram input makes unnecessary. The live reconstruction surface reduces to a single structural spine.

Three findings require attention beyond routine cleanup:

1. **LIVE production issue — boundary engine ships stub system prompts.** `runBoundaryEngine` is invoked best-effort from `finalizeTranscriptJob` on every completed transcript ([transcriptFinalize.ts:289](../../supabase/functions/_shared/transcriptFinalize.ts:289)); when `ANTHROPIC_API_KEY` is present (it is, in prod) it makes up to **3 paid `claude-sonnet-4-6` calls per transcript** ([transcriptFinalize.ts:541](../../supabase/functions/_shared/transcriptFinalize.ts:541), guard at :662) whose `system` prompt is a literal placeholder string — `"Boundary engine prompt 1-A/1-B/1-C"` ([boundaryEngine.ts:93,117,131](../../src/lib/transcript/boundaryEngine.ts:93)). The entire task rides in the user JSON; the model receives no instructions. Its output drives pre/off/post-record exclusion flags and synthetic `(Whereupon…)` parentheticals on the working transcript. **This was independently verified by direct source read.**
2. **`ai-review` HTTP 500 is silent and the responsibility is off-architecture.** editor-api calls the standalone `ai-review` function fire-and-forget and returns 202 ([editor-api handleForceAiReview](../../supabase/functions/editor-api/index.ts:1121)); the UI swallows the error. The default legacy path 500s before any AI call on absent `speaker_role`/`speaker_id` columns ([ai-review/index.ts:89,97](../../supabase/functions/ai-review/index.ts:89)). The flag-gated bridge path (`AI_REVIEW_BRIDGE`, off by default) would not 500 but writes `corrections`/`correction_runs` rows that **have no reader in `src/`** — orphaned output. Do not "fix the 500": the per-word `transcript_words.ai_suggestion` output shape is off-architecture vs. the target CorrectionObject model.
3. **Duplicated proposal contract across three languages.** The CorrectionObject contract is mirrored in [src/lib/transcript/correctionObject.ts](../../src/lib/transcript/correctionObject.ts), `transcript_formatter/schema/correction_object.schema.json`, and `transcript_formatter/services/tie/correction_object.py` — a genuine 3-way sync hazard to manage, not delete.

## Controlling architecture preserved

Raw Deepgram Evidence → Controlled AI Processing/Proposals → one Working Transcript → Workspace human review. AI proposals must be **CorrectionObjects over an immutable canonical baseline**, never a rewritten transcript, and AI failure must preserve the existing Working Transcript. All live TS reconstruction engines are pure functions deriving display/export output from the persisted `EditorDocument`; none mutate the stored Working Transcript, and the only mutation-capable engines are dead/unwired.

## Slice A — AI invocation surface (live)

| Item | Path | Runtime-reachable in prod? | Whole-txt or structured | Failure preserves WT? | Disposition (Risk) |
|---|---|---|---|---|---|
| `ai-review` edge fn (legacy path) | supabase/functions/ai-review/index.ts | Reachable but 500s pre-AI; result orphaned | structured (flagged tokens) | yes (writes proposal cols only) | RETIRE legacy path (C) |
| `ai-review` edge fn (bridge path) | same, `AI_REVIEW_BRIDGE` gate | OFF by default; output orphaned (no `corrections` reader) | 1 call, whole-txt→CorrectionObjects | yes | MIGRATE as seed of target TIE (D) |
| `aiReview.ts` (legacy input helpers) | src/lib/transcript/aiReview.ts | legacy path only | n/a (pure) | n/a | RETIRE with legacy (B) |
| `aiSuggestionEngine.ts` | src/lib/transcript/aiSuggestionEngine.ts | legacy path only (dead behind 500) | 1 call, structured | yes (throws to caller) | RETIRE (C); duplicate Anthropic transport |
| `aiCorrectionBridge.ts` | src/lib/transcript/aiCorrectionBridge.ts | flag-off; orphaned output | 1 call, whole-txt→CorrectionObjects | yes (rejects malformed) | KEEP/MIGRATE as canonical proposal path (D) |
| `FormatCorrectBanner.tsx` | src/components/FormatCorrectBanner | reachable; AI hop silently no-ops | — | yes (save gates reload; AI error caught) | KEEP; rewire AI to TIE, surface failures (B) |
| `AIReviewBanner.tsx` | src/components/AIReviewBanner | reachable; banner always empty in prod | — | yes | CONSOLIDATE trigger with FormatCorrectBanner (B) |
| `CorrectionsPanel/AISuggestionsSection.tsx` | src/components/CorrectionsPanel | reads legacy `ai_suggestion*`; always empty | display only | n/a | MIGRATE to CorrectionObjects (C) |

"Format and Correct" button, end to end: confirm dialog → `saveNow()` (gates) → `loadDocument()` reload → best-effort `triggerAIReview` → editor-api `handleForceAiReview` clears pending suggestion columns then fire-and-forget `fetch` to `ai-review`, returning 202. The format/save/reload is local deterministic work; the only AI hop is fire-and-forget and its result is invisible to the UI.

## Slice B — TS correction/reconstruction engines

Live spine (KEEP): `normalize.ts`, `finalizationPipeline.ts`, `canonicalIntegrity.ts`, `integrityAudit.ts` (raw-ingest gate, transcribe-callback:116), `buildBaselineContent.ts`, `workspacePresentation.ts` (workspace structure owner), `transcriptParagraphs.ts` (export structure owner), `qaFixer.ts` (live Q/A owner), `editorialEngine.ts`, `geometryEngine.ts` (live half), `depositionRegionEngine.ts`, `unifiedRendering.ts`, `structuredTranscriptPackage.ts`, `structuredTranscript.ts`, `resolveSpeakerDisplayName.ts` (canonical F9 name owner), `correctionObject.ts` (contract), `correctionOrchestrator.ts` (report only, no mutation), `paragraphDisplayImprovements.ts`.

Proven dead / non-authoritative (RETIRE or CONSOLIDATE — subject to deletion gate):

| Module | Runtime status | Duplicates | Disposition (Risk) |
|---|---|---|---|
| `correctionEngines.ts` | own test only; imported by correctionValidator for types | cfe, editorialEngine, qaFixer, ai-review | RETIRE (A) |
| `structureEngine.ts` (functions) | functions test-only; only `DialogueBlock` **type** live-imported | qaFixer, workspacePresentation, depositionRegionEngine | RETIRE fns; relocate `DialogueBlock` (B) |
| `boundaryEngine.ts` | **LIVE via finalize (see Slice A/finding #1)** — NOT dead | sole boundary owner | Decide target fit before change (D) — see Human Gate |
| `formattingEngine.ts` | own test only (re-exports checkGeometry) | exportAdapter composition + geometry | RETIRE (A) |
| `entityRegistry.ts` | own test only; every prod caller passes `null` | intended entity-match owner, never wired | RETIRE or wire (B, UNKNOWN) |
| `correctionValidator.ts` (functions) | functions test-only; `ValidationBlock` type used by formatting/geometry | validates dead correctionEngines | RETIRE fns; relocate `ValidationBlock` (B) |
| lexical half of `correctionRegistry.ts` | consumed by cfe but **gated off** (`applyLexicalCorrections:false`) in every render path | — | strip case-specific surname swaps (:87-108); keep dash/date/stutter (D) |

Cross-cutting: the real production reconstruction engine is `src/lib/format/cfe.ts` (out of this slice); both live callers pass `applyLexicalCorrections:false`, gating every `correctionRegistry` word-substitution OUT of all render paths. `correctionRegistry.ts:97-108` hard-codes case-specific surname swaps (Peterson/Maloney→Bentley) — the landmine that gate contains.

Two same-named live `buildTranscriptParagraphs` (workspacePresentation vs transcriptParagraphs) and a speaker-name resolver fork (`resolveSpeakerDisplayName` vs workspacePresentation's independent `buildSpeakerViews`) are the only real live duplication — CONSOLIDATE (D).

## Slice C+D — Python `transcript_formatter/` (entirely unwired from the product)

Entry points are `app.py`/`main.py` (customtkinter GUI) and CLI scripts. `ufm_engine` is self-declared INACTIVE ([ufm_engine/__init__.py:9-13](../../transcript_formatter/ufm_engine/__init__.py:9)). Two parallel Python AI stacks exist: a clean-but-dead structured `providers/` + `services/tie` abstraction (duplicates live TS contracts) and a legacy raw-Anthropic desktop path in `ai_tools.py`.

Fabrication findings (desktop-only, not in prod path, but liabilities):
- `spec_engine/classifier.py:417-428` — injects oath colloquy ("…do you solemnly swear…", "THE WITNESS: I do.", "(The witness was sworn.)", "(Whereupon, the deposition commenced…)") on any `OATH_RE` match. Reachable from `pipeline/processor.run_pipeline`. **Risk F.**
- `spec_engine/objections.py:145-154` — replaces spoken text with hard-coded `"Objection. Form."` and guesses the objecting counsel (falls back to literal `"COUNSEL"`).
- `spec_engine/qa_fixer.py:75-83` — splits a block and **reassigns** the new answer's speaker to a config-derived witness identity.
- `pipeline/assembler.py:34-46` — fabricates speaker role labels by word-count ranking.

Disposition: **RETIRE-VIA-DELETION-GATE for the Python engine once the desktop GUI is confirmed decommissioned** — this is a **Human Gate** (large, and it is unrelated user tooling). Harvest first: the `corrections.py` rule tables, page-geometry constants, and the UFM `.docx` template assets (preserve as format-reference corpus). Keep `prompts/bridge/full_review.md` + `schema/correction_object.schema.json` as shared cross-language spec.

## Slice E — Prompts & models (live runtime only)

Every live provider call is **Anthropic** (`api.anthropic.com/v1/messages`); no OpenAI/GPT anywhere. Models via [src/lib/aiModels.ts](../../src/lib/aiModels.ts): `PRIMARY_MODEL = claude-sonnet-4-6`, `EXTRACTION_MODEL = claude-haiku-4-5`, `HEALTHCHECK_MODEL = PRIMARY_MODEL`.

| Live prompt | Location | Reachable | Note |
|---|---|---|---|
| Boundary 1-A/1-B/1-C | boundaryEngine.ts:93,117,131 | **yes (finalize path)** | **STUB placeholder system prompts** — finding #1 |
| Boundary 1-D (spelling) | boundaryEngine.ts:145 | no (no caller) | stub |
| Bridge `BRIDGE_SYSTEM_PROMPT` | aiCorrectionBridge.ts:78 | yes if `AI_REVIEW_BRIDGE=true` | duplicate of `prompts/bridge/full_review.md` |
| Legacy `SYSTEM_PROMPT` | aiSuggestionEngine.ts:84 | yes (default path, dead behind 500) | competes with bridge |
| Structure 3-A…3-E | structureEngine.ts | no (no client caller) | stub, orphaned |
| Correction 4-E | correctionEngines.ts:265 | no | stub, orphaned; hardcoded fixtures in fallback |
| `extract-nod` extraction | supabase/functions/extract-nod | yes | real tool-use prompt (haiku) |
| `anthropic-healthcheck` | supabase/functions/anthropic-healthcheck | yes | 1-token liveness probe |

Hardcoded case-/benchmark-specific content shipping in live code (must be removed under §14/§57):
- Reporter default `"Miah Bardot, CSR No. 12129"` in [aiSuggestionEngine.ts:267](../../src/lib/transcript/aiSuggestionEngine.ts:267) and [ai-review/index.ts:208](../../supabase/functions/ai-review/index.ts:208).
- `correctionEngines.ts:131-136` oath garble `"They do."→"I do."`; fallback fixtures `"raiding"→"radiating"` (:291-301) — test-fixture logic in a shipped module (dead path).
- (Python, desktop) `ai_tools.py:413-467` benchmark garbles and objection examples naming specific attorneys.

## Elimination map (Phase G plan, ordered by safety)

**Wave G1 — proven-dead TS retirement (Risk A/B, deletion gate: zero runtime consumers → relocate shared types → delete module+test → full typecheck/build/tests):**
`correctionEngines.ts`, `formattingEngine.ts`, `correctionValidator.ts` (functions), `structureEngine.ts` (functions), `entityRegistry.ts`. Relocate the two surviving types (`DialogueBlock`, `ValidationBlock`) to a types module. Loses no live capability (owners: cfe, editorialEngine, qaFixer, geometryEngine, ai-review).

**Wave G2 — trigger + transport de-duplication (Risk B/C):** collapse the two Anthropic transports (aiSuggestionEngine vs aiCorrectionBridge) to one; consolidate the AIReviewBanner/FormatCorrectBanner trigger; single model-constant source (`_shared/models.ts` vs `src/lib/aiModels`).

**Wave G3 — ai-review consolidation (Risk C/D):** retire the legacy word-suggestion path; make the CorrectionObject bridge the single AI authority and wire a real UI reader for `corrections`; migrate CorrectionsPanel off `transcript_words.ai_suggestion`.

**Wave G4 — remove case-specific defaults (Risk B):** delete hardcoded reporter/oath/fixture content from live modules per §14.

**Wave G5 — speaker-name + paragraph-builder consolidation (Risk D):** single `buildTranscriptParagraphs` owner; route workspacePresentation speaker resolution through `resolveSpeakerDisplayName`.

## Human Gate items (do not action autonomously)

- **Boundary engine in production (finding #1):** decide whether AI boundary detection belongs in the target architecture (§8/§17/§55 — do not repair by default). Options: author real prompts, disable the unconditional finalize call, or retire. Touches live production AI behavior and cost → **Human Gate / product decision.**
- **Python `transcript_formatter/` retirement:** unrelated desktop tooling; large deletion → **Human Gate** (harvest rule tables + template assets first).
- Any production deployment, destructive DB/data migration, remote push/merge, or history rewrite (§62–§64).

## Complexity Justification summary (§15)

Every dead module answers "if it did not exist, what required capability is lost?" with **nothing** — each responsibility has a surviving live owner (cfe, editorialEngine, qaFixer, geometryEngine, depositionRegionEngine, resolveSpeakerDisplayName, ai-review bridge). The Python engine's unique behaviors (oath/objection/speaker fabrication) are ones the target architecture explicitly prohibits. The only genuine capability question is boundary/off-record detection, whose current implementation is non-functional (stub prompts) and whose target-fit is a product decision.

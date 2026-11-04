# Python transcript_formatter/ characterization — pre-retirement inventory

---
authority_tier: T5
status: ACTIVE
owner: Architecture
scope: transcript-formatter-retirement-characterization
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

Date: 2026-08-10 · Read-only characterization (no code changes, nothing deleted). Prerequisite to the `transcript_formatter/` retirement **Human Gate**: harvest/understand every rule table, template, and unique capability, and confirm surviving owners, **before** any deletion (four-part deletion gate). Evidence gathered by four parallel read-only sweeps; every claim below is grounded in a cited file/command.

## Verdict — DEAD relative to production, but NOT yet safe to delete

`transcript_formatter/` is a **standalone Windows CustomTkinter desktop GUI** (`app.py` → `main.py` → `.mainloop()`; `customtkinter`, `tkinter.filedialog`), **113 git-tracked files**, on an explicit internal deprecation path (`ai_tools.py` header "ATIA-STATUS: quarantine"; `tests/test_import_guard.py`). No production runtime path reaches it:

- **supabase/functions:** zero references (grep empty).
- **Cloud Run:** the live formatter is a **separate `formatter_core` codebase** (`formatter_service/worker.py:11` `from formatter_core import format_render_model`); neither `formatter_service/` nor `transcript_finalize_service/` imports `transcript_formatter`.
- **TS `src/`:** only **two provenance comments**, not imports (TS can't import Python): `correctionObject.ts:3` ("the JSON Schema … is the single source of truth. This module mirrors it") and `aiCorrectionBridge.ts:10-12` (prompt text copied because "the Deno Edge runtime can't read that Python service file").
- **package.json / .github CI / Dockerfiles / subprocess calls:** no invocation found. Remaining string hits are audit-scanner inputs and doc-path echoes.
- Runtime artifacts (`jobs/`, `work_files/speaker_map.json`) are **git-ignored, untracked**, and contain placeholder/test data — not real transcripts.

**Why not delete yet:** it still holds legitimate responsibilities whose surviving owner in the live pipeline is **unconfirmed** (certified structural pages) or **must be preserved** (Morson rule tables, the CorrectionObject schema-of-record). Deletion stays a Human Gate until §"Harvest checklist" is satisfied.

## Live vs. Python — what the Cloud Run `formatter_core` already replicates

The live export path is TS `exportAdapter.ts` → Cloud Run `formatter_service/worker.py` → `formatter_core`. `formatter_core` **replicates**: the transcript **body** render (line numbers, DP-011 tab geometry, wrapping, format-box, speaker/parenthetical styling) and **PDF export** (Word COM → docx2pdf → LibreOffice → ReportLab fallback). Therefore body geometry + PDF are **already owned** by the live pipeline.

**Python-only certified output — no counterpart found in `formatter_core` or the TS render model (must be confirmed present-or-intentionally-dropped before retiring `spec_engine`/`ufm_engine`):**

1. Title / style page (`spec_engine/pages/title_page.py`, templates fig17/fig25)
2. Reporter's Certification (+ exhibit certification) (`certificate.py`, `cert_exhibits.py`, fig20)
3. Caption / Appearances (`caption.py`, fig18)
4. Witness Index & Exhibit Index (`witness_index.py`, `exhibit_index.py`, fig22)
5. Changes & Signature + notary jurat (`changes_signature.py`, fig19)
6. Post-record **retroactive** spelling correction — re-opens the DOCX and globally fixes prior name uses (`post_record.py::apply_retroactive_corrections`)
7. Scopist corrections log (working artifact) (`corrections_log.py`)
8. The line-numbered 25-line bordered-table page primitive (`_lined_page.py`)

Two coexisting geometry regimes were observed (spec_engine double-spaced, margins 1.25/0.75/1.0/1.0 vs ufm_engine exact-28pt, margins 1.75/0.5/0.75/0.75); `formatter_core` follows the spec_engine/DP-011 geometry. Which is canonical is **unproven** — resolve at harvest.

### The certified-pages question — ANSWERED (2026-08-10): a live gap, not redundancy

DOC-0326 flagged "confirm the Python-only certified pages are present-or-intentionally-dropped in the live pipeline." Answered by read-only trace of every live render path:

- **ADR-0017 Decision 3 (ratified) REQUIRES them:** "Not in the Workspace body (generated at export from Intake metadata): **caption page, appearances page, certificate page, errata/signature page**, the certified 25-line format box, and line numbers."
- **No live path generates them.** `formatter_core.export_render_model_to_docx` (the only live renderer, via `formatter_service/worker.py`) emits the **transcript body + page header/footer only** — `case_style`/`cause_number`/`reporter_csr`/`certified_date` appear solely in the running header (`docx_exporter.py:55,358`), never as assembled pages. `transcript_finalize_service/` is a Deno orchestrator (no assembly). Live TS only **classifies** these regions (`depositionRegionEngine` CERTIFICATE/CHANGES-AND-SIGNATURE regexes) and **gates** on certification lock (`exportAdapter.ts`) — it never builds the pages. The Intake DATA exists (`ufm_metadata.appearances`, `time_used` "post-record certificate field"), but nothing renders it into pages.
- **Therefore** the Python `spec_engine/pages/*` + `ufm_engine` templates are the **sole existing implementation of an ADR-0017-required capability the live pipeline currently lacks** — reference implementation of an *unbuilt* live feature, **not** dead-redundant code.

**Deletion-gate consequence (sharpens the gate):** the certified front/back-matter portion of `transcript_formatter/` is **NOT safely deletable as redundant.** Before it can go, either (a) the caption/appearances/certificate/errata assembly must be **re-homed into the live export** (`formatter_core`/TS render model), or (b) the product must explicitly accept body-only certified output and ADR-0017 Decision 3 be revised. **This is a product/engineering Human Gate** — the highest-consequence open question for the retirement. (By contrast, the body render + line geometry + PDF conversion ARE replicated in `formatter_core` and are safely redundant.)

## Harvest checklist — preserve BEFORE any deletion

### A. Deterministic rule tables (the Morson/UFM correction engine)
- `spec_engine/corrections.py`: `UNIVERSAL_CORRECTIONS` (~45 regex fixes incl. `THE COURT REPORTER:`→`THE REPORTER:`, `K.`→`Okay.`, subpoena/oath garbles, Texas cause-number/highway formats), `NUMBER_WORD_MAP`+`SENTENCE_START_NUMBER_WORDS`+`NUMBER_EXCLUSION_RE` (Morson 1–10 spell-out), `VERBATIM_PROTECTED`/`AFFIRMATION_PROTECTED`, `_ABBR_RE` two-space guard, and the **8-step correction priority order** ("MUST NOT CHANGE"; step 8 = uh/um never removed).
- `spec_engine/classifier.py`: `EMBEDDED_ANSWER_STARTERS` (~50 tokens), Q/A split regexes (`ANSWER_TOKEN_RE`, `CORRECT_MID_RE`, `TRAILING_OKAY_RE`), oath/off-on-record/concluded/time detectors, exhibit + scopist-flag factories.
- `spec_engine/objections.py`: `OBJECTION_PATTERNS` + the `_resolve_objection_speaker` attribution ladder.
- `ai_tools.py`: `BASE_SYSTEM_PROMPT` **RULE SETS 1–26** — the richest single body of correction policy.
- `spec_engine/emitter.py`: typography/geometry constants (Courier New 12pt, tab stops 720/1440/2160/2880, 25 lines/page, orange-flag/navy-parenthetical colors, Q/A no-page-break).
- Note: `custom_formatter_rules.json` is **empty (`[]`)** — a user-trained runtime store; nothing to harvest from the JSON itself. All real rules are in Python.

### B. Certified-output capabilities (see Python-only list above) + UFM assets
- `ufm_engine/`: `TEMPLATE_REGISTRY` (11 keys), `template_selector` section-selection rules, `context_builder.DEFAULTS` field map, and the **10 docxtpl templates** (all Jinja-in-Word). `UFM_Field_Map_Reference.docx` is the single catalog of the UFM field vocabulary — harvest as documentation regardless of retirement.
- `spec_engine/pages/*` builders + `_lined_page.py` primitive.

### C. The CorrectionObject schema-of-record (already the TS single-source-of-truth)
`schema/correction_object.schema.json` is the canonical contract that `src/lib/transcript/correctionObject.ts` **mirrors**. 13 required fields: `id` (`corr_`+ULID), `transcript_id`, `case_id`, `specialty` (11-enum), `prompt_version`, `location`, `change` (9 type-enum, text-vs-structural shape enforced), `reason` (generic reasons rejected), `reason_kind` (9-enum), `confidence` (0–1), `provenance` (source ai|deterministic|reporter; provider required when ai; context_hash for replay), `review` (state machine), `downstream` (deferred-apply tracking). **Relocate/snapshot this schema (and the bridge prompt `prompts/bridge/full_review.md`) to a surviving home before deletion** so the two TS provenance comments don't dangle.

### D. Executable behavior spec (tests to harvest)
Pure-assertion suites under `spec_engine/tests/` are the behavior contract: `test_spec.py` (22 "Spec v1.0" acceptance tests), `test_morsons_punctuation.py`, `test_block_pipeline_behavior.py`, `test_phase1..6_verification.py`. Architecture-contract tests under `tests/`: `test_import_guard.py`, `test_providers.py`, `test_correction_object.py`. **The golden harness `test_golden.py` is currently inert** — no golden fixtures are committed (only `golden/README.md`), so golden coverage must be **generated**, not copied.

## Hazards — case-specific / fabrication rules that must NOT survive as generic behavior

- `spec_engine/models.py:326-379`: **two entire hardcoded case configs** (`default_perez_ugalde()` cause 2025-CI-12281 + ~30 `confirmed_spellings`; `default_garza_perez()` cause 2025-CI-00766) — real party/reporter names + spelling maps baked into code.
- `corrections.py` `MULTIWORD_CORRECTIONS`: hardcoded proper nouns (`Allen, Stein & Durbin, P.C.`, `Brooke Army Medical Center`, `Clean Scapes Enterprises, Inc.`, …) that would rewrite unrelated depositions; `ARTIFACT_ZIP_78216_RE` strips a literal ZIP; one-off garble fixes (`vampires are`→`OR fires are`, etc.).
- `classifier.py` / `depo_qa_fixer.py`: case/medical tokens (`fentanyl`, `in the ed`, `surgical issues`) inside answer-starter vocab.
- `main.py:5647` `_smart_guess`: reporter identity hardcoded into role detection (`"i am mia"`, `"number 12129"`).
- **Fabrication-policy conflicts vs the TS "never fabricate" stance** (`qaFixer.ts:12-19`): (a) `classifier.py:416-425` **generates a full scripted oath colloquy** on `OATH_RE`; (b) `objections.py` **guesses an objecting attorney/`COUNSEL` label** whereas TS deliberately marks objections `UNIDENTIFIED_SPEAKER`. These are behaviors to **review and reconcile**, not blindly preserve.

## Cost exposure
- **Live billed AI = legacy `ai_tools.py`** (models `claude-sonnet-4-6` + 3.5 fallbacks; N chunked 16k-token calls per transcript, plus per-call model-probe overhead). Only fires on GUI actions; nothing outside the tool triggers it.
- The **new provider adapter** (`anthropic_adapter.py`, tiers opus/sonnet/haiku, env-overridable model ids) and **`services/tie/`** are Phase-1 contracts with **no runtime caller** — imported only by their own tests (MockAdapter runs the suite with zero live calls). Relates to [[atia-tie-phase1]].

## Four-part deletion gate — status: NOT MET
1. Legitimate consumers migrated — **NO** (certified structural pages have no confirmed live owner).
2. Required behavior protected — **NO** (Morson rule tables + CorrectionObject SoT + certified pages not yet harvested/relocated).
3. Compatibility satisfied — n/a until B/C done.
4. Runtime consumer count zero — **YES for production** (dead relative to prod), but the GUI itself is a "consumer" of its own modules.

## Recommended pre-retirement sequence (all freeze-safe, read-only or additive)
1. Confirm whether the Python-only certified pages (title/caption/appearances/indexes/certification/changes-signature/post-record) are present, planned, or intentionally dropped in the live TS + `formatter_core` pipeline. This is a **product decision** (Human Gate for the answer, not the analysis).
2. Harvest rule tables (A) and the CorrectionObject schema + bridge prompt (C) into surviving governed locations; scrub every §Hazards case-specific rule so it cannot survive as generic behavior.
3. Snapshot the 10 UFM templates + `UFM_Field_Map_Reference.docx` and the `spec_engine/tests` assertion suites as the behavior contract; generate golden fixtures if golden coverage is wanted.
4. Only then, with surviving owners confirmed, schedule the deletion Human Gate.

## Notes
- Nothing here changes behavior, deletes anything, or retranscribes. `PERSISTED_LINE_TYPE_ENABLED` stays false; ADR-0018 stays DRAFT/A5. Relates to [[phase-g-ai-pipeline-simplification]], [[correct-and-format-workspace-architecture]], [[dtas-migration]], [[line-type-migration-doc0325]].
- Unproven items to close in a follow-up pass: `main.py` AI-trigger volume; contents of `tests/test_corrections.py` / `test_diff_viewer.py` / `test_save_case_files.py`; exact TS-mirror fidelity of `correctionObject.ts`; whether `ufm_engine/document_builder` build path (a 2-vs-3-arg call mismatch was observed) is ever exercised; which geometry regime (spec vs ufm) is canonical.

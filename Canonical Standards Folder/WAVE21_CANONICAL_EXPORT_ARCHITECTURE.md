# WAVE-21 — Canonical Export Architecture

> **STATUS: REFERENCE DESIGN ONLY.** This document is not an active authority.
> It describes future or proposed work. Current authoritative behavior is governed
> by `DP-010`, `DP-011`, `DP-012`, and `CANONICAL_STANDARDS_INDEX.md`.

**Initiative:** Wave 21 (architecture record)
**Status:** PROPOSED (decision adopted; execution sequencing recommended)
**Renamed from DP-012 on 2026-06-22; DP-### is reserved for formatting standards. DP-012 = Quotation Punctuation, Date Reconciliation & Inline Garble Flags.**
**Author:** Engineering review, grounded in branch `feature/stage3-workspace-core`
**Supersedes the operational recommendation in:** prior Option A/B analysis (which recommended Option B for beta)
**Freeze posture:** BETA_FREEZE is ACTIVE. This is a deliberate, staged freeze exception executed on the feature branch under the existing audit → characterize → gate → implement discipline. Nothing here merges to the deploy branch before beta exit.

---

## Governing invariant (the whole point of this document)

> **There is exactly ONE place a transcript's content can be changed, and exactly ONE engine that turns that content into formatted output. Every consumer — Workspace preview, Copy Transcript, DOCX, PDF — reads from those two singletons. No second corrector. No second formatter. Ever.**

Your instruction — *"I only want one system to make the corrections"* — is correct and it is the design constraint that governs every decision below. The rest of this report is just the disciplined way to get there without corrupting the legal record on the way.

---

## 0. Phase 0 — Audit findings (from the actual branch, not assumptions)

These are verified against the uploaded `feature/stage3-workspace-core` tree.

### 0.1 The SaaS has no formatted export today
`src/components/ExportScreen/ExportScreen.tsx` produces only:
- a **flat TXT dump** — `utteranceId [speakerId]: words`, with no Q/A structure, no speaker labels, no line numbers, no geometry; and
- a **JSON package** (metadata + the same flat text).

The screen explicitly states **"DOCX: not implemented"** and **"PDF: not implemented."** So Option A is **not a conversion of an existing SaaS DOCX writer** — there is nothing to convert. It is a **first build** of the SaaS render engine, using the wave8 Python code as a porting reference.

### 0.2 The canonical model already exists and is contract-locked
`src/api/types.ts` defines `EditorDocument { speakers[], utterances[], words[] }`. Critically:
- `Word.raw_text` is the **immutable Layer-1 ASR token** ("never write to this").
- `Word.text` is the **working override** (Layer 2).
- `Utterance.word_ids` is the ordering authority.

This is already your two-layer model, already the single source of transcript truth in the SaaS, and already marked *"never rename or reshape."* **The unified engine must consume this and nothing else.** We do not invent a new model.

### 0.3 Correction surfaces today — the multiple-system problem, named precisely
There are currently **three** places transcript content can be altered:

| # | Surface | Location | Type of change | Persisted to |
|---|---------|----------|----------------|--------------|
| 1 | **SaaS Workspace** (TipTap) | `src/components/TranscriptEditor`, `src/extensions/*`, render via `src/lib/buildEditorContent.ts` | Human edits, speaker labels, review state | `editor-api` Edge Function → `editor_apply_working_changes` RPC (utterance-grain `working_text` + append-only audit) → `transcript_words` |
| 2 | **wave8 corrections pipeline** (Python) | `reference/wave8/backend/corrections/` (`pipeline.py`, `patterns.py`, `regex_rules.py`, `legal_phrases.py`) | Automated regex/pattern rewrites | Desktop / reference only |
| 3 | **Desktop `document_builder.py`** | separate `depo_transcribe` repo (NOT in this tree) | Tab/spacing/geometry "fixes" applied at build time | Local DOCX |

This is exactly the divergence risk you flagged. Surfaces #2 and #3 can change what the record *says* outside the Workspace, which means the certified document can drift from what the reporter actually approved in the Workspace. **That is the thing Option A exists to kill.**

### 0.4 wave8 is a usable porting reference, not a competitor
`reference/wave8/backend/` contains a complete, well-structured render chain:
`PaginatedDocument` → `GeometryProfile`/`engine.py` → `docx_writer.py` / `pdf_writer.py` / `rtf_writer.py` / `txt_writer.py`. The DOCX writer already handles Courier New, 28pt line spacing, UFM margins, format-box borders, line-number prefixes, and page breaks. **We port its geometry and rendering logic; we discard its correction logic.**

### 0.5 The geometry authority is in genuine conflict (HARD STOP — see §2.1)
Two internal specs disagree and **cannot both be right**:

| Parameter | wave8 `profile.py` (claims authoritative) | Your canonical note (memory / formatting rules) |
|-----------|-------------------------------------------|--------------------------------------------------|
| Right margin | **0.75″** (1080 twips) → text area exactly 6.5″ | **1.0″** |
| Left margin | 1.25″ (1800 twips) | 1.25″ (agree) |
| Q./A. designation tab | 0.25″ (360) | 0.5″ (720) |
| Q/A text tab | 0.625″ (900) | 1.0″ (1440) |
| Full tab set | 360 / 900 / 1440 / 2160 / 2880 | 720 / 1440 / 2160 + center tab |
| Line spacing | exactly 28pt | 480 twips (24pt) double-spaced |
| Chars/line target | 56–63 | (not specified) |

wave8 explicitly argues the 1.0″/720 values are a *"compliance failure"* (6.25″ text area too narrow for 56–63 cpl). Your formatting rules argue the opposite tab geometry. **Per your own ground-truth rule, neither internal spec wins — the certified Etminan PDF is the highest authority, and the resolved numbers must be *measured from it*.** Building the engine on either guessed set risks corrupting the geometry of every future transcript.

### 0.6 `abbreviation_registry.json` reality check
At the time this architecture note was drafted, the working assumption was that `abbreviation_registry.json` was **absent from this tree**.

That statement is now superseded.

Current repo reality:

- `Canonical Standards Folder/abbreviation_registry.json` exists in the tree
- live code imports it via `src/lib/format/abbreviationRegistry.ts`
- current formatting paths already consume that shared registry

This architecture note should therefore be read as historical design context, not as a current-state audit on registry presence. The remaining Wave 21 work, if revived later, should assume the registry is already present and wired.

---

## 1. The decision, reframed: what "one system" actually means

"One system" resolves into **two singletons**, because there are two genuinely different operations people lump under "correction":

**A. Content correction — ONE surface: the Workspace.**
Changing words, speaker assignments, Q/A structure, and review state. This is a human, legal act (the reporter certifies). It happens only in the TipTap Workspace and persists only through the `editor-api` path into the canonical `transcript_words`. AI *proposes* (suggestions), the reporter *confirms*. No regex pipeline, no build-time rewriter, no desktop tool may change content.

**B. Deterministic formatting — ONE engine: the Canonical Format Engine (CFE).**
Applying DP-010 spacing, abbreviation handling (from `abbreviation_registry.json`), Q/A line layout, Return-To-Margin continuation, tab stops, line numbering, pagination, and geometry. This is presentation, not content. It is a **pure function** of `(canonical document + locked geometry)` and it produces identical results for every output channel.

### Target architecture

```
                         ┌──────────────────────────────┐
   Deepgram (Layer 1) →  │   Canonical Document          │   ← the ONLY source of truth
   raw_text immutable    │   (EditorDocument: words,     │     (src/api/types.ts)
                         │    utterances, speakers)       │
                         └──────────────┬─────────────────┘
                                        │
                    ┌───────────────────┴────────────────────┐
                    │                                         │
        ONE correction surface                     ONE format engine (CFE)
        (TipTap Workspace)                          pure(model, geometry) → formatted lines
        human edits → working_text                          │
        → editor-api → transcript_words          ┌──────────┼───────────┬───────────┐
                                                 │          │           │           │
                                            Workspace     Copy        DOCX         PDF
                                            preview     Transcript   renderer    renderer
                                            (same CFE)   (same CFE)  (CFE+docx)  (CFE+pdf)
```

Every renderer is a thin adapter over the **same** CFE output. If the DOCX and the Copy and the on-screen preview ever differ, it is a renderer bug — never a formatting-logic divergence, because there is only one formatting logic.

### What gets retired
- **wave8 corrections pipeline** (`corrections/pipeline.py`, `patterns.py`, `regex_rules.py`) — retired as an authority. Any *deterministic* rule worth keeping is re-expressed inside the CFE as a formatting pass; anything that *changes content* is dropped (content is a Workspace act).
- **Desktop `document_builder.py`** — retired as a correction/export authority once the SaaS DOCX renderer reaches certified-parity (§4). Until then it stays read-only as the comparison oracle, then is sunset.
- **The flat-TXT export** in `ExportScreen.tsx` — replaced by CFE-rendered TXT.

---

## 2. Hard prerequisites (gates before any rendering code is written)

### 2.1 GATE — Resolve geometry against certified Etminan (DP-011)
Produce a single locked geometry record by **measuring the certified Etminan PDF** (Cause No. C-5722-24-L), not by choosing between the two internal specs. Measure and lock, in order:
1. Right margin (settles 0.75″ vs 1.0″) and resulting text-area width.
2. Left margin (expected 1.25″ — confirm).
3. Q./A. designation tab and Q/A text tab (settles 360/900 vs 720/1440).
4. Full tab-stop set.
5. Line spacing (settles 28pt vs 24pt) and verified 25 lines/page.
6. Characters-per-line range actually present in the certified record.

Output: a `GeometryProfile` constant set, committed as the **DP-011 Canonical Geometry record**, that the CFE imports. This is the one number set; `profile.py`'s values are reconciled to it (not adopted blindly). **No DOCX/PDF code is written until this gate closes.**

### 2.2 GATE — Bring `abbreviation_registry.json` into the SaaS
Place the registry at one shared SaaS path and make the CFE the sole importer. No per-module abbreviation lists. If the canonical copy currently lives only in the desktop repo, copy it in and record provenance. The CFE's DP-010 spacing pass reads from this file exclusively.

### 2.3 GATE (approval) — Schema posture decision
The migration can be done **without schema changes** if rendered artifacts are generated on demand and not persisted. You will need an explicit decision (not an assumption) on two points, each of which may or may not touch schema:
- **(a) Artifact persistence:** generate DOCX/PDF on demand (no schema) vs. store generated artifacts (new table/storage policy — schema touch, needs approval).
- **(b) Correction grain:** today `working_text` is **utterance-grain** with an append-only audit row. The post-freeze, word-grain corrections overlay you've planned is **out of scope** for this migration. The CFE must consume the *current* utterance-grain model as-is. Do not change correction grain inside this work.

Default recommendation for beta: **on-demand generation, no schema change, keep utterance-grain.** Smallest, safest, reversible.

---

## 3. Phased implementation plan (audit-first, one scoped commit per step)

Run exactly as you already work: `codex --profile depo --no-resume`, Phase 0 = findings + hard stop, one scoped commit per change, no `git add -A`, no push/merge without approval. Each phase has an explicit acceptance gate; do not advance until it is green and browser-verified.

### Phase 0 — Findings + DP-011 measurement (no production code)
- Confirm the §0 findings on the current HEAD.
- Execute §2.1 (measure Etminan) and §2.2 (registry) and §2.3 (schema decision).
- **Gate:** DP-011 geometry record committed; registry present; schema posture approved. **Hard stop for sign-off.**

### Phase 1 — Canonical Format Engine, core (the heart)
- New module `src/lib/format/` (TS, framework-free, pure functions).
- Input: `EditorDocument` + locked `GeometryProfile`. Output: an ordered list of **formatted logical lines** carrying role, text, and tab/indent intent (a `FormattedDocument` IR) — *no* page math yet.
- Implement the DP-010 spacing pass (one space after honorifics/abbreviations from the registry; two spaces after sentence-enders and after speaker-label colons; closing-quote rule; `No.` carve-out; DP-012 lowercase direct-address titles per the approved capitalization rule), Q/A line construction, speaker-label construction, attribution-after-objection, and Return-To-Margin continuation modeled as explicit tab stops with `left_indent = 0` (never a negative first-line indent).
- **Gate:** unit tests pass on Heath Thomas + Etminan fixtures; golden FormattedDocument snapshot reviewed. No UI wired yet.

### Phase 2 — Wire CFE into Workspace preview + Copy Transcript first (parity proof, zero export risk)
- Point the Workspace render (`buildEditorContent.ts`) and Copy Transcript at the CFE output so what the reporter sees and copies is already the canonical formatting.
- **Why first:** this proves the engine against the live editor before any file format exists, with no export surface to break.
- **Gate:** Workspace preview and Copy output match the FormattedDocument golden; reporter browser-verifies on a real job.

### Phase 3 — Paginator + line numbering
- Add `src/lib/format/paginate.ts`: 25 lines/page, line numbering, page breaks, caption/header placement — ported from wave8 `pagination/` + `geometry/engine.py`, expressed against the locked DP-011 profile.
- **Gate:** page/line counts match certified Etminan pagination on the reference job.

### Phase 4 — DOCX renderer (SaaS-native)
- `src/lib/format/render/docx.ts` using the `docx` library (already in your stack). Port the *geometry and drawing* logic from wave8 `docx_writer.py` (section margins, Courier New 12pt, locked line spacing, format-box borders, line-number column, page breaks). It consumes the paginated CFE output only.
- Decide call site: a new export action in `ExportScreen.tsx` (and/or an Edge Function if generation must be server-side for large jobs — flag if so).
- **Gate:** generated DOCX passes §4 certified-parity diff against Etminan.

### Phase 5 — PDF renderer + ExportScreen cutover
- `src/lib/format/render/pdf.ts` (mirror of DOCX from the same paginated IR).
- Replace the flat-TXT/JSON-only `ExportScreen` actions with CFE-backed TXT + DOCX + PDF. Keep TXT/JSON available during transition.
- **Gate:** all four channels (preview, Copy, DOCX, PDF) render from one CFE call and agree.

### Phase 6 — Retire the second and third correctors
- Remove wave8 corrections pipeline from any live path; keep `reference/wave8/` read-only as historical reference.
- Sunset desktop `document_builder.py` as an authority once Phase 4 parity holds; document that the SaaS is now the sole certified-DOCX path.
- **Gate:** a written statement in the decision record that content corrections occur only in the Workspace and formatting occurs only in the CFE; no other path can mutate the record.

---

## 4. Parity / validation strategy (certified Etminan is the oracle)

The certified 72-page Etminan deposition is the acceptance oracle, consistent with your evidence hierarchy.
- **Golden-file tests:** render the Etminan canonical document through the CFE at each phase and diff against the certified PDF — page count, lines/page, line numbering, Q/A indents, speaker labels, spacing (DP-010), and direct-address capitalization (DP-012).
- **Spacing assertions:** explicit tests for the absolute rule — never two spaces after an honorific/abbreviation period; two spaces after sentence-enders and speaker-label colons; closing-quote spacing.
- **Regression fixtures:** Heath Thomas as the second corpus to catch over-fitting to Etminan.
- **Edge cases** from your pre-beta list applied to the engine: zero flagged words, very short (<30s), very long (30+ min), refresh-during-save.
- **Definition of done for parity:** a reporter, comparing the SaaS DOCX to the certified Etminan side by side, finds no geometry or spacing difference. Only then does Phase 6 retire the desktop builder.

---

## 5. Risk register & freeze posture

| Risk | Severity | Mitigation |
|------|----------|------------|
| Migration is large and lands during BETA_FREEZE | High | Staged on the feature branch; behind on-demand generation; Phases 2 proves the engine with **zero** export risk before any file renderer exists |
| Geometry built on a guessed spec corrupts every transcript | High | §2.1 hard gate — measure certified Etminan, lock DP-011, no render code before close |
| Schema creep | Med | §2.3 default: on-demand generation, no schema change; any storage table is a separate approved decision |
| Correction grain change sneaks in | Med | Explicit out-of-scope: CFE consumes current utterance-grain model; word-grain overlay stays post-freeze |
| Two correctors linger | Med | Phase 6 retirement is a named deliverable with a written sole-authority statement |
| Desktop parity not reached → premature cutover | High | Desktop stays the oracle until §4 parity holds; cutover is gated, not dated |

**Honest scope note.** Your prior analysis was right that this is "a whole project," and the freeze instinct that produced Option B was sound. What changes the calculus is finding 0.1: there is no SaaS export to defer to, so "ship beta on the desktop path" means shipping a beta whose certified output lives outside the product. Choosing Option A now means the single source of truth is *inside* Depo-Pro from day one — which is the correct long-term architecture and the only way to honor "one correction system." The recommended sequencing (Phase 2 before any renderer) lets you build it without gambling the beta: if timelines tighten, you can pause after any green gate and the product is still coherent.

---

## 6. What to tell Codex right now (immediate next action)

> Phase 0 only — findings and gates, no production code.
> 1. Confirm on current HEAD: `ExportScreen.tsx` emits TXT/JSON only (no DOCX/PDF); `EditorDocument` in `src/api/types.ts` is the sole canonical model; corrections persist via `editor-api` → `editor_apply_working_changes` (utterance-grain); `reference/wave8/backend/` is reference-only and not wired into the live export.
> 2. Do **not** search this repo for `document_builder.py` — it lives in the separate `depo_transcribe` app.
> 3. Open the geometry conflict explicitly (§0.5) and **stop**: do not pick 0.75″/1.0″ or 360/720 — await the DP-011 values measured from the certified Etminan PDF.
> 4. Confirm the live registry import path for `abbreviation_registry.json` and treat older "absent from tree" language in this document as superseded historical context.
> 5. Await sign-off on the §2.3 schema posture before any Phase 1 work.

---

## Appendix A — DP-011 conflict resolution table (to be filled from certified Etminan)

| Parameter | wave8 value | canonical-note value | **Etminan-measured (LOCK)** |
|-----------|-------------|----------------------|------------------------------|
| Right margin | 0.75″ | 1.0″ | ____ |
| Left margin | 1.25″ | 1.25″ | ____ |
| Q./A. tab | 0.25″ (360) | 0.5″ (720) | ____ |
| Q/A text tab | 0.625″ (900) | 1.0″ (1440) | ____ |
| Tab set | 360/900/1440/2160/2880 | 720/1440/2160 (+center) | ____ |
| Line spacing | 28pt | 24pt (480 twips) | ____ |
| Lines/page | 25 | 25 | 25 (verify) |
| Chars/line | 56–63 | — | ____ |

## Appendix B — Single-authority acceptance checklist (Phase 6 sign-off)

- [ ] Content can be changed only in the Workspace; persisted only via `editor-api`.
- [ ] Formatting is produced only by the CFE; every channel renders from one CFE call.
- [ ] wave8 corrections pipeline is on no live path.
- [ ] Desktop `document_builder.py` is sunset as an authority; SaaS is the sole certified-DOCX path.
- [ ] `abbreviation_registry.json` is the only abbreviation source; no per-module lists.
- [ ] DP-011 geometry is locked from certified Etminan and is the only geometry constant set.
- [ ] DOCX/PDF/Copy/preview all pass certified-Etminan parity.

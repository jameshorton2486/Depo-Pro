# PROMPT — AI Transcript Structuring Engine

> **STATUS: HISTORICAL / SUPERSEDED (2026-07-13).** This monolithic prompt is
> retained for historical reference only. It has been superseded by the
> architecture-aligned **DEPO-PRO Transcript Compiler Prompt Library** at
> `docs/prompts/transcript-compiler/` (see `MASTER_TRANSCRIPT_COMPILER_PROMPT.md`
> and its per-layer modules W21/W22/W23/TP-5/W24/W25/W26). New rule work happens
> in the owning module, not here. Per the Prompt–Architecture Ownership Rule
> (`docs/architecture/W0_ENGINEERING_OPERATIONS_STANDARD.md`), every rule has
> exactly one architectural owner.
>
> **STATUS: REFERENCE DESIGN ONLY.** This document is not an active authority.
> It describes future or proposed work. Current authoritative behavior is governed
> by `DP-010`, `DP-011`, `DP-012`, and `CANONICAL_STANDARDS_INDEX.md`.

**Branch:** `feature/stage3-workspace-core`
**Mode:** Architecture + bounded implementation
**Status:** BETA_FREEZE active — this layer must be **additive, derived, and flag-gated (default OFF)**. It must not alter the core `upload → transcribe → fix/review → export` loop, must not mutate canonical data, and must not introduce a database schema change without an explicit, separately-approved freeze exception.

> **Canonical formatting authority (read first).** All spacing, abbreviation, geometry, and capitalization behavior in this prompt is governed by the active standards set, in this order of authority — the certified *Etminan* transcript outranks all of them:
> - **DP-010 — Sentence Boundary & Abbreviation Spacing** (APPROVED): one unified rule for every `.` `?` `!` — *sentence boundary → two spaces, abbreviation → one space*. Consolidates DP-009 (honorific spacing), which is retained for history only.
> - **`abbreviation_registry.json`** (canonical data): the **single source of truth** for which trailing periods are abbreviations. Read the list from the registry — never hardcode it per-module.
> - **DP-011 — Canonical Geometry Authority** (APPROVED): geometry, tab placement, format box, and return-to-margin continuation.
> - **DP-012 — Quotation Punctuation, Date Reconciliation & Inline Garble Flags** (APPROVED): quote/dash and question-mark placement (§6 rules below), inline garble-flag convention (DP-004b), the date-ordinal rule, and direct-address capitalization. A professional title used as direct address *without* a surname is **not** capitalized (`Good afternoon, doctor.`). See DP-002b in §6.

---

## 1. Purpose and the core distinction

Build an **AI Transcript Structuring Engine**: a derived layer that takes the canonical, time-aligned transcript and produces a *structured representation* of it (Q/A designation, speaker attribution, objections, procedural parentheticals, formatting) suitable for a legal transcript — **without rewriting the underlying record**.

The single distinction that governs every decision in this prompt:

> **The AI builds a better *representation* of the transcript. It does not rewrite the transcript.**

This is a structuring engine, **not** a correction or rewrite engine. The raw Deepgram output and the canonical timed layer remain immutable. The AI's output is a derived view that points back into the canonical layer by reference.

If this distinction is honored, the platform retains everything already built: click-word-to-play-audio, confidence highlighting, transcript diffing, auditability, replayability, and legal defensibility. If it is violated — if the AI is allowed to overwrite words, utterances, or timings — every one of those properties is silently lost. **Do not cross that line.**

---

## 2. Architectural position

The engine sits between the canonical layer and the rendering layer. It does not replace either.

```
Deepgram RAW response            (immutable artifact in storage)
        │
        ▼
Canonical Timed Layer            (transcript_words, transcript_utterances,
  word timestamps,                transcript_speakers — SACRED, never mutated)
  confidence scores,
  speaker clusters,
  audio links
        │
        ▼
AI Structuring Layer  ◀── this prompt   (derived; references back into canonical
  Q/A, speakers, objections,             via source_utterances / source IDs)
  procedural parentheticals,
  formatting — all by reference
        │
        ▼
Workspace Rendering Layer        (TipTap / buildEditorContent;
  renders the structured view,           click-to-audio, confidence,
  preserves source linkage)              diff, RAW↔Structured toggle)
```

This maps directly onto the existing two-layer model: **Layer 1 (canonical timed) is sacred; Layer 2 (Q/A structure, speaker names, objections, formatting) is rebuildable.** The AI works entirely in Layer 2, carrying `source_utterances` back-references into Layer 1 so audio sync and provenance survive a full rebuild.

---

## 3. Non-negotiable invariants

**The AI MAY:**
- classify line/paragraph type (Q, A, colloquy, objection, parenthetical, header)
- segment and group utterances into structured blocks
- attribute blocks to resolved speaker identities
- normalize *pure formatting* (sentence-boundary spacing, time format, label casing). Spacing rule **(DP-010, APPROVED — Sentence Boundary & Abbreviation Spacing)**: at every `.`/`?`/`!`, decide sentence boundary (**two** spaces) vs abbreviation (**one** space) using the **canonical abbreviation registry** (`abbreviation_registry.json`) — do not hardcode the list. **Two** spaces after a sentence-ending `.`/`?`/`!` and after the speaker-label colon (and after a **closing quote** when the sentence ends inside it: `hurting."  And`); **one** space after registry tokens (`Mr.` `Ms.` `Dr.` `M.D.` `No.` `a.m.` `p.m.`, single-letter initials, inner-dotted abbreviations). Running-text honorifics stay **mixed case**. Quotation-mark and terminal punctuation placement follows **DP-012** (Morson 92/16/108/91): closing quote *before* an interrupting dash; question mark *outside* the closing quote when the sentence — not the quoted material — is the question; no comma introducing/ending dashed material (`um, --` → `um --`); two spaces after a sentence-ending closing quote (DP-010). Apply confidence-gated and **flag on ambiguity** rather than guessing which clause is the question.
- emit procedural parentheticals **that are supported by source evidence**
- propose corrections and reconstructions **as suggestions carrying confidence and evidence**

**The AI MAY NOT:**
- invent, rewrite, or paraphrase testimony
- silently alter meaning
- remove filler words ("uh," "um," "you know," "like," "I mean," "so," "well," "yeah" mid-sentence) or false starts — **verbatim is preserved, always**
- modify, recompute, or discard word/utterance timestamps
- mutate `transcript_words`, `transcript_utterances`, `transcript_speakers`, or the raw Deepgram artifact
- destroy or omit source linkage
- auto-apply any interpretive transform without confidence, evidence, reversibility, and a human-confirmable path (see DP-008)

**Canonical immutability is absolute.** The structuring engine has read-only access to Layer 1. Every write it performs lands in the derived representation only.

---

## 4. Inputs (the engine's contract)

The engine receives, per job:

| Input | Source | Purpose |
|-------|--------|---------|
| Raw Deepgram response | storage artifact (`*_deepgram_response.json`) | ground-truth tokens, timings, confidence |
| `transcript_words` | canonical | word-level timing, confidence, speaker_index |
| `transcript_utterances` | canonical | utterance segmentation + IDs (source references) |
| `transcript_speakers` | canonical | speaker clusters / labels |
| CaseRecord | DB | authoritative case + participant facts |
| Participant mappings | DB | cluster → identity hints |
| Notice of Deposition metadata | intake | expected appearances, roles, attorneys |
| Confirmed spellings | intake / CaseRecord | authoritative names (e.g., Bardot, Koepke) |
| Attorney roster | CaseRecord | examining vs defending counsel |

Source references used by the AI must be **stable IDs** on `transcript_utterances` (and, where needed, `transcript_words`). **Phase 0 must confirm these stable IDs exist and are durable across reload/rebuild** — if they do not, that is a blocker to report, not to silently work around.

---

## 5. Output schema — the structured block contract

Every AI-generated block is a derived object that **must** carry source linkage. A block with an empty `source_utterances` array is invalid and must never be emitted (the only exception is a purely procedural parenthetical, which must instead carry the evidence utterances that justify it).

```json
{
  "block_id": "blk_000123",
  "paragraph_type": "Q",
  "speaker": "MR. BENTLEY",
  "speaker_role": "EXAMINING_ATTORNEY",
  "speaker_confidence": 0.98,
  "source_utterances": ["utt_123", "utt_124"],
  "source_speakers": ["speaker_1"],
  "source_word_range": { "start_word_id": "w_4501", "end_word_id": "w_4540" },
  "text": "Please state your name for the record.",
  "transforms": [
    { "type": "qa_reconstruction", "original": "Please state your name. Yes.",
      "result": "split", "reversible": true, "confidence": 0.95 }
  ],
  "flags": [],
  "evidence": { "rationale": "Examining attorney cadence; follows BY MR. BENTLEY header.",
                "signals_used": ["participant_mapping", "context", "speaker_cluster"] },
  "audit": { "model": "claude-...", "prompt_version": "structuring-v1",
             "created_at": "2026-...", "input_hash": "sha256:..." }
}
```

| Field | Rule |
|-------|------|
| `block_id` | stable, generated; used for diff and audit |
| `paragraph_type` | one of: `Q`, `A`, `COLLOQUY`, `BY_LINE`, `EXAMINATION_HEADER`, `OBJECTION`, `PARENTHETICAL`, `FLAG`, `UNRESOLVED`. A resumption `BY_LINE` after a colloquy interruption renders inline as `(BY MR. ___)` (no colon) at the start of the `Q.` text — see DP-012 §9. |
| `speaker` | resolved label, or `null` when unresolved (then `SPEAKER N` is preserved) |
| `speaker_role` | resolved role enum, or `UNKNOWN` |
| `speaker_confidence` | 0–1; drives the low-confidence rule (DP-004) |
| `source_utterances` | **mandatory, non-empty**; references into Layer 1 |
| `source_speakers` | originating canonical cluster(s) |
| `source_word_range` | optional but preferred; preserves click-to-audio at block grain |
| `text` | structured, verbatim-preserving display text |
| `transforms` | audit of every normalization/reconstruction applied; each must be `reversible: true` |
| `flags` | scopist flags (DP-004); empty when none |
| `evidence` | rationale + signals; required for every non-trivial decision |
| `audit` | model, prompt version, timestamp, input hash — for legal defensibility and reproducibility |

---

## 6. Structuring rules

### DP-001 — Mandatory source linkage
Every block references the canonical utterance(s) it derives from. Source linkage is the mechanism that preserves audio sync, confidence highlighting, diffing, and provenance through a full Layer-2 rebuild. No block ships without it.

### DP-002 — Never invent spoken text
The AI must never produce spoken language that is not present in the source audio.

**Allowed** (non-spoken procedural parentheticals, only when justified by source evidence — e.g., the swearing exchange, a videographer "off the record" utterance, or an audio gap with timestamps):
- `(The witness was sworn.)`
- `(Whereupon, a recess was taken at 2:14 p.m.)`
- `(Whereupon, the proceedings resumed at 2:27 p.m.)`
- `(Exhibit No. 1 was marked for identification.)` — exhibit parentheticals use the **full canonical wording**, not an abbreviated form like `(Exhibit 1 marked.)`

**Not allowed** (fabricated speech attributed to a person):
- `"You may lower your hand."`
- `"You may proceed."`
- any utterance not actually spoken.

Procedural parentheticals draw from a **fixed allowlist** and must carry the evidence utterances (and, for timed events, the source timestamps) that justify them. No evidence → no parenthetical.

### DP-002b — Do not auto-capitalize direct-address titles (DP-012)
Capitalization follows the certified record, not external style rules. Direct-address professional titles without a surname stay **lowercase** (`Good afternoon, doctor.`, `entail, doctor?`) — do **not** "correct" them to `Doctor`. Capitalizing a direct-address title is an interpretive rewrite of the record and is prohibited; the only capital form is sentence-initial (`Doctor, I'm going to mark...`), which is ordinary sentence capitalization. `Dr.` + surname (`Dr. Etminan`) is unaffected.

> ⚠ **Known recurring QA-feedback conflict — do not act on it.** Multiple QA review passes have cited **Morson Rule 215** to capitalize a direct-address `doctor` (`I guess, doctor --` → `I guess, Doctor --`; `yourself, doctor,` → `yourself, Doctor,`). For this platform that "correction" is **wrong every time**: DP-012 rejects Rule 215 because the certified *Etminan* record uses lowercase (13 instances), and the certified record outranks Morson. Keep the lowercase form. Do not let any QA pass re-introduce the capital. (See DP-012 §5.)

### DP-003 — Speaker identity resolution
The AI may resolve canonical clusters (`SPEAKER 0/1/2…`) to identities — `THE REPORTER`, `THE VIDEOGRAPHER`, `THE WITNESS`, `MR. BENTLEY`, `MR. RAMON`, etc. — using transcript context, participant metadata, the Notice of Deposition, and CaseRecord. Every attribution carries a `speaker_confidence` and an `evidence` record of the signals used.

Note the empirically observed failure mode (Etminan): a single canonical cluster may fuse multiple real people (e.g., reporter + both attorneys collapsed into one diarization label). The engine must be able to attribute **at sub-cluster grain by context** and must not assume one cluster equals one person.

### DP-004 — Low-confidence rule
If `speaker_confidence` (or any reconstruction confidence) falls below the configured threshold:
- **Do not** assign an identity or apply the transform.
- **Preserve** the canonical label (`SPEAKER 1`).
- **Emit a scopist flag.**

Scopist-flag convention (matches platform delivery rules — these lines are styled distinctly and stripped for clean delivery):
```
[SCOPIST: FLAG] Unable to confidently identify SPEAKER 1. Review audio at 00:14:32.
```
The human reporter remains the certifier of record; flags are how the AI hands ambiguity back to a human.

### DP-004b — Inline garble flags: word-grain, never silent correction (DP-012 §6)
A suspected **ASR garble** with **no authoritative CaseRecord/registry match** is **flagged inline and left verbatim — never corrected.** This is the complement of DP-007: DP-007 *applies* a fix only on an exact authoritative match; a garble has no such match, so the spoken token is preserved and the suspected reading rides along in a flag for human audio verification.

Canonical inline format — the verbatim token stays in the text:
```
<verbatim-token> [SCOPIST: FLAG N: "<flagged token>" — verify from audio; likely "<suspected reading>"]
```
Example: `I'm a lameness [SCOPIST: FLAG 1: "lameness" — verify from audio; likely "layman's"] type guy.`

- `N` is numbered **sequentially within the block**, and **each occurrence gets its own number** even when the same token recurs (e.g. `metastructures` → FLAG 1, then FLAG 2).
- The suspected reading is offered as `likely "…"` and is **not applied**.
- **Clean-delivery stripping:** remove the bracketed `[SCOPIST: FLAG N: …]` span **only** and **retain the preceding verbatim token** — never drop the token with the flag. (Block-grain flag *lines* are stripped as before.)

### DP-005 — Q/A reconstruction
When confidence is high, the AI may split fused exchanges into `Q.` / `A.` designations:
```
"Do you understand that? Yes."
        ↓
Q.  Do you understand that?
A.  Yes.
```
Each resulting block preserves its `source_utterances`. Below threshold: leave the text unchanged and emit a flag. Reconstruction is recorded in `transforms` as reversible.

### DP-005b — Paragraphs within testimony: the three-tab rule (DP-012 §7)
An answer **may legitimately contain multiple paragraphs.** The first paragraph carries the `A.` designation (Tab1 0.5″ / Tab2 1.0″). Every **subsequent new paragraph** begins its first line at the **third tab stop (1.5″, three leading tabs)** — the same stop used for speaker IDs and parentheticals — and its wrapped lines return to the **left margin (0.0″)** via Return-To-Margin Continuation (never a Word-style hanging indent; the retired term "hanging indent" still appears in QA-review prose — do not propagate it).

The distinction the engine must hold:
- **Hard paragraph break** (a genuine new paragraph in lengthy testimony) → new paragraph, first line at **Tab3**.
- **Soft visual line-wrapping** → returns to the left margin, **not** a new paragraph.

Do **not** force-combine legitimate paragraphs into one block (this corrects an earlier over-correction that mandated a single continuous paragraph), and do **not** fragment one paragraph on soft wraps. Authority: UFM §2.11 / §9.2 / §16.5.

### DP-005c — No two consecutive same-role designations
Q/A structure is strictly alternating: **never emit two consecutive `A.` designations (or two consecutive `Q.`) without the other in between.** If segmentation or diarization splits one continuous answer into two adjacent `A.` blocks, **merge them into a single answer block** (which may itself be multi-paragraph per DP-005b — one `A.` designation, with later paragraphs at Tab3). This is distinct from a multi-paragraph answer: multiple paragraphs are allowed; a second `A.` designation is not. The merge preserves the `source_utterances` of both originals.

### DP-006 — Objection reconstruction
The AI may format an objection:
```
"Objection form"  →  MR. RAMON:  Objection.  Form.
```
**Only when** speaker identity is verified and confidence exceeds threshold. Otherwise, leave unchanged and flag. Never attribute an objection to a named attorney on a guess.

### DP-007 — CaseRecord name correction
CaseRecord (and confirmed spellings) are authoritative. The AI may correct a misrecognized name **only** when an exact participant match exists and the source token is a recognized variant of that participant — e.g.:
```
Capke      → Koepke        (Koepke is a named defendant in CaseRecord)
Miyamardeau / Mia Bardeau → Bardot   (confirmed reporter spelling)
```
No fuzzy guessing, no speculative corrections, no correcting a name that has no authoritative match. Every correction is stored with its original token and is reversible.

### DP-008 — Number and date normalization — ⚠ DECISION REQUIRED BEFORE ENABLING
The draft permits spoken-number/date normalization:
```
May seventh, nineteen sixty-eight   → May 7, 1968
September fifteenth, twenty twenty-three → September 15, 2023
August 17th  → August 17   (omit the ordinal in spoken month-day-year order)
Fifty-seven (age)                   → 57
```
**This conflicts with a previously locked normalization-scope decision**, which removed interpretive transforms (date reformat, cause-number reformat, spoken-number conversion, dedupe, hyphenation) from auto-apply and restricted auto-normalization to *pure-formatting* transforms only (honorific spacing, time format). (QA review applied `August 17th → August 17` as a flat correction; per **DP-012 §4** that ordinal omission is gated here as a DP-008 suggestion, **not** auto-applied.) Because the structuring layer is a *derived, display-layer* representation, applying these as **reversible, human-confirmable suggestions** (not auto-applied, not touching canonical) is defensible — but it is a reversal of a locked decision and must be ruled on explicitly.

**Required handling:** treat DP-008 transforms as **suggestions only** — recorded in `transforms` with `reversible: true`, gated behind confidence, surfaced for human confirmation, never silently auto-applied. **STOP and confirm with the owner** before enabling DP-008 at all. If not confirmed, ship the engine with DP-008 disabled.

---

## 7. Confidence, evidence, and audit model

Every AI decision records three things: a **confidence score**, the **source evidence** it relied on, and an **audit entry** (model, prompt version, timestamp, input hash). Every below-threshold decision becomes a `[SCOPIST: FLAG]` rather than a silent action.

Thresholds are **proposed defaults — confirm before use**: speaker attribution and objection reconstruction ≥ 0.90; Q/A reconstruction ≥ 0.90; name correction requires an exact authoritative match (not a probability). For a certified legal record, err toward flagging over asserting.

---

## 8. Workspace integration

The Workspace renders the **AI Structured Transcript** while preserving, end to end:
- source linkage (block → utterance → word → audio)
- confidence highlighting
- click-to-audio
- diff view (RAW vs Structured)

The user can toggle between **RAW Transcript** and **Structured Transcript** for side-by-side comparison. The human-in-the-loop contract is preserved exactly: **the AI proposes; the reporter confirms (e.g., via the speaker-assignment modal); the human remains the certifier of the legal record.** The AI never finalizes anything on its own.

---

## 9. Phase 0 — Audit only (findings, no code)

Do not write or modify implementation code in this phase. Produce a findings report covering:

1. **Stable source IDs:** confirm `transcript_utterances` (and `transcript_words`) expose durable IDs usable as `source_utterances` references that survive reload/rebuild. If not, report as a blocker.
2. **Read paths:** how the engine would read canonical data read-only (repository functions, no write surface).
3. **Existing AI integration:** the current Anthropic API usage (medical extraction) — reuse it; introduce **no new provider or dependency**.
4. **Render contract:** how `buildEditorContent` / the TipTap document consumes blocks today, and what a structured-block adapter would need to feed it without breaking click-to-audio or pagination.
5. **Persistence question:** whether the derived representation can be produced at render time or stored as a **storage JSON artifact** (no DB schema change). **Any proposal requiring a schema/migration change is a hard stop** — report it for separate approval; do not implement it.
6. **Flag/scopist styling:** how `[SCOPIST: FLAG]` lines are currently styled and stripped for delivery, so the engine matches.

End Phase 0 with a one-paragraph readiness verdict and **stop for confirmation** before Phase 1.

---

## 10. Implementation phasing

Follow the locked methodology: **Audit → Feature Flag → AI First-Pass → Compare → Replace.**

1. **Feature flag:** all engine behavior behind `ENABLE_AI_STRUCTURING`, **default OFF**. Flag-off must render byte-identical to today.
2. **AI first-pass:** generate the structured representation as a derived artifact with full source linkage, confidence, evidence, and audit. No canonical writes. No schema change.
3. **Compare:** render RAW vs Structured; produce the validation report (§11).
4. **Replace:** only on explicit approval, and only as the default *view*, never as a canonical overwrite.

One scoped change per commit. No push/merge without explicit approval.

---

## 11. Validation

Regression fixtures: **Heath Thomas** and **Etminan**.

Compare **Current Pipeline** vs **AI Structuring Pipeline** across:

| Metric | What it measures |
|--------|------------------|
| Speaker attribution | correct identity vs flagged vs wrong |
| Q/A reconstruction | correct splits vs missed vs over-split |
| Objection reconstruction | correctly attributed/formatted vs flagged vs wrong |
| Procedural reconstruction | valid evidence-backed parentheticals vs fabricated |
| Name correction | authoritative corrections vs speculative/incorrect |
| Source-linkage integrity | % blocks with valid, non-empty `source_utterances` (target: 100%) |
| Audio-sync survival | click-to-audio still resolves after structuring (pass/fail) |

Produce **`AI_STRUCTURING_VALIDATION.md`** with per-fixture results and a recommendation:
- **KEEP CURRENT** — structuring underperforms; stay on the existing pipeline.
- **HYBRID** — structuring for high-confidence cases, current pipeline elsewhere.
- **REPLACE** — structuring is the default view (RAW remains available and immutable).

---

## 12. Hard stops and scope boundaries

**STOP and request approval if any of the following arise:**
- the work requires a database schema or migration change
- the work requires mutating canonical data (`transcript_words` / `transcript_utterances` / `transcript_speakers`) or the raw Deepgram artifact
- stable source IDs do not exist and would need to be introduced first
- enabling DP-008 (number/date normalization) — confirm before enabling
- a new dependency or AI provider would be required

**Do NOT:**
- modify RAW transcript data or Deepgram output
- rewrite or paraphrase testimony; remove fillers or false starts; alter timestamps
- destroy source linkage
- run `git add -A` / `git add .` — stage by explicit path only
- push or merge without explicit approval

---

## 13. Definition of done

- `ENABLE_AI_STRUCTURING` exists and defaults OFF; flag-off output is byte-identical to current.
- Engine reads canonical data read-only; performs zero canonical writes; no schema change.
- Every emitted block carries non-empty `source_utterances`, confidence, evidence, and an audit entry; every below-threshold decision is a `[SCOPIST: FLAG]`.
- Click-to-audio, confidence highlighting, and diff survive structuring on both fixtures.
- `AI_STRUCTURING_VALIDATION.md` delivered with metrics and a KEEP / HYBRID / REPLACE recommendation.
- DP-008 shipped disabled unless explicitly approved.

---

**The one thing to internalize:** the AI is building a better *representation* of the transcript, not a new transcript. Hold that line and timestamps, audio sync, confidence scores, audit trails, and legal defensibility all survive intact.

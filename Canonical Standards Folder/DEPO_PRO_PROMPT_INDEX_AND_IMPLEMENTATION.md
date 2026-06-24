# Depo-Pro — Prompt Index & Implementation Guide

> **STATUS: REFERENCE DESIGN ONLY.** This document is not an active authority.
> It describes future or proposed work. Current authoritative behavior is governed
> by `DP-010`, `DP-011`, `DP-012`, and `CANONICAL_STANDARDS_INDEX.md`.

Covers every formatting artifact built in this workstream: what each is, its status, what depends on it, and exactly how to put it into effect. Order matters — data and decision records first, operational prompts last.

---

## The full set (6 artifacts)

| # | Artifact | Type | Status | Implement by |
|---|----------|------|--------|--------------|
| 1 | `abbreviation_registry.json` | Canonical **data** | APPROVED | Wiring into code (single source of truth) |
| 2 | `DP-010_SENTENCE_BOUNDARY_ABBREVIATION_SPACING.md` | Decision record | APPROVED | Citing as ground truth (don't re-derive) |
| 3 | `DP-009_HONORIFIC_ABBREVIATION_SPACING.md` | Decision record | Consolidated/historical | Reference only |
| 4 | `DP-012_PUNCTUATION_RECONCILIATION_AND_GARBLE_FLAGS.md` | Decision record | APPROVED | Cite as active authority |
| 5 | `PROMPT_AI_TRANSCRIPT_STRUCTURING_ENGINE.md` | Operational mega-prompt | Build behind flag (BETA_FREEZE) | Feed to Codex, audit-first |
| 6 | `PROMPT_WORKSPACE_DOCX_TAB_STOPS.md` | Operational mega-prompt | **Option B chosen** — targets `depo_transcribe` | Feed to Codex against the desktop repo |

> Note: **DP-011** is the geometry authority only. Direct-address capitalization is housed in **DP-012**. Older prompt-era references that used `DP-011` for capitalization are historical and should not be cited as current authority.

---

## How these are meant to be used (the model)

- **Decision records (DP-0xx) + the registry are "ground truth."** They are *cited inside* the operational prompts, not re-explained. Code reads the registry; it never hardcodes abbreviation lists.
- **Operational prompts are mega-prompts for Codex CLI** (`codex --profile depo --no-resume`, PowerShell, `;` separators). Each runs **audit-first**: Phase 0 = findings only, hard stop, then phased commits with explicit approval and one scoped change per commit. No `git add -A`. No push/merge without approval.
- **BETA_FREEZE applies.** Nothing here changes the Prisma/Postgres schema. The AI Structuring Engine is additive and flag-gated default OFF. The DOCX work is display-layer.

---

## 1. `abbreviation_registry.json` — do this first
**What:** the one list of which trailing periods are abbreviations (one space) vs sentence boundaries (two spaces).
**Implement:**
1. Place it at a single shared path imported by every consumer (Workspace, Copy Transcript, DOCX, PDF, Stage S, AI layer).
2. Replace any per-module abbreviation arrays with imports from it (or a module generated from it). The reference regex in DP-010 should be **generated from** the registry, not kept as a parallel hand-list.
3. New abbreviations get added here only.

## 2. `DP-010` — spacing authority
**What:** one rule at every `.` `?` `!` — sentence boundary → two spaces, abbreviation (registry) → one space; two spaces after a speaker-label colon and after a closing quote that ends a sentence.
**Implement:** cite it in code comments/PRs; use its validated reference implementation; verify against the certified *Etminan* fixture (379 two-space boundaries + 53 after `?`, zero false collapses).

## 3. `DP-009` — historical
**What:** the original honorific-spacing decision, now a subset of DP-010.
**Implement:** nothing to wire. Cite DP-010 in new work; keep DP-009 for its certified evidence/history.

## 4. `DP-012` — punctuation, garble flags, paragraph geometry
**What:** quote-before-dash (Morson 92), `?` outside quote (16/108), no comma against a dash (91), inline garble-flag convention (§6), the three-tab paragraph rule + Tab4 parentheticals (§7), the direct-address capitalization rule (§5), and the number-date formatting decision (§4).
**Implement:**
1. Cite it as the active authority for punctuation, direct-address capitalization, garble flags, and paragraph refinements.
2. Keep older prompt-history references to the former `PROPOSED` state as historical context only.
3. Then it's cited by the two operational prompts exactly like DP-010.

## 5. `PROMPT_AI_TRANSCRIPT_STRUCTURING_ENGINE.md` — the AI layer
**What:** builds a derived, source-linked Q/A-and-speaker representation; never mutates canonical data; flags instead of correcting; gated default OFF.
**Implement (audit-first):**
1. Run it at Codex Phase 0 → it produces a findings report (stable IDs, read paths, render contract, persistence as storage JSON not schema). **Hard stop.**
2. On approval, build behind `ENABLE_AI_STRUCTURING` (default OFF; flag-off output byte-identical to today).
3. Validate on the Heath Thomas + Etminan fixtures → `AI_STRUCTURING_VALIDATION.md` → KEEP / HYBRID / REPLACE.
4. **Beta priority: low.** It's additive and frozen-OFF; safe to build, not required to ship beta.

## 6. `PROMPT_WORKSPACE_DOCX_TAB_STOPS.md` — the DOCX geometry
**What:** UFM tab geometry (Q./A. at 0.5″/1.0″, speaker IDs + new-paragraph first lines at 1.5″, parentheticals at 2.0″), Return-To-Margin Continuation, and the §3a spacing pass.
**Status: Option B locked.** Targets the **`depo_transcribe`** desktop app (`document_builder.py`), not the SaaS repo. Re-run Codex Phase 0 against the desktop repo to find what `document_builder.py` already implements vs. needs (four tab stops 720/1440/2160/2880; Tab3 new-paragraphs/speaker-IDs; Tab4 parentheticals; §3a spacing; DP-012 §1/§2/§2b/§6/§9), hard-stop, then patch the gaps one commit at a time. SaaS DOCX (Option A) is post-beta; SaaS export stays TXT/JSON.

---

## Open decisions

1. Any legacy prompt text that describes `DP-012` as `PROPOSED` is historical. The active authority is the ratified file in the Canonical Standards Folder.
2. ~~Resumption by-line format~~ — **RESOLVED:** adopt `(BY MR. ___)` no colon (DP-012 §9). Supersedes the recorded `(BY: MR. JENKINS)`.
3. ~~Parenthetical tab~~ — **RESOLVED:** Tab4 (2.0″).
4. ~~DOCX target~~ — **RESOLVED: Option B.** Keep `document_builder.py` (desktop `depo_transcribe`) as the certified-DOCX path for beta; SaaS export stays TXT/JSON; SaaS wave8 conversion (Option A) is post-beta. The Workspace prompt now targets `depo_transcribe`.

---

## Hard-stop resolution (the Phase 0 report)

The audit was correct to stop. The screenshot and the repo describe **two different codebases**:

- **`depo_transcribe`** (standalone desktop, `C:\Users\james\PycharmProjects\depo_transcribe\`) — **has** `document_builder.py` + `_set_tab_stops()`, **tab-based**. This is where the screenshot came from (the audit's "path A").
- **`depo-pro`** (the SaaS repo that was audited) — its only DOCX is the **wave8 space-based** path, and the live `ExportScreen.tsx` exports **no DOCX at all** (TXT/JSON only).

The Workspace prompt had conflated the two. It's now corrected (§0a/§1.2a) to record the audit and force a target choice:

- **Option A — convert the SaaS wave8 DOCX to tab-based** (bigger: space→tab + apply canonical tab stops + reconcile geometry; also decide where the UI calls it).
- **Option B (recommended for beta)** — keep `document_builder.py` (desktop) as the certified-DOCX path, run the tab/spacing fixes **there**, and leave SaaS export at TXT/JSON until post-beta.

**What to tell Codex now:** "`document_builder.py` is not in `depo-pro`; it lives in the separate `depo_transcribe` desktop app. The screenshot is that external flow. For the SaaS, the wave8 DOCX is space-based and unwired. Do not search `depo-pro` for `document_builder.py`. Await target decision (Option A or B) before Phase 1."

**Two geometry discrepancies to verify against the certified *Etminan* PDF (don't guess):**
1. Right margin: wave8 = **0.75″**, canonical note = **1.0″**.
2. Tab constants: wave8 `profile.py` = (360, 900, 1440, 2160, 2880); canonical = **720/1440/2160/2880**. Use canonical; reconcile `profile.py`.

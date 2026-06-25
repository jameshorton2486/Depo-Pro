# Changelog — DP-010 / DP-011 / Registry Incorporation Pass

**Date:** 2026-06-21
**Discipline:** Audit-first. No transcript content changed. No spacing/capitalization *rule* altered — only cross-references, framing, and stale labels corrected. Certified *Etminan* transcript remains the top authority.

---

## Audit verdict (before edits)

The two working prompts were **already aligned** with the canonical rules from prior work:
- DP-010 cited as the unified sentence-boundary system, registry-sourced (no hardcoding).
- Closing-quote spacing present.
- DP-011 (lowercase direct-address `doctor`) present.

This pass closed the **consistency and staleness** gaps only.

---

## Per-file changes

### 1. `PROMPT_AI_TRANSCRIPT_STRUCTURING_ENGINE.md`  — minor
- **Added** a "Canonical formatting authority (read first)" callout under the Status line, naming DP-010 (+ DP-009 consolidated), `abbreviation_registry.json` as single source of truth, and DP-011, with the certified transcript above all.
- No rule text, schema reference, or invariant changed. DP-002b/DP-011 in §6 untouched.

### 2. `PROMPT_WORKSPACE_DOCX_TAB_STOPS.md`  — minor (staleness fix)
- **Title:** "UFM Tab Stops + Honorific Spacing" → "UFM Tab Stops + DP-010 Sentence-Boundary Spacing" (the §3a scope was broadened beyond honorifics long ago; the title lagged).
- **§0 intro:** reframed fix (2) from "single-space honorific normalization" to "DP-010 sentence-boundary & abbreviation spacing normalization," with a note that §3a covers the full system (`.` `?` `!`), not honorifics alone.
- **Added** the same "Canonical formatting authority" callout for a cold reader.
- §3a body, the reference regex, the `No.` carve-out, and the §4 DP-011 verification step were already correct — left untouched.

### 3. `DP-010_SENTENCE_BOUNDARY_ABBREVIATION_SPACING.md`  — one safe cross-reference
- **Added** a "Related decisions" line after the metadata table: DP-009 consolidated/historical; DP-011 is orthogonal (capitalization, not spacing) and deliberately *not* in the registry.
- No rule, example, or the reference implementation changed.

### 4. `abbreviation_registry.json`  — unchanged (verbatim)
- Single source of truth; already current (closing-quote note present, `No.` context rule present). JSON validated. Not modified — capitalization (DP-011) is intentionally out of scope for a spacing registry.

### 5. `DP-009_HONORIFIC_ABBREVIATION_SPACING.md`  — unchanged (verbatim)
- Historical decision, already marked "Consolidated into DP-010." Retained for its certified evidence. Not modified.

---

## Verification run
- `abbreviation_registry.json` parses as valid JSON.
- Grep sweep for stale "two spaces after honorific" **prescriptions**: none. All hits are the canonical docs flagging `Ms.  Vargas` / `MR.  BENTLEY:` as defects to eliminate, or the correct two-space *sentence-boundary* example `1991.  No.  No.  No.` (the `No.` spoken-word carve-out).
- Citation coverage confirmed across all five files.

## Note for the live repo (out of scope here)
These are the spec/prompt artifacts. The actual formatter code (`document_builder.py`, any wave8 TS export path) should be confirmed to source its abbreviation list from `abbreviation_registry.json` rather than a private per-file list — that audit belongs in the Workspace DOCX Phase 0, not in this documentation pass.

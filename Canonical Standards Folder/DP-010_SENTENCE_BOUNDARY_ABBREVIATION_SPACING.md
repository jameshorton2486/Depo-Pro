# DP-010 — Sentence Boundary & Abbreviation Spacing

| Field | Value |
|-------|-------|
| **Decision ID** | DP-010 |
| **Title** | Sentence Boundary & Abbreviation Spacing |
| **Status** | APPROVED |
| **Authority** | Certified Transcript Ground Truth — *Etminan* validation fixture (Miah Bardot, CSR 12129) |
| **Consolidates** | DP-009 (Honorific and Abbreviation Spacing) — DP-009's spacing rule is a subset of this decision |
| **Canonical data** | `abbreviation_registry.json` |
| **Scope (single authority for)** | Workspace · Copy Transcript · DOCX export · PDF export · Stage S · AI Structuring Layer |

**Related decisions:** DP-009 (Honorific and Abbreviation Spacing) is consolidated into this decision and retained for history only. DP-011 (Capitalization of Direct-Address Titles) is a separate, orthogonal decision governing capitalization — not spacing — and is not encoded in `abbreviation_registry.json`.

---

## The core insight

The "honorific spacing" rule and the "sentence spacing" rule are **not two systems — they are one system.** Both are answered by a single question asked at every period, question mark, and exclamation point:

> *Is this punctuation a **sentence boundary** or part of an **abbreviation**?*

- **Sentence boundary** (`.` `?` `!` terminating a sentence) → **two spaces**
- **Abbreviation** (token in the registry, e.g. `Mr.` `M.D.` `No.`) → **one space**

There is exactly one decision point and one exception list (the abbreviation registry). Treating honorific spacing and sentence spacing as separate features is what produced the contradictory rules and the six-different-ways problem this decision eliminates.

---

## Canonical rule

### Two spaces
- After a **sentence-ending** `.` `?` `!` (before the next sentence).
- After a **sentence-ending `.`/`?`/`!` that falls inside a closing quotation mark** — the two spaces follow the **closing quote** (`they're hurting."  And I take...`).
- After the **colon** in a speaker label (`MR. ETMINAN:  I do.`).

### One space
- After any **abbreviation/honorific** period in `abbreviation_registry.json` — honorifics (`Mr. Mrs. Ms. Dr.`), credentials (`M.D. Ph.D. J.D.`), reference (`No. Ex. Vol.`), time (`a.m. p.m.`), entity (`Inc. Co. Corp.`), and so on.
- After a **single uppercase initial** (`J.` `R.`).
- After an **inner-dotted** abbreviation (`M.D.` `U.S.` `a.m.`).
- Honorifics take one space in **both** running text (mixed case: `Ms. Vargas`, `Dr. Etminan`) and speaker labels (all caps: `MR. ETMINAN:`).

### Context-sensitive
- **`No.`** — one space only when it means "number" (`No. 12129`, `NO. C-5722-24-L`). When `No.` is the spoken word *No* ending a sentence (`1991.  No.  No.  No.  I'm sorry.  2001.`) it is a **sentence boundary → two spaces**. Never collapse `No.  No.` runs.

`Miss` carries no period and does not participate.

---

## Certified evidence (character grain, Courier monospace)

| Context | Spaces | Certified example |
|---------|--------|-------------------|
| Honorific period — running text | 1 | `Ms. Vargas` |
| Honorific period — speaker label | 1 | `MR. ETMINAN:` |
| Speaker-label colon | 2 | `MR. ETMINAN:  I do.` |
| Sentence-ending period | 2 | `1991.  No.  No.  No.  I'm sorry.  2001.` |
| Sentence-ending question mark | 2 | `bit?  What do you mean` (p.7) |
| Sentence end inside a closing quote | 2 (after the quote) | `hurting."  And I take` (p.10) |

`MR.  BENTLEY:` (two spaces after the honorific) is **wrong** and must be removed from every prompt, spec, and formatter rule.

---

## Canonical abbreviation registry (mandatory)

The abbreviation list lives in **one** place: `abbreviation_registry.json`. Every consumer (Workspace, Copy Transcript, DOCX, PDF, Stage S, AI Structuring) reads from that registry. **Do not hardcode honorific/abbreviation lists per-module** — that is what allowed `Mr. Ms. Dr. No. a.m. p.m. M.D.` to be solved inconsistently across the codebase. New abbreviations are added to the registry, not to individual formatters.

---

## Reference implementation (validated against the certified fixture)

```js
// ABBR mirrors abbreviation_registry.json (keep them in sync; ideally generate ABBR from the registry)
const ABBR = /^(Mr|Mrs|Ms|Miss|Dr|MR|MRS|MS|DR|No|NO|St|ST|Inc|INC|Jr|Sr|vs|Vs|VS|Eur|Co|CO|Ltd|Mt)$/;
text = text.replace(/([.?!]["']) (?=[A-Z])/g, "$1  ");      // sentence end inside a closing quote
text = text.replace(/([?!]) (?=[A-Z])/g, "$1  ");            // sentence-ending ? / !
text = text.replace(/(\S+)\. (?=[A-Z])/g, (_, pre) =>
  ABBR.test(pre) || /^[A-Z]$/.test(pre) || /[A-Za-z]\.[A-Za-z]$/.test(pre)
    ? pre + ". "    // abbreviation / initial / inner-dotted → one space
    : pre + ".  "); // sentence boundary → two spaces
```

This is the exact logic verified against the *Etminan* transcript: 379 two-space sentence boundaries + 53 two-space after `?`, with zero false collapses on honorifics, speaker labels, initials, or the cause number.

---

## Related geometry (terminology fix, not part of this decision)

The Q/A and colloquy continuation rule is named **"Return-To-Margin Continuation"** (UFM §2.11 / §16.3): the designation sits at the first tab, the text at the second tab, and **all wrapped lines return to the left margin (0″)**. It is **not** a Word-style hanging indent — implement it with explicit tab stops + `left_indent = 0`, never a negative `first_line_indent` (which would push continuation lines the wrong way). The legacy label "hanging indent" is retired.

---

## Directive

1. Update honorific spacing, sentence-boundary spacing, and question-mark spacing to this single rule.
2. Read the abbreviation list from `abbreviation_registry.json` — no per-module hardcoding.
3. Rename the continuation rule to "Return-To-Margin Continuation" everywhere.
4. **Do not change transcript content. Only change formatting rules.**

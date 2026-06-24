# DP-009 — Honorific and Abbreviation Spacing

> **Consolidated into [DP-010 — Sentence Boundary & Abbreviation Spacing].** DP-010 is now the single canonical authority for all spacing (honorific + sentence-boundary), backed by `abbreviation_registry.json`. DP-009 is retained for its certified evidence and history; its rule is a subset of DP-010 and remains valid. New work should cite DP-010.
>
> **Classification:** HISTORICAL / reference-only decision record retained for provenance. It is not an active authority for new implementation work.

| Field | Value |
|-------|-------|
| **Decision ID** | DP-009 |
| **Title** | Honorific and Abbreviation Spacing (and Return-To-Margin Continuation terminology) |
| **Status** | APPROVED |
| **Authority** | Certified Transcript Ground Truth — *Etminan* validation fixture (Miah Bardot, CSR 12129) |
| **Scope** | Platform-wide: Python formatter (`document_builder.py`), Geometry / Stage S, DOCX export, AI Structuring Engine, all Codex prompts |
| **Supersedes** | Any earlier Depo-Pro rule requiring two spaces after honorific periods, or all-caps honorifics in Q/A body text |

---

## Authority principle

**Certified transcript > internal specification.** Where a written Depo-Pro spec conflicts with the certified transcript record, the certified transcript governs and the spec is corrected to match. This decision was triggered by exactly such a conflict and resolved by character-grain inspection of the certified *Etminan* PDF (Courier monospace, so spacing is countable in cells).

---

## Rule

> **ABSOLUTE — NO EXCEPTIONS.** A honorific or abbreviation period is **never** followed by two spaces. It is **always exactly one space**, in every context (speaker labels, running text, section headers, BY-lines, attributions, captions, certifications). Any spec, prompt, code comment, format example, or output that states or produces **two** spaces after a honorific is **wrong** and must be deleted or corrected on sight.

### One space after an abbreviation / honorific period

Use **exactly one space** after the period of an honorific or abbreviation, in **both speaker labels and running text**:

```
Mr. Bentley
Mrs. Smith
Ms. Vargas
Miss Jones
Dr. Etminan
M.D.
No. 12129
a.m.
p.m.
```

Honorifics in **running Q/A body text are mixed case** (`Ms. Vargas`, `Dr. Etminan`), never all-caps. Only the speaker-label designation is all-caps (`MR. ETMINAN:`), and even there the honorific period takes **one** space.

### Two spaces after sentence-ending punctuation and speaker-label colons

Use **exactly two spaces** after:
- a sentence-ending `.` `?` `!` before the next sentence, and
- the colon in a speaker label.

```
MR. BENTLEY:  Good afternoon.
THE REPORTER:  Thank you, sir.
Sentence one.  Sentence two.
1991.  No.  No.  No.  I'm sorry.  2001.
```

### Certified evidence

| Context | Required | Verified in certified PDF |
|---------|----------|---------------------------|
| Honorific period (running text) | 1 space | `Ms. Vargas` — single cell after `Ms.` |
| Honorific period (speaker label) | 1 space | `MR. ETMINAN:` — single cell after `MR.` |
| Speaker-label colon | 2 spaces | `MR. ETMINAN:  I do.` — two cells after `:` |
| Sentence-ending period | 2 spaces | `1991.  No.  No.  No.  I'm sorry.  2001.` — two cells after each `.` |
| Sentence-ending **question mark** | 2 spaces | `bit?  What do you mean` (certified PDF p.7) — two cells after `?`, identical to the period gap |

---

## Implementation note (do not over-correct)

Implement as a **pure-formatting** normalization (no meaning change, no canonical mutation). Target honorific/abbreviation tokens explicitly. Do **not** run a blunt "collapse all double spaces" pass — that would wrongly destroy the legitimate two-space sentence gaps and speaker-label colon gaps. The transform is: *after a known honorific/abbreviation period, collapse to one space; everywhere else, leave spacing untouched.*

**Critical `No.` carve-out:** `No.` is one space **only** when it abbreviates "number" (followed by a figure, e.g. `No. 12129`, `Cause No. C-5722-24-L`). When `No.` is the spoken word *No* ending a sentence (e.g. `1991.  No.  No.  No.  I'm sorry.  2001.`), it is a sentence and keeps **two** spaces. The normalizer must disambiguate by context (followed by a numeral → abbreviation/one space; otherwise → sentence word/two spaces) and must never collapse `No.  No.` runs.

---

## Addendum — Return-To-Margin Continuation (terminology fix)

Related spec-wording correction adopted with this decision (the *behavior* was always correct; only the label was wrong):

- **Rule name: Return-To-Margin Continuation** (UFM §2.11 / §16.3). The designation (`Q.`/`A.`) sits at the first tab (0.5″), the text at the second tab (1.0″), and **all subsequent wrapped lines return to the left margin (0″)**.
- This is **not** a true typographic hanging indent (which would leave the first line flush and push *continuation* lines inward). The legacy label "hanging indent" is retired; use **Return-To-Margin Continuation**.
- **Correct implementation:** explicit tab stops + `left_indent = 0` + literal tabs in the text (`\tQ.\t{text}`). This is what `document_builder.py` does.
- **Do NOT implement via a negative first-line indent.** A negative `first_line_indent` produces a genuine hanging indent — it pushes continuation lines *to the right*, the opposite of the Return-To-Margin Continuation rule. (This corrects a common engineering explanation that conflates the two.)

---

## Affected artifacts

- `document_builder.py` — confirm one-space honorific handling in its text post-processing.
- Workspace DOCX export — currently emits two spaces after honorifics (`Ms.  Vargas`); fix per `PROMPT_WORKSPACE_DOCX_TAB_STOPS.md` §3a.
- AI Transcript Structuring Engine — honorific normalization must follow this rule.
- All future Geometry / Stage S / formatting prompts — cite DP-009 rather than re-deriving.

## Purge directive

Every stale reference that **prescribes or permits** two spaces after a honorific must be deleted or corrected to one space — across code, specs, roadmaps, formatting guides, prompts, comments, and format examples. (References that merely identify the two-space output as a **defect to fix** are allowed, since their purpose is to eliminate it.)

To find candidates in the repo and spec set:

```bash
# literal two-space (or non-breaking-space) honorific instances in text/code
grep -rnP '(Mr|Mrs|Ms|Miss|Dr|No)\.[ \xC2\xA0]{2,}' .

# prose rules that prescribe two spaces after honorifics
grep -rniE 'two spaces? after .{0,20}(honorific|abbreviation|Mr\.|Ms\.)' .

# the legacy "all-caps honorific + two spaces" phrasing
grep -rniE 'ALL[- ]?CAPS.{0,30}two space' .
```

Known stale-spec candidates observed in the project set (verify and purge in the live repo — these are read-only copies here): `DepoPro_Transcript_Formatting_Guide_v1`, `DepoPro_Master_Roadmap_v3/v4/v5`. Do **not** confuse the two-space **colon** and two-space **sentence** rules (both correct and must remain) with the honorific rule.

# DEPO-PRO Transcript Compiler — Prompt Library

**Version 2.0 (Architecture Aligned)**

> This is no longer a prompt. It is the **specification for the DEPO-PRO
> Transcript Compiler.** Each module is a compiler pass. The library mirrors the
> frozen codebase architecture one-to-one, so documentation, prompts,
> implementation, and tests share a single map.

---

## Library structure

```
transcript-compiler/
│
├── W21_RECOGNITION_RULES.md        Wave 21  — what did the speaker say?
├── W22_SEMANTIC_RULES.md           Wave 22  — who spoke, in what role?
├── W23_PRODUCTION_RULES.md         Wave 23  — how does the deposition appear?
├── TP5_GEOMETRY_RULES.md           TP-5     — how is each element rendered?
├── W24_DETERMINISTIC_CORRECTIONS.md Wave 24 — canonical string substitutions
├── W25_CANONICAL_PUNCTUATION.md    Wave 25  — punctuation / spacing authority
├── W26_AI_CONTEXT_RULES.md         Wave 26  — unresolved ambiguity only
│
└── MASTER_TRANSCRIPT_COMPILER_PROMPT.md   orchestrates the modules above
```

The Master Prompt is small — it only wires the passes together. Each pass is
independently editable and cites its own ratified authority.

---

## Compiler pipeline

```
Audio
  → W21 Recognition            → Canonical Transcript
  → W22 Semantics              → Structured Transcript Contract
  → W23 Deposition Production  → Produced Transcript
  → TP-5 Geometry              → Rendered Transcript
  → W24 Deterministic Corrections
  → W25 Canonical Punctuation
  → W26 AI Context Review
  → Professional Draft Transcript
```

---

## The one-owner rule (permanent engineering rule)

**Every rule must have exactly one architectural owner.**

If a rule appears in more than one module: **move it — do not duplicate it.**
This is what keeps the prompt library synchronized with the codebase. Each
module therefore carries an explicit **"Does NOT own"** boundary.

### Resolved boundaries (duplicates collapsed)

The v1 additions listed some rules under two owners. Per the one-owner rule they
are assigned to exactly one here:

| Rule | Draft ambiguity | Resolved owner | Test |
|------|-----------------|----------------|------|
| Name recognition (`Rico Laura` → `Rocio Laura`) | W21 vs W24 | **W21** | Correct form is in the Participant Directory / keyterm seed → recognition. |
| `standing steam` → `Standing Seam` | W21 and W24 | **W24** | Generic domain term, not case metadata → deterministic dictionary. |
| `curriculum of IT` → `curriculum vitae` | W21 and W24 | **W24** | Generic phrase, not case metadata → deterministic dictionary. |
| `accent` → `accident`, `lamest terms` → `layman's terms` | — | **W24** | Metadata-independent homophone → deterministic dictionary. |
| Money (`$7.50` → `$750`) | — | **W26 (flag)** | Legally significant, ambiguous → never deterministic. |

**Governing test for the W21 / W24 split:**
*Is the correct form derivable from this case's metadata (participant directory,
auto-seeded keyterms)?* → **W21**. Otherwise, if it is a general-purpose
substitution from the correction registry → **W24**.

---

## Rule Ownership Matrix

Every rule from the original monolithic prompt, classified to one owner:

| Original rule | Owner |
|---------------|-------|
| Single-word STT injections | Wave 21 |
| Three-word STT injections | Wave 21 |
| Trailing answer fragments | Wave 21 |
| Proper-noun / name recognition (metadata-backed) | Wave 21 |
| Split-question reconstruction | Wave 22 |
| Speaker / witness / attorney / reporter ownership | Wave 22 |
| Objection inside answer | Wave 22 |
| Proceedings reconstruction | Wave 23 |
| Caption / cause / parties / appearances | Wave 23 |
| `BY MR. ___` handling & examination transitions | Wave 23 |
| Structural events (sworn, commenced, exhibit marked) | Wave 23 |
| Certification / Rule 203 / signature | Wave 23 |
| Header / footer / line numbers / tabs / continuations | TP-5 Geometry |
| Metadata-independent word/phrase corrections | Wave 24 |
| Money normalization | Wave 26 (flag) — never deterministic |
| Em dashes / ellipses / spacing / Morson's / Texas rules | Wave 25 |
| Unknown names / low-confidence / contextual suggestions | Wave 26 |

---

## Status of the original monolithic prompt

The original monolithic prompt
(`Canonical Standards Folder/PROMPT_AI_TRANSCRIPT_STRUCTURING_ENGINE.md`) is to
be **retired and treated as a historical document.** From this point forward,
this library is the compiler specification. (Adding the "superseded" banner to
that file is a separate, explicit edit to a canonical-standards document and is
not made automatically.)

---

## Cited authorities (not restated here)

- Recognition: `docs/architecture/W21_RECOGNITION_QUALITY_STANDARD.md`
- Contract: `docs/architecture/W22-2A_STRUCTURED_TRANSCRIPT_CONTRACT.md`
- Region model: `docs/architecture/W23_REGION_MODEL.md`
- Geometry: `Canonical Standards Folder/DP-011_CANONICAL_GEOMETRY_AUTHORITY.md`
- Punctuation/spacing/garble: `Canonical Standards Folder/DP-012_...md`, `DP-010_...md`
- Abbreviations (single source): `Canonical Standards Folder/abbreviation_registry.json`

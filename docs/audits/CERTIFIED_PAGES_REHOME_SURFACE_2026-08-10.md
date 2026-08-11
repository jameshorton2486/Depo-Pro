# Certified-pages re-home surface — mapping the ADR-0017 front/back matter into the live pipeline

---
authority_tier: T5
status: ACTIVE
owner: Architecture
scope: certified-pages-rehome-surface
supersedes: null
superseded_by: null
approved_by: null
version: null
effective_date: 2026-08-10
ratified_date: null
last_reviewed: 2026-08-10
next_review: 2027-08-10
ratification: NOT_REQUIRED
implementation_status: NOT_STARTED
---

Date: 2026-08-10 · Read-only characterization (no code changes, nothing implemented or deleted). Owner decision: **Option 1** — preserve complete certified transcripts; re-home the caption/appearances/certificate/errata/index page-generation into the surviving live architecture **before** the Python `transcript_formatter/` is deleted (DOC-0326 gate). This document maps the re-home surface so the build is a small, well-characterized operation. Grounded by three parallel read-only sweeps of the Python builders + the live render model.

## The single enabling prerequisite — pagination as first-class render-model output

**The live render model does not carry page numbers.** In both the TS render model (`geometryEngine.ts` `GeometryLayoutModel` — geometry only, `lines_per_page` but no page/line assignment) and the Cloud Run `formatter_core`, pagination is computed **transiently and discarded**: `docx_exporter.py:401-457` wrap-then-chunks logical→physical lines and prints a per-page `line_index+1`, but never returns *which page* a line landed on. A repo-wide grep for `page_number|pageNumber|line_number|finalPage` across `src/lib/transcript` returns zero.

Two required pages depend on final page/line numbers: the **witness/exhibit indexes** (DIRECT/CROSS/… page refs; offered/admitted page refs) and the **errata / changes-&-signature** grid (each correction cites transcript page + line). In Python these numbers are **not derived from the transcript at all** — the index/errata builders are "dumb printers" that emit page-ref *strings* supplied externally on `JobConfig` (grep: `direct_page`/`offered_page` are assigned only in tests). The Python `LineNumberTracker` exists but its `(page,line)` output is only painted as gutter text, never captured into a section→page or exhibit→page map, and indexes are written *before* the body.

**Therefore the first re-home step is an enabler, independent of any single page:** promote the pagination that `docx_exporter` already computes into a **queryable render-model output** — per logical line `(page, line)`, plus the page where each examination section and exhibit mark begins. This is a pure data-exposure of a computation that already runs. Without it, indexes and errata cannot be built anywhere.

**Contract established (inert, 2026-08-10):** the data contract for that output now exists as [paginationContract.ts](../../src/lib/export/paginationContract.ts) — `PageLineRef`, `PaginatedLine` (page/line + paragraph/utterance identity + continuation flag), `SectionAnchor`, `ExhibitAnchor`, `PaginationMap`, plus pure read-side helpers (`lookupParagraphRef`/`lookupUtteranceRef` for errata/index resolution, `compareRefs`, `formatPageLine`) with unit tests. This is **inert/default-off**: nothing in the live path produces or consumes it. The **producer** — which must reproduce the renderer's wrap-then-chunk logic and match its page breaks exactly (a rendering-parity concern) — is deliberately NOT built; it is the activation step, gated with the rest of the re-home. Fixing the shape + read-side now lets it be reviewed and tested ahead of the build, exactly as the line_type foundation was staged.

## Re-home mapping — per required page

Legend: **Data status** = required values already in the TS `CaseRecord`/`ufm_metadata` (✅), partial/derivable (⚠️), genuinely absent (❌).

### Front matter (from Intake/UFM metadata; no transcript content)

| Page | Required metadata | Current Python behavior | Data status | Live representation to ADD | Geometry | Tests/templates |
|---|---|---|---|---|---|---|
| **Title / style** (`title_page.py`) | cause_number, court_type, county, judicial_district, case style, plaintiff/defendant names, witness name(+title), depo date/start/end, oral-vs-videotaped, method, reporter name/CSR, location(+city) | flat lined-page recital + boxed caption grid | ✅ most in `ufm_metadata`; ❌ `subpoena_duces_tecum`, explicit `court_type`, oral/videotaped flag, witness `title` not in envelope | front_matter.title section carrying metadata | `_lined_page` 25-row table, Courier 12, margins 1.25/0.75/1.0/1.0, centered via literal spaces (no true center/tabs) | `test_spec.py:411,422,597`; pure code (no template) |
| **Caption / appearances** (`caption.py`) | court_type/court, parties, cause_number, witness(+title), date, method, SDT, counsel[] (name, bar, firm, address, city/state/zip, phone), also_present[], reporter block (CSR, exp, firm, reg, address, phone) | flat lined-page; iterates ALL counsel; `APPEARANCES`/`PROCEEDINGS` headers | ✅ `appearances[]` (fuller than Python); reporter fields mostly ✅; ❌ SDT, court_type | front_matter.caption + appearances sections | `_lined_page`, literal-space indents | `test_spec.py:433` |
| **Appearances (docxtpl)** (`fig18`) | fixed 2-counsel + 3-present slots via `{{ }}` placeholders | template-fill; **currently renders BLANK — no code populates the keys** | n/a (superseded by caption.py's data-driven appearances) | — (prefer the data-driven caption path; retire the fixed-slot template) | authored in the .docx | — (no unit test) |

Front-matter migration shape: **structured sections**, not pre-composed lines. Pre-composing lines is blocked because every render-model line is force-numbered and paginated into the body stream, and `role` only has `{qa, speaker, parenthetical, centered}` — no title/caption/table/rule/blank values, and no per-line "suppress line number" flag. So the renderer needs new section types + a lined-table primitive.

### Back matter

| Page | Required metadata + finalization data | Current Python behavior | Data status | Live representation to ADD | Pagination? | Tests/templates |
|---|---|---|---|---|---|---|
| **Reporter's certificate** (`certificate.py`) | reporter identity (name/CSR/exp/firm/reg/addr/phone), witness, parties; **time_used** (per-attorney), cost_paid_by | lined-page; sworn/true-record + read-sign-waiver + disinterest clauses + signature block | ✅ `Reporter.*`, `Attorney.time_used` (`case.ts:151`); ❌ cost fields, time_used **aggregation**, waiver flag, signature-line model | reporter-certificate object (aggregated time_used + cost + waiver) + render section | No | `test_spec.py:444-453,1096-1103`; `fig20` |
| **Exhibit-volume certification** (`cert_exhibits.py`) | cause/party/court/county/district, reporter, judge, proceeding_type, date; cost_total/paid_by; exhibits[] | lined-page; "Official Court Reporter" register (diverges from certificate.py) | ✅ caption/session/exhibits; ❌ cost, distinct court_type, Official-vs-CSR role flag | render section (reuse certificate carrier + role variant) | No | **no dedicated test (gap)**; `fig20` |
| **Changes & Signature** (`changes_signature.py`) | witness, date, notary_name/county, identification_method; **errata rows {page, line, change, reason}** | lined-page; 20-row errata grid p1 + signature/notary jurat p2 | ✅ witness/date/`Reporter.notary_*`/`read_and_sign`; ❌ `notary_county`, `identification_method`, **errata change-grid type** | errata list type + notary block + render section | **YES — errata cite final page/line** (needs the enabler) | `test_spec.py:456-464` (+persistence `551-573`); `fig19` |
| **Post-record spellings** (`post_record.py`) | `{name, correct_spelling, letters_as_given, block_index, flag}` | **TWO functions**: (a) centered display colloquy; (b) `apply_retroactive_corrections` global DOCX name substitution | ⚠️ `Witness.spelling_corrections` partial (lacks letters_as_given/block_index/flag) | display section → render; **substitution → A5 correction engine (see below)** | No | **no dedicated test (gap)**; none |

### Indexes (need the pagination enabler)

| Page | Metadata | Finalization data | Current Python | Live gap | Tests/templates |
|---|---|---|---|---|---|
| **Witness index** (`witness_index.py`) | witness names | DIRECT/CROSS/REDIRECT/RECROSS/VD **page refs** | dumb printer of pre-supplied strings | ✅ names; ⚠️ `depositionRegionEngine` detects coarse regions + examination *text* but **not** fine DIR/CROSS granularity; ❌ page numbers | `test_spec.py:468-475`; `fig22` |
| **Exhibit index** (`exhibit_index.py`) | exhibit number/description | offered/admitted/excluded **page refs** | dumb printer | ✅ exhibits; ❌ exhibit-marker detection + page numbers | `test_spec.py:478-486`; `fig22` |

## Architectural boundary — the post-record substitution is a correction concern, NOT a render concern

`post_record.py::apply_retroactive_corrections` re-opens the saved DOCX and **globally substitutes name spellings across every run**. The live export adapter is explicitly built to forbid exactly this: `buildCanonicalExportRenderModel` calls `cfe(..., { applyLexicalCorrections: false })` — *"It must be verbatim — no correction-registry word substitution… Word correction is the separate, recorded A5 correction engine, not this render"* ([exportAdapter.ts:118-123](../../src/lib/export/exportAdapter.ts:118)). **Re-homing the substitution into the renderer would violate the verbatim-certification invariant.** So the split at re-home:
- The **on-record spelling display colloquy** (`write_post_record_section`) → a render-model back-matter section.
- The **authoritative name substitution** → the **A5 correction engine / correction registry**, applied upstream to the working transcript, so by export time the verbatim body already carries the authoritative spelling and no post-save DOCX mutation exists. Relates to [[atia-tie-phase1]], ADR-0017 Decision 4.

## Consolidated required target additions
1. **Pagination output** on the render model (the enabler): per-line `(page,line)` + section/exhibit page anchors — promote the discarded `docx_exporter` computation to queryable data.
2. **Metadata transport:** attach the existing `ufm_metadata` envelope (`buildUfmMetadata.ts` — already carries nearly every front-matter field) to the exported `renderModel` (today `exportServiceContract.ts` ships only `{transcriptId, renderModel:{geometry, lines}}`).
3. **Render-model back/front-matter section model** + a `formatter_core` renderer reproducing the `_lined_page` 25-row table geometry; extend the `role`/paragraph-kind enums.
4. **`case.ts` data additions:** aggregated `time_used` + cost + read-sign waiver (certificate); `notary_county` + `identification_method` + an errata `{page,line,change,reason}` list (changes&signature); `subpoena_duces_tecum`, explicit `court_type`, oral/videotaped flag, witness `title` in the envelope (front matter); post-record `letters_as_given`/`block_index`/`flag`.
5. **Extend `depositionRegionEngine`** to fine examination sections (DIR/CROSS/REDIRECT/RECROSS) + exhibit-marker detection with locations (feeds indexes).
6. **Route post-record substitution to A5** (not the renderer).
7. **Migrate the behavior contract:** the `spec_engine/tests` assertions for each page (and fill the coverage gaps for `cert_exhibits`/`post_record`, currently untested) + the `fig19/fig20/fig22` templates as layout references.

## Recommended sequence (all behavioral → activation is a Human Gate; only characterization is freeze-safe)
Enabler (pagination) → metadata transport → render-model section model + renderer → per-page data types → region-engine extension → A5 routing of post-record substitution → per-page parity tests vs the migrated `spec_engine` assertions → then, and only then, the `transcript_formatter/` certified-page deletion clears its gate.

## Freeze / Human Gates
This document is characterization only. The build is **behavioral** (new render output, schema/`case.ts` additions, `formatter_core` changes, deployment) → **gated by BETA_FREEZE**; each step lands as default-off/non-active scaffolding + tests until an activation Human Gate, exactly as the line_type migration is staged ([[line-type-migration-doc0325]]). Nothing here is implemented or deleted. The Python remains the reference implementation until its replacement is tested and proven (DOC-0326 four-part gate).

## Notes
`ufm_engine`'s `fig18` appearances template currently renders **blank** (no code populates its fixed 2-counsel/3-present slots) — the data-driven `caption.py` appearances path is the better re-home source; the fixed-slot template should not be carried forward. Unproven items flagged by the sweeps: no dedicated tests for `write_cert_exhibits`/`post_record`; TS-vs-Python line-wrap parity (must match to guarantee identical page breaks if pagination is computed TS-side). Relates to DOC-0326, ADR-0017, [[correct-and-format-workspace-architecture]].

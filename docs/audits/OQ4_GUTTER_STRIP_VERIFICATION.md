# ADR-0012 OQ-4 — Export Gutter-Strip Verification

**Date:** 2026-08-04
**Status:** VERIFIED — condition satisfied by construction. No code change required.
**Scope:** READ-ONLY audit of the export/certified render path.

## The standing condition

ADR-0012 **OQ-4** classified the per-utterance line-number gutter shown in the
Transcript Workspace as an intentional, exempt **editing aid** (amending F8), on
the condition that:

> the export pipeline must strip the editing gutter and apply UFM 25-line
> numbering during PDF/DOCX compilation.

This note verifies that condition.

## Verdict: PASS

The Workspace editing gutter never reaches certified output, and certified line
numbering is produced independently by the formatter. This holds **by
construction** — the gutter is a render-layer artifact that is not part of the
transcript data model the export path consumes.

## Evidence chain

1. **The gutter is a TipTap DOM/CSS artifact only.** It is rendered by
   `src/extensions/UtteranceNode.ts` (the `utt-line-num` span, `displayLine`
   computed from the `line_number` / `page_line_number` node attributes) and
   styled by `.utt-line-num` in `src/index.css`. It exists only in the live
   editor DOM — it is not a field of the persisted transcript/case model.

2. **The export render model does not carry it.**
   `buildCanonicalExportRenderModel()` (`src/lib/export/exportAdapter.ts`) builds
   the export model from the data model via CFE → structured transcript package →
   unified render model → editorial rules. It references no `line_number`,
   `page_line_number`, or gutter. `src/lib/transcript/unifiedRendering.ts` and
   `src/lib/export/exportServiceContract.ts` (the export request) carry **no**
   per-utterance line numbers.

3. **Certified numbering is generated fresh by the formatter.**
   `formatter_core/docx_exporter.py` produces the certified DOCX numbering itself:
   `_LINES_PG = 25` (F8 — 25 numbered lines per page) and `_add_render_line()`
   emits a sequential per-page number (`f"{line_number:2d} "`). Certified output
   therefore gets proper UFM 25-line numbering applied at export/certification —
   not the editor gutter.

4. **Defense-in-depth.** `formatter_core/exporter.py._strip_line_number()` removes
   any pre-existing leading line-number prefix from input text before rendering,
   so stray prefixes cannot leak into certified output.

## Caveat

This audit reviewed `formatter_core/` **in this repository's working tree**. The
deployed formatter runs as the `depo-pro-formatter` Cloud Run service (formatter
source lives on the `feat/formatter-service` branch). If the deployed build ever
diverges from in-repo `formatter_core`, re-verify against the deployed artifact.
The in-repo code is the authoritative source and is correct as of this date.

## Outcome

OQ-4's standing condition is **met**. No code PR is required. An optional
regression guard (a test asserting the export render model contains no
line-number fields) could be added if desired, but is not necessary — the export
model has no line-number surface to regress.

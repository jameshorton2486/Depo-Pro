# Certified-pages gate-seeding inventory — Section 41 recompute + authority stop-list

---
authority_tier: T5
status: ACTIVE
owner: Architecture
scope: certified-pages-gate-seeding
supersedes: null
superseded_by: null
effective_date: 2026-08-11
last_reviewed: 2026-08-11
ratification: NOT_REQUIRED
implementation_status: ANALYSIS_ONLY
---

Measured at `codex/certified-pages` HEAD (this run), baseline `8cfe18e`. All figures are
git-tracked (`git ls-files` / `git diff --numstat`), not working-tree. This document seeds
the Production Gate Sequencing Plan; it performs no activation and no deletion.

## 1. Section 41 scorecard (recomputed, git-tracked)

| Metric | Value |
|---|---|
| Delta range | `8cfe18e → <this MEASURED HEAD>` |
| Gross production LOC removed | **19** (edits to paginationProducer, docx_exporter refactor, worker, models, exportServiceContract, exportAdapter) |
| Replacement production LOC added | **1,417** across 14 source files |
| Net production LOC | **+1,398** |
| Test/fixture LOC added | **1,717** across 14 files |
| Total delta | +3,134 / −19 across 28 files |
| Tracked `.py` files (whole repo) | 244 · **46,419** LOC |
| Tracked `transcript_formatter/` | **89** `.py` files · **21,909** Python LOC · **113** total tracked files (unchanged — nothing deleted) |
| Surviving renderer | `formatter_core/` 1,452 LOC + `formatter_service/` 1,669 LOC |
| Modules added (production) | 7 (`anchorDetector`, `certifiedIndexModel`, `finalizedTranscriptModel`, `errataModel`, `certifiedSectionModel`, `certifiedTransport` [TS]; `certified_sections` [Py]) |
| Modules removed | 0 (freeze — no deletion) |

**Key point:** production LOC removed is ~0 by design. The certified architecture was **built
and wired**, not yet **substituted**; retirement LOC removal happens only after activation +
parity upgrade, behind the Human Gate.

## 2. Application-path status
The actual application export path — not merely the shared fixture — produces the complete
certified DOCX locally: `ExportServiceRequest.certified` → `formatter_service.worker`
→ `formatter_core.format_render_model` → `render_certified_document_to_docx`
(`test_certified_worker_path.py`). Default-off preserved (certified absent → body-only).

## 3. Python harvest / deletion-readiness classification (`transcript_formatter/`, 21,909 LOC)

| Subdomain | LOC | Classification | Basis |
|---|---|---|---|
| `spec_engine/pages/*` certified builders | 802 | **REPLACED + PARITY (LEGAL-FORMAT/SEMANTIC)** | reproduced in `formatter_core/certified_sections.py` with parity tests; caption/title/certificate at documented LEGAL-FORMAT parity, not byte-EXACT |
| `spec_engine/*` (emitters, rest) | ~8,236 | **REFERENCE STILL REQUIRED** | body/geometry emitter authority; not reproduced; feeds parity |
| `ufm_engine/*` (templates, merger) | 1,107 | **ASSET/TEST HARVEST REQUIRED** | fig17–28 `.docx` templates are layout references; harvest before any deletion |
| `main.py` | 5,724 | **REFERENCE STILL REQUIRED / UNKNOWN** | desktop GUI orchestrator; unwired from prod but not analyzed for dead-vs-referenced |
| `ai_tools.py` | 1,291 | **UNKNOWN** | superseded by TS ai-review / TIE? needs separate trace |
| `pipeline/*` | 1,473 | **UNKNOWN** | desktop pipeline; reachability not established |
| `providers/*` | 411 | **UNKNOWN** | provider abstraction; possibly superseded by TS providers |
| `formatter.py` / `docx_exporter.py` (desktop) | 948 | **REFERENCE STILL REQUIRED** | reference for the surviving `formatter_core` |
| `depo_qa_fixer.py` | 177 | **GATE-RESERVED** | parallels TS qaFixer retirement (DOC-0325) |
| `tests/*`, `test_*.py` | 607 | **ASSET/TEST HARVEST REQUIRED** | behavior fixtures to migrate before deletion |

No subdomain is yet **PROVEN DEAD** or **DELETION-CANDIDATE** on this evidence: the whole
`transcript_formatter/` remains the governing reference until (a) certified parity is upgraded
and validated, and (b) the DOC-0326 four-part deletion gate is satisfied. **No deletion performed.**

## 4. Active / residual authority stop-list (seed for Gate Sequencing)

| Authority | State | Deletion prerequisite | Expected gate |
|---|---|---|---|
| `qaFixer` (TS) | RESIDUAL | persisted `line_type` activation replaces split at render | Gate 2 (activate line_type) |
| `keepRawLabels` (TS) | RESIDUAL | line_type activation | Gate 2 |
| `structureConfirmed` / `PERSISTED_LINE_TYPE_ENABLED` | ACTIVE-GATE flag (off) | flip in prod after migration | Gate 2 |
| Python `spec_engine/pages` certified builders | RESIDUAL (replaced, parity partial) | certified output deployed + parity upgraded to EXACT where required | Gate 3 |
| Python `transcript_formatter/` (rest) | REFERENCE | full harvest + DOC-0326 gate | Gate 4+ |
| `loadTranscriptSnapshot` unranged fallback | RESIDUAL/legacy | see §5 | Gate precondition |
| UFM/finalization duplication | RESIDUAL | consolidation analysis (§6) | Gate 4 |
| Compatibility render paths (body-only export) | ACTIVE | certified activation supersedes | Gate 3 |

## 5. `loadTranscriptSnapshot` classification
**LEGACY FALLBACK — GATE VERIFY.** Repository evidence: `workspaceApi` routes through
`contractApi` → the paginated editor-api Edge Function when `isRealApiMode()` (production);
`loadTranscriptSnapshot` (unranged `.select("*")`) is only the non-mock/non-real-api fallback +
`naivePersistWorking`/`persistReview`. It is **superseded in the intended production
architecture**. It is **NOT** classifiable as `PROVEN UNREACHABLE` without deployed
configuration evidence (whether `isRealApiMode()` is invariably true in prod). → preserved as
an explicit **Gate precondition**; not patched speculatively under freeze.

## 6. UFM / finalization consolidation (analysis)
Legitimate finalization responsibilities (keep): `buildUfmMetadata` (envelope), the
`FinalizedTranscriptModel` assembly, the canonical `PaginationMap` producer, `cfe`.
Residual/duplicate candidates (consolidate after activation): Python `ufm_engine` metadata
mapping (duplicates `buildUfmMetadata`), Python certificate/caption builders (now mirrored in
`formatter_core`), the body-only vs certified export split (converge once certified is default).
No new audit created — this subject is governed by DOC-0326/0327 and the certified re-home
surface doc; this is a pointer, not a competing authority.

## 7. R1–R4 classification of remaining production actions

| Action | Class | Notes |
|---|---|---|
| Flip `certified` on in the live export request path | R2 | reversible config/flag; local-testable |
| Deploy `formatter_service` with certified renderer | **R3** | outward-facing; Human Gate |
| Activate persisted `line_type` (migration + flag) | **R3/R4** | prod migration + backfill; Human Gate |
| Upgrade caption/certificate parity to EXACT (add missing envelope fields) | R2 | local; needs `case.ts` field additions |
| Fix examination-index synthesized-header gap | R2 | architectural but local/reversible |
| Delete replaced Python reference | **R4** | irreversible; after harvest + DOC-0326 gate |
| Retire `loadTranscriptSnapshot` fallback | R2/R3 | after §5 config verification |

## 8. Candidate program-wide PONR
The **first irreversible crossing** is either (a) the production `line_type` migration+backfill,
or (b) deletion of the Python reference implementation. Both are **R4** and must sit **after**
certified-output deployment + parity validation. Everything built this run is **pre-PONR**
(R1/R2, reversible, inert).

## 9. Remaining Gate preconditions
1. `loadTranscriptSnapshot` reachability — verify `isRealApiMode()` invariance in prod, or fix/retire the fallback (§5).
2. Certified parity upgrade — caption/title/certificate to EXACT where legally required (needs `case.ts` additions: court_type, witness_title, subpoena, reporter firm/address, plaintiff/defendant split).
3. Examination-index synthesized-header gap (§7).
4. Python harvest completion (templates + spec_engine test corpus) before any deletion.
5. DOC-0326 four-part deletion gate for `transcript_formatter/`.

## 10. Readiness statement
- **Actual application export path produces the complete certified DOCX locally: YES** (§2).
- **Certified architecture READY FOR GATE SEQUENCING (Draft Only): YES** — components built,
  wired to the real seam, locally proven end-to-end; residual authorities enumerated; production
  actions R1–R4 classified; PONR identified; preconditions listed.
- **Certified output deployed / activated: NO** — deployment + activation remain the Human-Gated
  steps. Production frozen.

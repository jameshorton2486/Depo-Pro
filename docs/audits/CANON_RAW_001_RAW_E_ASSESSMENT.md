# CANON-RAW-001 — RAW-E: Exposure Assessment & Closure

**Date:** 2026-08-04
**Status:** CLOSED (forward-fix complete; no backfill possible or required)
**Defect:** CANON-RAW-001 — canonical convenience wrappers reduced `FieldResult` to a
bare `.value`, discarding `rawInput` + policy identity/version before persistence.
Violates ratified **A1** (corrections/provenance are recorded) and the transcript
reproducibility principle (persist raw, derive canonical).

---

## 1. Forward fix (merged)

| PR | Layer | Effect |
|----|-------|--------|
| **#69** RAW-A | canonical wrappers | Wrappers return the full `CanonicalField`; call sites use the explicit `canonicalValue()` accessor; ESLint guard bans inline `canonicalizeX(...).value` / `!.value`. Stops new discards. |
| **#75** RAW-B | `field_provenance` | Added `raw_value` / `policy_id` / `policy_version` (nullable, additive). Extraction threads raw + `policyId@version` for the canonical fields that reach provenance (`caption.case_number`, `caption.court_name`). |
| **#76** RAW-C | `cases.payload` | `ExtractedField<T>` gains optional `provenance`. `canonicalizeNameField` stamps raw at write time (all name/firm/employer writes — manual + reducer-applied extraction). Hydration preserves stored raw verbatim (never re-derives from the canonical value). |

Going forward, every governed name/firm write and every canonical extraction event
carries its raw input and policy stamp.

---

## 2. Exposure assessment

**Question:** did the defective (raw-discarding) code path write any rows to
production (`lqxiuwlwzkofdfitxuqe`) before the forward fix?

**Exposure query run 2026-08-04 (read-only):**

| table | rows | most-recent write |
|-------|------|-------------------|
| `field_provenance` | 627 | 2026-07-29 22:48 UTC |
| `cases` | 25 | 2026-08-03 12:06 UTC |
| `contacts` | 3 | 2026-06-14 |
| `firms` | 0 | — |

**The canonical writers (PRs #53–#63) first merged 2026-08-03 20:59 UTC.** Every
governed table's most-recent write is *before* that boundary — the latest (`cases`)
is ~9 hours earlier; `field_provenance`/`contacts` are weeks earlier; `firms` is empty.

**Conclusion: zero rows were written through the defective canonical path.** This is
consistent with the deployment topology — production deploys from `main`, which does
not contain the canonical writers (they live only on `feature/stage3-workspace-core`).
The existing rows were written by the *pre-canonical* code path, or by local/preview
usage before the canonical writers existed.

---

## 3. Backfill decision: none

- **Not needed** — no row was written by the defect path.
- **Not possible** — the 627 legacy `field_provenance` rows (and 25 `cases`) predate
  RAW-B, so they never had raw columns/fields; the raw input was never captured and
  is unrecoverable from these records.

**`NULL` raw_value / absent `provenance` on pre-RAW-B/-C rows is the honest record —
it means "provenance not recorded (legacy)".** We deliberately do **not** run a bulk
`UPDATE` to write a literal `'provenance_unavailable'` marker: it would mutate existing
production rows (against the RAW-B additive-only safety rule) and gain nothing over the
`NULL` semantics documented here. Consumers should read `NULL`/absent as
*provenance_unavailable*.

---

## 4. Coverage matrix (post RAW-A/B/C)

| Governed write | Carries raw + policy? | Where |
|----------------|----------------------|-------|
| Extraction `caption.case_number`, `caption.court_name` | ✅ | `field_provenance` (RAW-B) |
| Person/org **names** — manual entry + extraction adds/patches | ✅ | `cases.payload` `ExtractedField.provenance` (RAW-C) |
| Hydration round-trip of the above | ✅ preserved verbatim | RAW-C |

### Accepted limitations / optional follow-ups
- **Bare-string phones** (`attorney`/`witness`/`reporter` `phone`) are plain strings,
  not `ExtractedField` — no wrapper to carry provenance. Would require a type change to
  wrap them; deferred.
- **`law_firm` phone/fax** write-side raw (extraction `extractedField` path) — preserved
  on round-trip if set, but the extraction write does not yet set it.
- **`contacts` / `firms`** (RAW-D) — **blocked on a data-retention/privacy decision**
  (permanently storing a second, unnormalized copy of attorney names / phone numbers /
  firm details). Not started.

---

## 5. Verification

- Forward-fix behavior is covered by tests in RAW-A/B/C (wrapper return shape + lint
  guard; extraction provenance for cause#/court; write-time name stamp; hydration
  preservation that does **not** re-derive raw). Full suite: 900 tests pass at RAW-C.
- No code or schema change in RAW-E — this is an assessment/closure record only.

**CANON-RAW-001 is closed** for the intake canonical path. Remaining items are the
explicitly-scoped optional follow-ups above and the RAW-D privacy decision.

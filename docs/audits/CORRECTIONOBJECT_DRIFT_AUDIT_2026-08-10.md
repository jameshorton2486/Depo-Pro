# CorrectionObject three-way drift audit — canonical authority + sync

---
authority_tier: T5
status: ACTIVE
owner: Architecture
scope: correctionobject-three-way-drift
supersedes: null
superseded_by: null
approved_by: null
version: null
effective_date: 2026-08-10
ratified_date: null
last_reviewed: 2026-08-10
next_review: 2027-08-10
ratification: NOT_REQUIRED
implementation_status: PARTIAL
---

Date: 2026-08-10 · Audit + freeze-safe remediation. The CorrectionObject contract existed in **three** hand-maintained places (a known sync hazard flagged by DOC-0321 §"Duplicated proposal contract" and DOC-0326). This audit diffs them field-by-field, determines the surviving canonical authority, fixes the real divergences locally, and relocates the schema to a surviving governed home so the retiring Python subsystem can drop out without losing the contract.

## The three representations + their edges

| # | Representation | Path | Live? | Role |
|---|---|---|---|---|
| 1 | TS types + validator | [correctionObject.ts](../../src/lib/transcript/correctionObject.ts) | **YES** — frontend + `ai-review` Edge Function | Hand-authored |
| 2 | JSON Schema | `transcript_formatter/schema/correction_object.schema.json` (now also co-located, see Remediation) | Read only by (3) | Declared "single source of truth" |
| 3 | Python validator | [services/tie/correction_object.py](../../transcript_formatter/services/tie/correction_object.py) | **NO** — dead relative to prod (DOC-0326) | **Derives enums/required from (2)** |

- **Producer:** [aiCorrectionBridge.ts:203-228](../../src/lib/transcript/aiCorrectionBridge.ts:203) builds CorrectionObjects and validates via `collectCorrectionErrors` (flag-gated `AI_REVIEW_BRIDGE`, output currently orphaned — no reader).
- **Persistence:** editor-api ATIA endpoints ([index.ts:1625](../../supabase/functions/editor-api/index.ts:1625)) — `corrections` rows are JSONB carrying the CorrectionObject shape.
- **Tests/fixtures:** [correctionObject.test.ts](../../src/lib/transcript/correctionObject.test.ts) (TS), `tests/test_correction_object.py` (Python, validates the schema's `$defs` examples), and the schema's two `$defs` worked examples.

Key structural asymmetry: **Python cannot silently drift** (it loads the schema and derives `REQUIRED_FIELDS`/all enums/patterns at import, `correction_object.py:37-53`). **TS is hand-authored** and had drifted.

## Field-by-field compatibility matrix (pre-fix)

| Field | Type | Req | Value space | TS vs Schema/Python | 
|---|---|---|---|---|
| `id` | string | ✓ | `^corr_[0-9A-Z]{26}$` | ✅ enforced all three |
| `transcript_id`/`case_id` | string(uuid) | ✓ | uuid format | ⚠️ **neither validator enforces uuid** (tests use `"t1"`); parity OK |
| `specialty` | enum(11) | ✓ | same 11 | ✅ match (TS hand-listed; Python+schema derived) |
| `prompt_version` | string | ✓ | `^v[0-9]+$` | ⚠️ **neither validator enforces the pattern** (presence only); parity OK |
| `location.{paragraph_id,start_word_id,end_word_id}` | string | ✓ | — | ✅ all three |
| `location.{start,end}_offset_ms` | int ≥0 | – | — | ⚠️ **Python validates ≥0 int; TS did not** (minor) |
| `change.type` | enum(9) | ✓ | same 9 | ✅ match |
| `change.before/after` | string | cond | text types only | ✅ match (allOf branch) |
| `change.structural_change` | object | cond | structural types only | ✅ match |
| `reason` | string 10–500 | ✓ | generic rejected | ✅ match (same generic-reason set) |
| `reason_kind` | enum(9) | ✓ | same 9 | ✅ match |
| `confidence` | number 0–1 | ✓ | — | ✅ match |
| `confidence_source` | string | – | — | ✅ (unvalidated all) |
| `provenance.source` | enum(3) | ✓ | ai\|deterministic\|reporter | ✅ match; provider required when ai — ✅ all |
| `provenance.{model,prompt_versions,context_hash}` | — | – | `context_hash ^sha256:…$` | ⚠️ **neither validator enforces context_hash pattern** |
| `supporting_evidence[]` | typed obj (`kind` enum 6) | – | — | ❌ **TS typed `unknown[]`** (fidelity loss) |
| `review.state` | enum(5) | ✓ | — | ✅ match |
| `review.{decided_by,decided_at,decision_note,final_value}` | nullable | – | decision_note ≤1000 | ⚠️ maxLength unenforced both |
| `downstream` | object | ✓ | — | ❌ **TS validator never checked it** (missing → passed TS, failed Python/schema) |
| `downstream.pending_reason` | string\|null | – | — | ❌ **absent from TS interface** |
| (root) `additionalProperties:false` | — | — | — | ⚠️ unenforced by both validators |

### Genuine drifts found (TS the outlier)
1. **`downstream` required, unchecked in TS** — Python enforces it (schema `required`); TS `collectCorrectionErrors` skipped it. A payload missing `downstream` passed TS but failed Python/schema. **Correctness defect → fixed.**
2. **`downstream.pending_reason` missing from the TS interface** — a documented field (accepted-but-apply-deferred, e.g. `qa_split`) absent from the TS type. **Fidelity gap → fixed.**
3. **`supporting_evidence` typed `unknown[]` in TS** — schema has a typed item shape. **Fidelity gap → fixed.**
4. **`location.*_offset_ms` non-negative-int check** — Python validates, TS doesn't (minor; left as-is to preserve validator parity, documented).

### Shared laxity (contract-vs-validator, NOT a TS-vs-Python drift)
`uuid` formats, `prompt_version ^v[0-9]+$`, `context_hash ^sha256:…$`, `decision_note` maxLength, and `additionalProperties:false` are declared in the schema but enforced by **neither** validator. Left intentionally unchanged: tightening only TS would create *new* asymmetry and break existing lenient fixtures (`"t1"` ids). Recommended future convergence, not a freeze-time fix.

## Canonical authority — determination

Evidence supports **TypeScript (`correctionObject.ts`) as the surviving production authority**: it is the only representation on a live path (frontend + `ai-review` Deno Edge Function). The JSON Schema is the richer contract-of-record but was living **inside the retiring `transcript_formatter/`**; the Python validator is dead (DOC-0326). Maintaining three hand-synced copies is the exact anti-pattern to eliminate.

**Target end-state (freeze-safe portion done now):**
- The schema is **relocated to the surviving domain** (`src/lib/transcript/correction_object.schema.json`) as the co-located contract-of-record.
- TS remains the production authority, kept in lockstep with the schema by a **drift test** ([correctionObjectSchema.test.ts](../../src/lib/transcript/correctionObjectSchema.test.ts)) that fails if enums/required diverge and runs the schema's `$defs` examples through the TS validator — mechanical sync, not hand-sync.
- The Python schema copy + validator **retire with `transcript_formatter/`** (DOC-0326 gate); until then they are a harmless mirror.
- **Later (optional, post-freeze):** generate the TS unions from the schema (or vice-versa) to remove even the mirrored enum lists in the drift test. Not required — the drift test already makes divergence a red build.

## Remediation applied (this commit — freeze-safe, no activation)
- TS interface: added `CorrectionDownstream.pending_reason`, added `SupportingEvidenceKind` + `CorrectionSupportingEvidence` and typed `supporting_evidence`.
- TS validator: added `downstreamErrors` (downstream must be an object) — closes divergence #1; verified the live producer and all fixtures already emit `downstream`, so no behavior change.
- Relocated the schema to `src/lib/transcript/` (copy; Python copy untouched until retirement).
- Added the drift-guard test (7 assertions; enum + required parity + both worked examples validate).
- Updated the provenance comment in `correctionObject.ts` to point at the co-located schema and name TS the surviving authority.
- Ladder: focused (16) + full suite (930) pass; typecheck + changed-file lint clean; build OK.

## Remaining harvest / gates (not done here)
- **Bridge/provider prompt** `transcript_formatter/prompts/bridge/full_review.md` — **not a mechanical relocate.** Characterized 2026-08-10: the `.md` is a 128-line design document (`# Role` structure + ATIA-STATUS header); the *runtime* prompt is `BRIDGE_SYSTEM_PROMPT` (~21 condensed lines, `aiCorrectionBridge.ts:78-99`). Both tagged `bridge/full_review@v1` but they are **divergent representations** — relocating the `.md` as-is would enshrine a design doc that no longer matches what executes. Requires a reconciliation decision (is the `.md` still the spec, or has the runtime TS become canonical?) before relocation + de-dangling the `aiCorrectionBridge.ts:10-12` comment. Open harvest item; the runtime prompt already lives in the surviving `src/` domain, so retirement of the `.md` loses no executing behavior.
- **Python deletion** stays behind the DOC-0326 four-part gate. The schema copy + `correction_object.py` + `test_correction_object.py` go with it.
- The **shared-laxity** items above are a future convergence decision, not a freeze-time change.

## Notes
Nothing deployed, no prod data touched, `PERSISTED_LINE_TYPE_ENABLED` still false, ADR-0018 still DRAFT/A5. Relates to [[line-type-migration-doc0325]], [[atia-tie-phase1]]; grounded by DOC-0321 and DOC-0326.

# Correction Recording & Marking Audit (Prompt A, Parts 1–2)

**Branch:** `audit/correction-recording`
**HEAD SHA:** `9f0750df1fd3744b729f64e961f6c5d81fc775c9`
**Authority:** `docs/architecture/RATIFIED_DECISIONS.md` — A1 (recorded corrections), A5 (auto-apply + recording + marking), A6 (persisted structure), A8 (rendering never writes), A9 (Deepgram immutable baseline).

> Verification note: the load-bearing claims below (raw_text immutability, the audit-log engine/version gap, the bridge's four A1 fields, the certification-schema gap, and the "Auto-fixed" counter source) were independently re-checked against source during review.

## Executive summary

There are **two distinct AI content-change engines** in this tree and they record provenance very differently. The **ATIA bridge** engine (`AI_REVIEW_BRIDGE=true`) writes full `corrections` rows that satisfy A1's four required fields (original text, new text, engine, engine version) — but it does **not** auto-apply; changes stay pending until a human decides. The **legacy word-suggestion** engine *can* auto-apply (`AI_REVIEW_AUTO_APPLY` on), and when it does it writes a `transcript_audit_log` row that captures original/new text but **omits the originating engine and engine version** — a partial-A1 record. A third, **unconditional** engine — the boundary engine in the finalize worker — auto-mutates the authoritative utterance table (inserts synthetic non-Deepgram utterances, marks Deepgram utterances excluded) and writes **no correction record at all**, only column flags. Separately, the Workspace "Auto-fixed" counter counts an **ephemeral in-memory detection report that is never applied or persisted**, so the label overstates what happened. The Certification checklist stores five booleans with **no certifier identity, no timestamp of who/when, no transcript version, and no reference to the applied-correction set or engine versions**, so it cannot presently serve as A5's covering human decision.

## Severity ranking

Ordered by what needs fixing, not by how the summary reads. The good-news STOP-CONDITION result is real but should **not** lead — the two High items are the actionable violations.

| # | Finding | Severity | Why |
|---|---|---|---|
| 1 | Boundary engine writes canonical (`transcript_utterances`) with **no correction record** (`transcriptFinalize.ts:289,615-633`) | **High** | Silent mutation of authoritative data — no A1 record, no flag gate. Not "incomplete recording"; *no* recording. Matches the prior three-agent audit's "two sequential boundary writers, post-completion renumber swallows failures." |
| 2 | `case_certifications` has no certifier, no version stamp, no correction-set reference (`create_core_schema.sql:346-355`) | **High** | A5's covering human decision has nowhere to attach; "Transcript review complete" is a boolean recording essentially nothing. **Top of the Phase 4/7 backlog** — automatic application is only defensible once something records who reviewed what, when, against which version. |
| 3 | `transcript_audit_log` missing engine + engine version (`transcript_persistence_v2.sql:249-255`) | **Medium** | Partial A1 — before/after text survive, so recoverable; only attribution + version is lost. |
| 4 | "Auto-fixed" counter counts unpersisted detections (`correctionOrchestrator.ts:247`, label `CorrectionsPanel.tsx:145`) | **Low** | A counter named "Auto-fixed" that counts *detected candidates* reads as applied changes at a glance. One-line UI fix — but it belongs on the list. |

## STOP CONDITION assessment

**The literal stop condition — "applied content changes can exist with NO recoverable original text" — does NOT hold for word-level text.** `transcript_words.raw_text` (the Deepgram verbatim token) is protected by an immutable-column trigger `reject_raw_text_change` (`supabase/migrations/20260603210000_create_core_schema.sql:203-219`); every content overlay is written to `working_text`/`text`, never to `raw_text`. So the Deepgram original of any changed word is always recoverable, and A9's baseline survives every write path examined.

> **Recoverable ≠ provenance intact.** `raw_text` immutability lets you recover the Deepgram *baseline* and diff it against the delivered transcript — but every diff looks identical: you cannot tell an AI change from a reporter edit from the persisted data alone. Remediating a delivered transcript therefore means re-reviewing **all** changes, not just AI ones. "Originals recoverable" is a strictly weaker claim than "provenance intact," and A1 requires the latter. Do not let the two be conflated.

**However, three narrower exposures exist and should be treated as the real remediation risk:**
1. **Engine/version is unrecoverable for legacy auto-applied changes.** The audit row for an auto-apply has no engine-version column at all (see Part 1, path 1); only an aggregate, per-transcript, overwritten-each-run `ai_review_meta` carries the version.
2. **Boundary/structural AI changes have no correction record** — recorded only as `is_synthetic` / `excluded_from_output` column flags (Part 1, synthetic-utterance subsection).
3. **The immediate pre-change overlay is not recorded by the bridge-apply path.** `applyTextCorrectionWorking` overwrites `working_text` without logging the prior `working_text`; only the Deepgram baseline (`raw_text`) and the AI's generation-time `change.before` remain (Part 1, path 3).

---

## PART 1 — CURRENT BEHAVIOUR

### Auto-apply / apply paths overview (defaults)

| Path | Trigger / flag (default) | Auto-applies content? | Correction record written? |
|---|---|---|---|
| 1. Legacy word auto-apply | `ai-review` fn; `AI_REVIEW_AUTO_APPLY` **default false** (`aiReview.ts:186-193`) + `suggestion.auto_apply` | Only when flag on | `transcript_audit_log` row, **missing engine + engine version** |
| 2. ATIA bridge | `ai-review` fn; `AI_REVIEW_BRIDGE` **default off** (`index.ts:76`) | **No** — stays pending | `corrections` row: **all 4 A1 fields present** |
| 3. Bridge correction apply | `editor-api` `POST /:id/corrections/:id/decide`; **human** accept/edit | Yes (on human decision) | `correction_decisions` row; **no `transcript_audit_log` row; no pre-overlay capture** |
| 4. Legacy pending accept | `editor-api` `PATCH ai-suggestions` / `accept-all`; **human** | Yes (on human accept) | `transcript_audit_log` row (`ai_suggestion_accepted`), **no engine version** |
| 5. Boundary engine | `transcript-finalize` worker; **unconditional** (`transcriptFinalize.ts:289`) | Yes — inserts synthetic utterances, excludes Deepgram rows | **None** (column flags only) |
| 6. Human working-text save | `editor-api` `PUT /:id/working` → RPC | Yes (human) | `transcript_audit_log` row, `source='editor'` |
| — Deterministic "Auto-fixed" report | `buildCorrectionReport` (client) | **No — never applied/persisted** | None (ephemeral) |

### Path 1 — Legacy word auto-apply (`supabase/functions/ai-review/index.ts`)

- **Trigger/condition:** `ai-review` edge function; auto-apply gate is `autoApplyEnabled = isAIReviewAutoApplyEnabled(Deno.env.get("AI_REVIEW_AUTO_APPLY"))` (`index.ts:52`). Default is **false** for a null/unset env (`aiReview.ts:186-193`). Per-suggestion, `autoApplied = autoApplyEnabled && suggestion.auto_apply` (`aiReview.ts:211`).
- **Target table/columns:** `transcript_words` updated with `ai_suggestion`, `ai_suggestion_reason`, `ai_confidence`, `ai_suggestion_status` (`'accepted'` when auto-applied else `'pending'`), and `working_text` (`aiReview.ts:217-222`, applied at `index.ts:206-210`). Note it does **not** set `text` or `edited`.
- **Correction record?** Yes, one `transcript_audit_log` insert per auto-applied word (`index.ts:221-240`). It captures **original text** (`old_text`/`before_text` = prior `working_text ?? raw_text`, `aiReview.ts:213,230-233`) and **new text** (`new_text`/`after_text`, `aiReview.ts:231,233`). **MISSING fields (A1):** *originating engine* (only `source='ai_review'` and `action='ai_suggestion_auto_applied'`, `aiReview.ts:74-75`; there is no engine-name column on `transcript_audit_log` — schema `create_core_schema.sql:233-245` + added columns `transcript_persistence_v2.sql:249-255`), and *engine version* (no `prompt_version`/`model` column on the row). The version exists only in the aggregate `transcripts.ai_review_meta` (`index.ts:279-293`, `prompt_version` L285, `model` L286), which is per-transcript and overwritten on every run — it cannot be attributed to an individual change.
- **Pre-change text recoverable from persisted data alone?** Yes. Deepgram original always recoverable via immutable `transcript_words.raw_text` (`create_core_schema.sql:203-219`); the specific pre-change value is also stored in the audit row's `before_text` (`index.ts:238`).
- **Deepgram provenance preserved (A9)?** Yes — `raw_text` never written by this path (only `working_text`).
- **Workspace distinguishable?** Yes for this path. The word row carries `ai_suggestion` + `ai_suggestion_status='accepted'` with `working_text` set; `editor-api mapWordRow` surfaces both (`editor-api/index.ts:435-451`) and `TranscriptEditor` counts them (`TranscriptEditor.tsx:158-180`).

### Path 2 — ATIA bridge generation (`runBridgeReview`, `index.ts:340-502`)

- **Trigger/condition:** `AI_REVIEW_BRIDGE` env `=== "true"` (`index.ts:76`). Default off.
- **Target table/columns:** `correction_runs` insert (provider/model/prompt_version/context_hash/tokens/latency, `index.ts:424-441`; schema `20260729120000_corrections.sql:27-42`) then `corrections` insert (`index.ts:448-474`; schema L49-72).
- **Correction record?** Yes, and it captures **all four A1 fields**: original + new text in `change` JSONB (`index.ts:459`; column `corrections.change` L60, i.e. `change.before`/`change.after`), *originating engine* via `specialty` (`index.ts:456`, column L54) + `provider`/`model` on the run (`index.ts:429`), *engine version* via `prompt_version` (`index.ts:457`, columns L56/L33). Provenance JSONB and `context_hash` also stored (`index.ts:456,464`).
- **Auto-applies content?** **No.** The corrections are inserted with their generator-supplied `review`/`downstream` (`index.ts:465-466`); nothing writes `transcript_words`/`transcript_utterances` here. This is per-change-approval mode, which A5 permits but which means the "automatic application" clause of A5 is not exercised in bridge mode.
- **Deepgram provenance / recoverability:** intact — no content table touched.

### Path 3 — Bridge correction apply (human decision) (`editor-api/index.ts`)

- **Trigger:** `handleDecideCorrection` on `POST /:jobId/corrections/:id/decide` with `action` accept/edit (`editor-api/index.ts:1596-1683`). Human-initiated.
- **Target:** `applyCorrection` (`:1697-1726`) → for `TEXT_CHANGE_TYPES` (`:1594`) calls `applyTextCorrectionWorking` (`:1728-1784`), writing `transcript_words.working_text`/`text`/`edited` across the located range (`:1774-1778`). For `speaker_reassignment`, `applySpeakerCorrection` updates `transcript_speakers` (`:1786-1833`). `DEFERRED_STRUCTURAL_TYPES` (qa_split, examination/off-record/objection, `:1688-1693`) are accepted but **not applied** (`:1721-1723`).
- **Correction record?** The decision is recorded in `correction_decisions` (`:1661-1677`; schema `20260729120000_corrections.sql:93-111`) and the `corrections` row's `review`/`downstream` updated (`:1652-1656`). **No `transcript_audit_log` row is written by the apply.**
- **Pre-change recoverable?** Deepgram baseline yes (`raw_text` immutable). But the **immediate prior `working_text`** at apply time is overwritten without capture (`:1774-1778`); only the AI's generation-time `change.before` (possibly stale) persists. Name each missing recording: *immediate pre-apply overlay value* is not persisted by this path.
- **Workspace distinguishable?** **No** at the word level. `applyTextCorrectionWorking` sets `working_text`/`edited` but leaves `ai_suggestion` null, so an AI-applied bridge change is indistinguishable from a human manual edit using `transcript_words` columns alone (`editor-api/index.ts:435-451`). To render the A5 mark the Workspace must join `corrections` (state `accepted`/`edited`, `downstream.applied_to_working_transcript=true`) to its `location.start_word_id`/`end_word_id` — data that exists in `corrections.location`/`downstream` (`index.ts:1616-1650`) but is not carried on the word row.

### Path 5 — Boundary engine (finalize worker) (`supabase/functions/_shared/transcriptFinalize.ts`)

- **Trigger:** called **unconditionally** as best-effort enrichment after the transcript is marked complete (`transcriptFinalize.ts:289`); only internal guard is a missing `ANTHROPIC_API_KEY` (`:662-667`). No feature flag.
- **What it writes to the AUTHORITATIVE tables:** (a) **inserts synthetic utterances** into `transcript_utterances` with `is_synthetic=true`, `speaker_id='spk_synthetic_boundary'`, and a template `text` (oath/off-record/on-record parentheticals) (`:615-633`, insert at `:825-828`), plus matching synthetic words (`:634-654`); (b) **mutates existing Deepgram utterances**, setting `excluded_from_output`/`exclusion_reason` for pre-record/off-record/post-record spans (`:789-796`, upsert `:818-820`).
- **Correction record?** **None.** No `corrections`, `correction_runs`, or `transcript_audit_log` row is written for these AI structural decisions. The only persisted provenance is the `is_synthetic` boolean and `speaker_id` (schema `20260627201000_add_boundary_fields.sql:1-4`). Engine version is not recorded anywhere per-change.
- **A9:** the synthetic rows add non-Deepgram content; the exclusions hide (but do not delete) verbatim Deepgram content — reversible via the `excluded_from_output` flag, so recoverable, but performed with no correction/audit trail.

### AI-synthesized utterances in the authoritative table

**Yes — AI-synthesized utterances with no Deepgram origin are persisted into the authoritative `transcript_utterances` table.** Writer: `buildBoundarySyntheticInsert` / `runBoundaryEngine` (`transcriptFinalize.ts:615-633`, insert `:825-828`). **Distinguishable?** Yes, via `transcript_utterances.is_synthetic = true` (column added `20260627201000_add_boundary_fields.sql:4`) and the sentinel `speaker_id = 'spk_synthetic_boundary'` (`transcriptFinalize.ts:170`). `editor-api` reads `is_synthetic` and forwards it (`editor-api/index.ts:319,431`). So the distinction is renderable, but it is *not* backed by a correction record or engine version.

### The "Auto-fixed" counter — trace from label to data source

- **UI label:** `CorrectionsPanel.tsx:145` renders a `StatRow label="Auto-fixed"`.
- **Value:** `summary.deterministic_corrections_applied` (`CorrectionsPanel.tsx:146`).
- **Data source:** `buildCorrectionReport` sets `deterministic_corrections_applied: deterministicCorrections.length` (`correctionOrchestrator.ts:247`). That array is built by scanning the in-memory `EditorDocument` against `DETERMINISTIC_TOKEN_CORRECTIONS`/`DETERMINISTIC_PHRASE_CORRECTIONS` (`correctionOrchestrator.ts:105-143,166-202`) and pushing *detected* defects (`raw_token`→`corrected_token`). **The function mutates nothing and persists nothing** — it returns a report object (`:242-261`).
- **What it actually counts:** the number of tokens/phrases that *match* a deterministic rule in the current document view — i.e. **candidate** corrections **detected**, not corrections applied or recorded. It does **not** equal "recorded corrections." The label "Auto-fixed" is therefore misleading; nothing is auto-fixed by this path. (A separate banner counter, `TranscriptEditor.tsx:158-180` / `AIReviewBanner.tsx:32-33` "auto-applied," counts word rows where `ai_suggestion` is set and `ai_suggestion_status='accepted'` and `text !== raw_text` — that one does track the Path-1 legacy auto-apply, but not Paths 3 or 5.)

---

## PART 2 — CERTIFICATION LINKAGE

### Where checklist state is persisted and what it records

- **Table:** `case_certifications` (`create_core_schema.sql:346-355`). Columns: `certification_date date`, `certification_statement text`, `checklist jsonb`, `signature_hash text`, `created_at`, `updated_at`.
- **Checklist shape:** five booleans — `review_complete`, `speaker_mapping_complete`, `confidence_review_complete`, `exhibits_complete`, `ufm_complete` (`src/types/case.ts:319-325`; client default `CertificationScreen.tsx:25-31`). `review_complete` is derived from unreviewed-word count == 0 via `editor-api handleGetCertifyStatus` (`editor-api/index.ts:1342-1349`) and stored as a boolean (`CertificationScreen.tsx:77`).
- **Persistence path:** client `saveCase(record)` (`CertificationScreen.tsx:54`) → the certification is written by RPC `save_case_with_certification` (`20260722024834_atomic_case_certification_save.sql:44-64`). Once `certification_date` is set the row is locked by triggers (`20260722020816_enforce_certification_lock.sql:34-38`, and transcript tables become immutable, `:125-163`).

### What it captures vs. what A5 requires

- **Who certified?** **Not captured.** `case_certifications` has no user/reporter column; `save_case_with_certification` inserts none (`:44-64`). `signature_hash` is the only identity-ish field and the client hard-codes it to `null` (`CertificationScreen.tsx:32,83`), so it is empty in practice.
- **When (as an audited who/when)?** Only `certification_date` (a `date`, not a timestamp, `create_core_schema.sql:349`) and generic `updated_at`. No actor.
- **Against which transcript VERSION?** **Not captured.** No transcript revision / content hash / `updated_at` snapshot is stored on the certification. (`transcripts.ai_review_meta.transcript_revision` exists — `index.ts:172`/`aiReview.ts` — but it is not referenced by the certification record.)
- **Reference to the applied-correction SET or engine version(s)?** **None.** The checklist is five booleans; nothing links it to `corrections` ids, `correction_runs` ids, `transcript_audit_log` `change_id`s, or any `prompt_version`/`model`.

### The gap (named, not designed)

For the Certification checklist to be A5's covering human decision it would need, at minimum, fields that are currently **absent**: (1) a **certifier identity** (owner/reporter user id) on `case_certifications`; (2) a **content-version stamp** of the transcript at certification time (revision timestamp or content hash) so the decision is bound to exact bytes; (3) a **reference to the correction set** covered — e.g. the set of `corrections.id` / `transcript_audit_log.change_id` and the `correction_runs.id` (with their `prompt_version`/`model`) that were applied to that version. None of these three exist in the schema or the save RPC today.

---

## FINDINGS (adjacent, not fixed)

1. **Two divergent recording standards for AI content changes.** Legacy auto-apply (audit-log, no engine version) and bridge (corrections table, full A1) coexist under separate flags; there is no unified correction ledger, so A1 compliance depends on which flag is set.
2. **`transcript_audit_log` has no engine/engine-version column** (`create_core_schema.sql:233-245`, `transcript_persistence_v2.sql:249-255`). Every audit-logged AI change (`ai_suggestion_auto_applied`, `ai_suggestion_accepted`) is a partial-A1 record.
3. **Boundary engine auto-mutates the authoritative utterance table with no correction record and no flag gate** (`transcriptFinalize.ts:289`). Relevant to A1, A5, and A6 (structure is persisted but not as recorded corrections).
4. **Bridge-applied word changes are unmarked at the word level** (`editor-api/index.ts:1774-1778` sets no `ai_suggestion`), so they are indistinguishable from human edits without a `corrections` join — an A5 marking gap.
5. **"Auto-fixed" label overstates behaviour** — counts unpersisted detections (`correctionOrchestrator.ts:247`).
6. **`signature_hash` is dead in the client** (always `null`, `CertificationScreen.tsx:32,83`), yet it is one of the fields the immutability trigger compares (`20260722020816...:23`).
7. **`ai_review_meta` is overwritten each run** (`index.ts:279-293`), so per-transcript engine-version history is not retained across re-reviews.
8. **UNVERIFIED:** the exact JSON shape of `corrections.change` (assumed `before`/`after`) is defined by `schema/correction_object.schema.json` (referenced `20260729120000_corrections.sql:7`), which was not opened in this audit. Verify by reading that schema file before relying on `change->>'before'` as the original-text field.

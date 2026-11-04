# line_type Migration Plan — one persisted reviewed structure for Workspace and every deliverable

---
authority_tier: T5
status: ACTIVE
owner: Architecture
scope: line-type-migration-plan
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

Date: 2026-08-10 · Planning artifact (no code changes, no migration executed). Follows the C2a decision analysis (DOC-0324) with owner decisions **D1–D7 approved** and the invariant **D7 ratified**:

> **The reporter certifies exactly what she reviewed.** Workspace, UFM, certification, and every deliverable (DOCX / PDF / TXT / JSON / package) consume the **same persisted reviewed structure**. Export/rendering must not independently re-infer transcript structure.

Target pipeline: `Deepgram evidence → AI/deterministic structural proposals → Working Transcript → reporter reviews uncertainty → PERSISTED line_type → Workspace → UFM/Finalization → Certification → DOCX/PDF/TXT/JSON`.

## Current state (grounding)

- `transcript_utterances` already has structure columns (migration `20260627220500_add_structure_fields.sql`): `line_type text` (the intended persisted authority — **currently unpopulated**; DOC-0320 found zero non-UNKNOWN values), `ai_suggested_line_type text` (a structural proposal, written **only** by the broken `ai-review`, [ai-review/index.ts:273](../../supabase/functions/ai-review/index.ts:273)), and `manually_reassigned boolean` (a partial review-state flag).
- **Two divergent render-time classifiers** re-infer structure every render: `workspacePresentation.buildTranscriptParagraphs` (Workspace) and `transcriptParagraphs.buildTranscriptParagraphs` (export). Export already *reads* `normalizePersistedLineType(...line_type)` as a hint ([exportAdapter.ts:128,137](../../src/lib/export/exportAdapter.ts:128)) but falls back to inference because `line_type` is empty.
- Read helper exists: `normalizePersistedLineType` / `hasPersistedLineType` ([structuredTranscript.ts:13,28](../../src/lib/transcript/structuredTranscript.ts:13)).
- No `confidence`, `reason/evidence`, or explicit `review_status` columns yet. `confirmStructure`/`keepRawLabels` are ephemeral, never persisted (DOC-0324).

The migration is therefore mostly **populating and reading an existing field consistently**, plus adding a proper proposal/confidence/review contract and converging the two classifiers.

---

## 1. Canonical `line_type` representation

- **Values:** `Q | A | COLLOQUY | PARENTHETICAL | BY_LINE | SECTION_HEADER | UNKNOWN` (union of what both classifiers already emit; `TranscriptParagraphKind`). Keep `UNKNOWN` as the explicit "not yet established" sentinel.
- **Storage:** the existing `transcript_utterances.line_type text`, constrained to the enum (CHECK or an enum type). One row = one utterance's established structural role.
- **Authority rule:** `line_type` is the *single* structural authority. When present and not `UNKNOWN`, every consumer (Workspace, export, UFM, certification) uses it verbatim and **never re-infers**.

## 2. Structural proposal + confidence representation (D2)

The classifier's output contract gains explicit uncertainty. Proposal fields on `transcript_utterances` (or a sibling `transcript_structure_proposals` table if we want history):

- `proposed_line_type text` (rename/reuse `ai_suggested_line_type`), `line_type_confidence real` (0–1), `line_type_reason text` (short evidence, e.g. "speaker role=WITNESS → A"; "regex parenthetical"; "objection cue"). Optionally `proposed_by text` (engine id + version, per A1/A10 versioning).
- The classifier (`classifyLineDescriptor` / `descriptorForLine`) is refactored to **emit** `{ line_type, confidence, reason }` instead of a bare kind. This is the **output-contract change** DOC-0324 flagged — it is real work, not UI.
- Migration aid only (D2): the existing `LOW_CONFIDENCE` (acoustic) / `UNCERTAIN_SPEAKER` (no role) line-flags may seed early "needs review" surfacing, but they are **not** the final confidence authority and must not be plumbed as such.

## 3. Human review / confirmation state (D1)

- `line_type_review_status text` ∈ `UNREVIEWED | CONFIRMED | OVERRIDDEN` (supersedes the boolean `manually_reassigned`, which backfills to `OVERRIDDEN` where true).
- Semantics: a proposal starts `UNREVIEWED`. The reporter accepting keeps the proposed value and sets `CONFIRMED`; changing it writes the new `line_type` and sets `OVERRIDDEN`. Reliable high-confidence proposals may be auto-`CONFIRMED` at a threshold (a product knob), with the reporter's Certification read-through as the covering human decision (A5).
- The Workspace review affordance surfaces `UNREVIEWED` + low-confidence items first.

## 4. Working Transcript persistence (D3)

- `line_type` + `line_type_review_status` are part of the Working Transcript (persisted, owner-scoped, RLS as with other utterance columns). They survive reload (unlike today's ephemeral `structureConfirmed`).
- **Autosave / reopen:** a review decision participates in the same autosave path as other utterance edits — persisted on autosave (not only on explicit save) and restored verbatim on reopen. Because structure is persisted rather than re-derived per session, reopening a partially-reviewed transcript shows the exact prior `line_type`/`review_status` state, and no proposal is silently re-applied over a `CONFIRMED`/`OVERRIDDEN` utterance.
- Write path mirrors the existing F10 speaker-reassignment path through **editor-api** (owner-scoped RPC/endpoint), so review writes are atomic and authorized. No client-side direct DB writes.

## 5. Workspace read/write path (D1/D3)

- **Read:** `buildEditorContent` / `workspacePresentation` consume persisted `line_type` when present (not `UNKNOWN`); only `UNKNOWN`/`UNREVIEWED` utterances are classified for a *proposal* to surface, never silently applied.
- **Write:** a review action (accept / change line_type) dispatches to editor-api, persists `line_type` + `review_status`, and updates local state; the render re-reads persisted structure. Replaces the all-or-nothing `confirmStructure` toggle with per-utterance review.

## 6. Migration from `structureConfirmed` (D1)

- `structureConfirmed` (ephemeral boolean, reset every load) is retired. "Structure confirmation" becomes: (a) proposals persisted with `review_status`, (b) a Workspace review surface, (c) a transcript-level "structure review complete" derived from `review_status` (no `UNREVIEWED` low-confidence items remain) rather than a session flag.
- Interim: keep `structureConfirmed` as a thin compatibility shim during rollout; remove once the review surface + persistence land.

## 7. Remove `keepRawLabels` as a normal transcript mode (D4)

- Delete the `keepRawLabels` branch from `buildEditorContent` / `buildFormattedTranscriptText` and the "Keep Raw Labels" control from `FormatCorrectBanner`. The normal transcript always shows the reviewed/resolved representation.
- Provider labels are not discarded (see §8).

## 8. Raw-evidence inspection surface (D5)

- Provider/Deepgram labels (SPEAKER 0/1/2, diarization) remain available **only** through an explicit **"View Provider Evidence"** surface, backed by immutable raw evidence (extend the existing `RenderLayer "canonical"` / `CanonicalBaselineView` / Pipeline Inspector rather than a competing transcript mode). Read-only; never a Working Transcript representation.

## 9. Workspace/export classifier convergence (D7 — the core defect fix)

- Both render paths consume the **same** persisted `line_type`. Where `line_type` is established, neither infers. The two `buildTranscriptParagraphs` implementations collapse toward **one** shared structural-paragraph builder driven by persisted `line_type` (+ geometry/region presentation, which may stay path-specific). `qaFixer` is removed from this spine (§11).
- Result: the Workspace-reviewed structure and the certified structure are **identical by construction** — the ratified invariant.

## 10. TXT / package-JSON convergence (D6)

- `buildFormattedTranscriptText` and the package JSON derive from the same reviewed structure as the DOCX render model — no `keepRawLabels` branch, no independent inference. All deliverables share one structural source.

## 11. `qaFixer` consumer migration and retirement (§15 of Phase G)

- Sole runtime consumer: `workspacePresentation.ts:743` (`applyQaFixer`), now wrapped by the shared-builder seam (Wave A, `a260fca`): `applyReviewedStructure(applyQaFixer(paragraphs), document)`.

### Final behavior matrix (2026-08-10) — the retirement-blocking finding

**`applyReviewedStructure` does NOT replace `qaFixer`.** The overlay only *re-kinds* an existing paragraph; `qaFixer`'s core job is to *split one paragraph into several*. That split is a structural change to the Working Transcript, and it belongs upstream in the **CorrectionObject structural-apply** domain — not in a render-time overlay.

| # | `qaFixer` behavior | Trigger | Transform | Changes | Replaced by `applyReviewedStructure`? | Canonical owner | Migration dependency | Gate |
|---|---|---|---|---|---|---|---|---|
| 1 | Short-answer **Q/A split** | Q paragraph containing `?` + `SHORT_ANSWER_PATTERN` (Yes./No./Correct./I did./I do./I have./I don't.) | 1 Q para → Q + A (+ recursive trailing Q) | **structure (paragraph count)** | **NO** — overlay changes kind, never splits | CorrectionObject `qa_split` (structural change, applied to the Working Transcript **upstream** of paragraph building) | a **qa_split structural-apply engine** (memory: `structural_apply_engine_v2`, not built) | NOT MET |
| 2 | **Embedded-objection split** | Q paragraph matching `OBJECTION_PATTERN` (`Objection. (Form.\|Foundation.)?`) | 1 Q → Q + COLLOQUY(objection, verbatim, `UNIDENTIFIED_SPEAKER`) + Q | **structure + attribution marker** | **NO** — split not covered | CorrectionObject `objection_attribution` + an upstream speaker-resolution migration (qaFixer must NOT resolve identity) | objection structural-apply + speaker diarization migration | NOT MET |
| 3 | **Consecutive re-merge** | adjacent paragraphs, same `kind` + same `label` (not SECTION_HEADER/BY_LINE) | merge into one | presentation | Partially — the builder's own `canMergeParagraphs`/`mergeParagraph` already merges during construction | the paragraph builder (or converged builder) | none (builder already merges); becomes redundant once splits move upstream | can retire with #1/#2 |
| 4 | Non-Q passthrough | any non-Q paragraph | clone unchanged | none | n/a | n/a | none | trivial |

**Behavior `applyReviewedStructure` does not cover (explicit):** paragraph **splitting** (#1, #2). The overlay re-labels a paragraph's kind from persisted reviewed `line_type`; it cannot turn one paragraph into two. Do NOT copy the split logic into the structural overlay — that would rebuild a render-time classifier. The split is a *reviewed structural correction* applied to the Working Transcript.

### Revised retirement sequence + gate
1. Build the **CorrectionObject structural-apply** path (qa_split, objection split) that mutates the Working Transcript upstream, so each utterance is one structural unit before paragraph building (a reviewed decision, recorded/markable — A5).
2. Persisted reviewed `line_type` + `applyReviewedStructure` supply the per-paragraph kind; the builder's own merge covers presentation (#3).
3. Q/A + objection parity on the clean baseline (structure identical to today's `qaFixer` output, but reviewed rather than heuristic).
4. Remove the `applyQaFixer` call; retire `qaFixer` + tests via the four-part deletion gate.

**Deletion-gate status: NOT locally satisfiable under the current authorization.** Retirement depends on the structural-apply engine (a separate build) + a speaker-resolution migration. Until those exist, **`qaFixer` stays in place behind the compatibility path** (do not force deletion). The Wave A seam already positions the overlay to run *after* `qaFixer`, so activation converges kinds without yet removing the split.

## 12. Compatibility with existing UNKNOWN transcripts (§12)

- Every existing transcript has `line_type` null/`UNKNOWN`. Behavior must be graceful: `UNKNOWN` → show proposals for review (never a blank or a silent guess). No transcript breaks; the reporter simply sees an unreviewed structure state. Certified transcripts already locked are read-only and unaffected (certification lock migration exists).

## 13. Schema / database changes

Additive, on `transcript_utterances`:
- constrain `line_type` to the enum (CHECK); keep default null.
- add `line_type_confidence real`, `line_type_reason text`, `line_type_review_status text` (default `UNREVIEWED`, CHECK enum).
- reuse `ai_suggested_line_type` as `proposed_line_type` (rename or alias); migrate `manually_reassigned=true` → `review_status=OVERRIDDEN`.
- RLS/owner-scope consistent with existing utterance columns; A7 (migration files are schema authority) — one migration, CI parity with `src/types/database.ts` (hand-written; never let `supabase gen types` overwrite it — see the database-types landmine).

## 14. Backfill strategy

- **No destructive backfill.** Existing utterances stay `line_type = UNKNOWN` / `review_status = UNREVIEWED`; they surface proposals on next open. Optionally, a **read-only proposal-generation pass** (not a write) can pre-compute proposals for display. Any actual `line_type` write is a reviewed decision (or a threshold auto-confirm the owner approves), never a blind backfill of the historical corpus. Certified/locked transcripts excluded.

## 15. Rollback

- Schema: additive columns are safe to leave; a rollback migration can drop the new columns (no data loss for `line_type` itself, which pre-exists). Feature-flag the Workspace review surface + the "consume persisted line_type" switch so render can fall back to the current inference path if needed.
- Code: each step is an independent local commit; the classifier-convergence and qaFixer removal are gated behind the "persisted line_type present" switch so they revert cleanly.

## 16. Tests

- Classifier emits `{line_type, confidence, reason}`; proposal persistence + review-status transitions (UNREVIEWED→CONFIRMED/OVERRIDDEN).
- **Parity test (the invariant):** for a given reviewed document, Workspace-rendered structure == export/certified structure, byte-for-byte on the structural spine. This is the test DOC-0324 found missing.
- UNKNOWN-transcript graceful behavior; keepRawLabels removal (evidence view still shows provider labels); TXT/JSON == DOCX structure; qaFixer parity before removal; editor-api review-write authorization/RLS; regression on the existing `buildEditorContent`/`exportAdapter` suites.

## 17. Deployment sequence

1. (local) Author the migration file + `database.ts` types; classifier contract change; proposal/review persistence in editor-api; Workspace review surface behind a flag; converged builder behind the "persisted line_type" switch; keepRawLabels removal + evidence view; TXT/JSON convergence; tests.
2. (**Human Gate — DB**) Apply the migration to production (§62/§63).
3. (**Human Gate — deploy**) Deploy edge functions (editor-api, ai-review→proposal path) + Cloud Run + front-end.
4. (post-deploy, read-only) Verify proposal generation + review persistence + render/export parity on the clean baseline.
5. Enable the "consume persisted line_type" switch; retire `structureConfirmed`/`keepRawLabels`; remove `qaFixer` via the deletion gate.

---

## Locally reversible vs. Human Gate

**Locally reversible (autonomous, local commits, no prod effect):**
- The migration **file** authoring + `database.ts` type updates (not applied to prod).
- All TS changes: classifier output contract, proposal/confidence types, converged paragraph builder (flag-gated), Workspace review UI, keepRawLabels removal + evidence view, TXT/JSON convergence, editor-api review endpoint code, tests.
- `qaFixer` consumer migration + deletion-gate retirement (behind the switch).

**Requires a Human Gate (do NOT do autonomously):**
- **Applying the schema migration to the production database** (§63 database change).
- **Any write to production `line_type`** on existing transcripts — reviewed decisions or a threshold auto-confirm backfill (§63 production data).
- **Deploying** the changed edge functions / Cloud Run / front-end (§62 production deployment).
- Anything touching **certified/locked** transcripts.

## Notes

- **Clean baseline:** treat `tr_1786372056908_hyjqv3` (1,757 utt / 13,952 words) as the identified clean-baseline candidate (documented across DOC-0318/0320/0321 and referenced in production Cloud Run logs). If independent confirmation is wanted before implementation, verify that record **directly from read-only DB evidence** (source_index 0, no `_multifile_manifest`, utt count > ~1,000, coherent utt0) — **do not retranscribe**.
- **ADR-0018 / K.→Okay.** stays DRAFT and A5-reserved; it is **not** part of this migration. Its acceptance examples remain captured in ADR-0018.
- The whole sequence is behavioral and touches certified output → gated by BETA_FREEZE beyond the local planning/coding steps.

---

## Implementation status (freeze-limited local waves)

Owner authorized the **locally-reversible** implementation (not production migration/deploy).
The BETA_FREEZE posture (working report §116: behavioral waves deferred; precedent `edabe61`:
default-off non-active code permitted as in-freeze safety) bounds this to **non-active,
default-off scaffolding + types + persistence code + invariants + tests + docs**. Landed:

| Wave | Commit | Content | Active? |
|------|--------|---------|---------|
| 1 | `4e54613` | Migration file `20260810180000_line_type_review_contract.sql` (line_type_confidence / line_type_reason / line_type_review_status + enum guards + manually_reassigned→OVERRIDDEN backfill); `database.ts` structure columns typed (Row/Insert/Update); canonical `LineTypeReviewStatus`/`StructuralProposal` types + `normalizeReviewStatus`/`isReviewLocked`. | No — migration **not applied**; types inert. |
| 2 | `082e7da` | `structuralProposal.ts` — pure `{line_type, confidence, reason}` derivation (D2); live classifiers untouched. | No — additive module, unconsumed. |
| 3 | `58647f1` | editor-api `PUT /:jobId/structure` review-persistence endpoint (F10-style, owner-scoped, audit-logged, `assign_line_type`). | No — **not deployed**; no client caller yet. |
| 4 | `d7e390b` | `lineTypeMigration.ts` — default-off `PERSISTED_LINE_TYPE_ENABLED=false`; `shouldProposeStructure` (proposal never overwrites CONFIRMED/OVERRIDDEN); `selectReviewCandidates`. | No — flag off; helpers unconsumed. |

### LOCAL integration (scoped freeze exception — production still frozen)

| Wave | Commit | Content | Live? |
|---|---|---|---|
| resolver | `bd294d9` | `resolveStructuralKind` (persisted line_type → paragraph kind). | flag-off no-op |
| overlay | `c21797d` | `applyReviewedStructure` — converged paragraph overlay (builder-agnostic, generic over the two paragraph types). | flag-off no-op |
| Wave A | `a260fca` | Seam: overlay wired into both `workspacePresentation` + `exportAdapter`; flag-off byte-identical (proven `toEqual`), flag-on convergence tested. | flag-off no-op |
| §11 | `1cf86b9` | Final `qaFixer` behavior matrix — overlay re-kinds but can't **split**; split belongs to upstream structural-apply. Retirement gate above. | doc |
| engine | `69784e6`/`2c5f13f` | `applyStructuralCorrections` (qa_split) — the split owner; splits utterances at the reviewed boundary into Q+A with persisted CONFIRMED line_type; pure, raw evidence preserved. Loop proven: engine → overlay → Q/A. | inert |
| Step 1 | `7886c13` | `deriveWorkingTranscript` load-time projection wired into **both** `buildEditorContent` + `buildCanonicalExportRenderModel` via the SAME pure function → parity by construction. Idempotent (apply-twice==once), reopen-deterministic, states (pending/rejected never apply). | flag-off no-op |
| Wave 1 | `f7b959a` | Frontend hookup: `client.getCorrections`/`workspaceApi.getCorrections` (GET `/:jobId/corrections`); `DocumentContext` fetches reviewed corrections at load **only when the projection gate is on** and threads them (+ the gate) through `TranscriptEditor` → `buildEditorContent`. `DocumentProvider` gains a test/local `persistedLineTypeEnabled` override; `buildEditorContent` forwards it to the projection `enabled`. Proven at the real entry point: accepted qa_split splits Q+A; pending/rejected never apply; idempotent; flag-off byte-identical (no fetch, `toEqual` unchanged). | flag-off no-op |
| Wave 2 | `7b26b0c` | Real Workspace==export parity harness (`workspaceExportParity.test.ts`). Symmetric `persistedLineTypeEnabled` override added to `buildCanonicalExportRenderModel`. Compares a per-word `{word_id, kind}` structural spine (granularity-independent) extracted from **both real builders**. Proves, by running both (not by construction): flag-off identical; flag-on accepted qa_split splits the same words into the same units in both; rejected/pending never apply in either; every source word certified exactly once (no drops/dupes). | flag-off no-op |
| Wave 3 | `1fbd6f2` | Structural round-trip (`structuralRoundTrip.test.ts`) driving the **real DocumentContext reducer** through load→accept→derive→close→reopen. Proves: identical reviewed structure re-derived across reopen (deterministic, no double split, stable `u1::q`/`u1::a` ids); split units carry CONFIRMED status that `shouldProposeStructure` protects from later proposals; DB document (raw Deepgram evidence) never mutated by derivation; provenance preserved across reopen; rejected stays rejected; accepted persists. | flag-off no-op |
| Wave 4 | _(this commit)_ | Embedded objection structural apply — **IMPLEMENTED** after the owner's Decision B (separate split from attribution). New `objection_split` change type (contract + schema + drift guard); engine extended to a shared segment-plan model (qa_split byte-identical) that extracts an objection into pre/obj/post, obj = CONFIRMED `SP`, objector resolved-or-`UNIDENTIFIED_OBJECTOR_SPEAKER_ID` (never fabricated), pre/post inherit source structure. 14-case matrix + parity (known objector) + round-trip. Editor-api defers `objection_split` like qa_split. **Producer (G1) still open** — no generator emits objection_split yet. | flag-off no-op |

**Step 1 status:** the accept→apply→converge chain exists and is composition-proven — `qa_split CorrectionObject (accepted)` → `deriveWorkingTranscript` (idempotent split) → persisted `line_type` → `applyReviewedStructure` → both builders. `qaFixer`'s split now has a surviving owner (gate item #1). Item (a) is now **done** (Wave 1): the real Workspace load path (`DocumentContext` → `TranscriptEditor` → `buildEditorContent`) hydrates reviewed corrections and runs the projection when the gate is on, with a `DocumentProvider persistedLineTypeEnabled` override for end-to-end flag-on exercise. Crucially the corrections fetch is **gated on the flag**, so with `PERSISTED_LINE_TYPE_ENABLED=false` production makes no new `/corrections` call (the endpoint ships at activation) and the everyday load path is byte-identical. Item (b) is now **partly done** (Wave 2): a real parity harness runs both real builders and proves the qa_split certification invariant is identical across Workspace and export for resolved speakers (accepted/rejected/pending). The FULL mixed-matrix parity (examination headers, parentheticals, generic/unresolved speakers in mixed context) is **gated on the Wave 6/7 render-path convergence** — the two structure builders are still distinct code and were observed to diverge for some content/speaker shapes independent of qa_split; the harness's extractors are already shaped to assert those rows once convergence collapses the builders. Item (c) is now **done at the state-machine level** (Wave 3): the structural round-trip is deterministic and immutable across close/reopen through the real reducer.

**LOCAL PRODUCTION-CANDIDATE REACHED (DOC-0325 §17).** The local `line_type` architecture is now
production-candidate quality: Decision A (word-scoped derived-unit save) implemented; objection producer
(G1) + `objection_split` apply implemented; qa_split apply + AI-bridge producer in place; structural
round-trip deterministic; resolved-speaker Workspace==export parity proven (incl. objection); long-
transcript (>1,000 utterances) validated (complete coverage, stable ids, raw immutable, both builders
agree on the full word set). Raw evidence immutable throughout; UNKNOWN compatibility preserved (absent
`line_type` → inferred kind). **All that remains for `line_type` is ACTIVATION-GATED** and not
executable locally: `qaFixer`/`structureConfirmed`/`keepRawLabels` deletion (each needs the flag-on path
to be the live authority), full mixed-matrix parity (needs the render-path convergence), and the
DB/deploy/flag-flip Human Gates. No production code was deleted this session (all deletions are
activation-gated), so the §41 scorecard's deletion metrics are unchanged. Still flag-off; production frozen.

### Decision A — derived-unit edit persistence (IMPLEMENTED — word-scoped save path)

**IMPLEMENTED** _(this commit)_. The word-scoped save path is built and flag-gated:
- **Migration (new, UNAPPLIED)** `20260811120000_working_text_word_scoped_rpc.sql` — RPC
  `editor_apply_working_word_changes` distributes `working_text` across an explicit ordered
  `word_ids` list, resolving words by `word_id` scoped to the transcript (unknown/foreign ids dropped,
  fail-safe). Writes only `transcript_words.working_text`; never `raw_text`, timestamps, confidence, or
  `transcript_utterances`. Same token-distribution semantics as the proven `editor_apply_working_changes`.
- **Contract:** `WorkingChange.word_ids?` (optional, reading order). **editor-api** validates it and
  routes changes carrying `word_ids` to the new RPC, others to the existing RPC (production path
  unchanged). **Client** `buildWorkingChanges` (extracted, pure, unit-tested) attaches each edited
  unit's stable `word_ids` from the SAME `deriveWorkingTranscript` projection the editor rendered —
  only when the flag is on; flag-off emits the historical payload byte-identically.
- **Proof:** `documentContext.decisionA.test.ts` — a derived objection unit edit (`u1::obj`) resolves to
  the real DB words `[w3, w4]` (which exist in the immutable document, so the RPC matches, no orphan);
  `u1::pre` → `[w1, w2]`; flag-off emits no `word_ids`. The SQL RPC itself has no vitest coverage (no DB
  in CI, same as the existing working RPC) — its correctness is by mirroring the proven RPC; a true
  DB-integration round-trip is a deploy-time check.

The remaining Step-1 gap (the derived-unit **text-edit** round-trip) is now closed at the client-contract
level; the DB half activates with the migration + editor-api deploy (Human Gate). Original
characterization retained below.



**Owner's Decision A:** persist derived-unit edits via an explicit Working Transcript **overlay** — never
mutate raw evidence, never fabricate a provider utterance row for a derived unit.

**Characterization (how working text persists today).** Working-text edits already persist as an
**overlay at the WORD level**: `transcript_words.working_text` (added in
`20260605222208_transcript_persistence_v2.sql`) holds the human edit *separately* from the immutable
`raw_text`, keyed by the stable `word_id`. The save RPC `editor_apply_working_changes`
(`20260606113000`) takes `{utterance_id, working_text}`, **looks up the words by `utterance_id`**
(`where utterance_id = …`), splits the new text into tokens, and writes each token to its word's
`working_text` (null when it equals `raw_text`). So the overlay the owner's decision calls for **already
exists** — at the word level, keyed by stable `word_id`, with raw evidence untouched. No new overlay
table is needed for text edits.

**The exact gap.** A derived split reassigns `utterance_id`/`speaker_id` only in the **derived** doc;
the DB word row keeps its `word_id` **and** its original `utterance_id` (`u1`). When a reporter edits a
derived unit (`u1::obj`), the client would POST `{utterance_id: "u1::obj", …}`, and the RPC's
`where utterance_id = 'u1::obj'` matches **no rows** → the edit orphans. The failure is purely the
**utterance-id-based word lookup**, not the storage model.

**Settled design (owner option ii — map derived ids back to source words).** Because the client builds
the derived doc, it already knows each derived unit's underlying `word_ids`. Resolve by making the save
path **word-scoped** for derived units: the client sends the derived unit's `word_ids` (or emits
word-level `{word_id, working_text}` changes), and a new RPC variant distributes tokens across exactly
those words by `word_id` (no `transcript_utterances` row write for a derived id). This keeps raw
evidence immutable, needs **no** fabricated utterance rows, and reuses the existing per-word overlay.

**Implementation plan (NEXT unit — best with fresh context; touches a production RPC via a new UNAPPLIED
migration).** (1) New unapplied migration adding a word-scoped apply RPC (or a `word_ids`/word-level
change shape on the existing one); (2) `database.ts` types; (3) editor-api `handlePutWorking` accepts
word-scoped changes; (4) client `saveNow`/`SaveWorkingPayload` sends the derived unit's word_ids under
the flag; (5) round-trip tests: edit a derived `u1::obj` → autosave → reopen → the edit lands on the
underlying words, raw_text unchanged, structure re-derived. Production-frozen: migration not applied,
flag stays off. Until then the derived-unit **text-edit** round-trip is the one unproven Step-1 item
(the derived-unit **structural** round-trip is proven, Wave 3).

Two DOC-0325-vs-code reconciliations were made and documented in the migration file: (a) `line_type`
value space uses the **short codes** `Q|A|SP|PN|HEADER|UNKNOWN` that `normalizePersistedLineType`
already binds to (not §1's long names); (b) `ai_suggested_line_type` is **aliased** as the proposal,
not renamed (the deployed ai-review function writes it). A third: `database.ts` was already missing the
existing `20260627220500` structure columns — now typed.

### Wave 4 — embedded objection structural apply (RESOLVED via Decision B; producer still open)

**UPDATE (Decision B applied).** The owner ruled: **separate the objection STRUCTURAL SPLIT from
objection SPEAKER ATTRIBUTION** — do not overload one subtype with both. Implemented accordingly:
a dedicated **`objection_split`** change type (structural) owns only the split boundary
(`{objection_start_word_id, objection_end_word_id, objector_speaker_id?}`); attribution is a separate,
optional, human-resolvable concern. `applyStructuralCorrections` was refactored to a shared
segment-plan model (qa_split output byte-identical, all 18 prior tests green) and extended to extract
an objection into `pre` / `obj` / `post` units: `obj` is a CONFIRMED `SP` (colloquy); `pre`/`post`
inherit the source speaker + source line_type **verbatim** (the correction establishes nothing about
them — no fabricated structure). The objector is either a **real** supplied `speaker_id` (a dangling
id fails safe, never fabricated) or the derived `UNIDENTIFIED_OBJECTOR_SPEAKER_ID`
(display "" → renders `UNIDENTIFIED SPEAKER`, matching qaFixer's non-fabricating policy), added only
to the **derived** Working Transcript, never to raw evidence. Idempotent (a derived `::`-suffixed unit
is never re-split), evidence-immutable, accepted/edited-only. Covered by a 14-case matrix
(`structuralApply.objection.test.ts`), a known-objector Workspace==export parity case, and a reopen
round-trip. This resolves the original gaps **G2** (split-boundary representation) and **G3** (objector
`speaker_id` resolution).

**G1 (producer) — IMPLEMENTED.** `objectionDetector.ts` (`detectObjectionSplitProposals`) is the
deterministic producer: it scans immutable evidence for an **explicit, word-bounded** objection — a
standalone `Objection.` token (period required for precision; the common noun in "no objection to that"
is not matched), optionally extended across `Form.`/`Foundation.` — and emits `objection_split`
CorrectionObject **proposals** (`review.state="pending"`). It is embedded-only (a standalone objection
turn is left alone), never mutates the transcript, and **never decides speaker identity** (no
`objector_speaker_id` — attribution stays separate/unresolved). Proposal identity is deterministic
(a stable id derived from the evidence span; no `Date`/`Math.random`). The complete loop is proven
(`objectionDetector.test.ts`): detect → ACCEPT → `applyStructuralCorrections` → derived `SP` objection
unit with the unidentified objector; PENDING/REJECT change nothing. The production **invocation point**
(when a run auto-generates + persists these proposals) is an activation wiring concern, like the rest of
the flag-gated path. Even with the producer, retiring qaFixer additionally requires the flag-on
correction path to be the **live render authority** — the activation Human Gate.

**Original characterization (retained for the record).** Two representations existed, and neither could
carry the objection split as a reviewed correction:

1. **`qaFixer` (the current owner, render-time, regex).** `splitEmbeddedObjections`
   (`src/lib/transcript/qaFixer.ts`) matches `OBJECTION_PATTERN` (`/\bObjection\.\s*(?:Form\.|Foundation\.)?/i`)
   in a Q paragraph's **text**, and slices it into `[before Q] + [objection COLLOQUY] + [after Q]`
   (recursively). The objection text is preserved verbatim; the objection unit is labeled
   `UNIDENTIFIED_SPEAKER` (`"UNIDENTIFIED SPEAKER"`) — it **never fabricates** who objected (§14/§57).
   This is a deterministic, render-time, text-pattern operation — not a reviewed decision.
2. **`objection_attribution` CorrectionObject (the intended future owner).** The schema defines
   `specialty:"objection_attribution"`, `change.type:"objection_attribution"`, `structural_change:
   {new_attorney_name, new_speaker_role}`.

**The exact contract gap (3 parts) — why the split cannot be migrated to the structural-apply engine yet:**

- **(G1) No producer.** The only live CorrectionObject generator — the AI correction bridge
  (`aiCorrectionBridge.ts`) — **explicitly excludes** objections: *"objections … OUT OF SCOPE for the
  bridge; do not emit it."* Nothing (AI or deterministic) currently emits an `objection_attribution`
  correction, so the engine would have no input to apply.
- **(G2) No split-boundary representation.** `objection_attribution.structural_change` encodes
  **attribution** (`new_attorney_name`, `new_speaker_role`), not the objection **word span** to split
  at. `qaFixer` finds the span by regex over text; a reviewed correction must instead carry the span
  explicitly (e.g. objection `start_word_id`/`end_word_id`, or a defined use of `location`'s
  start/end). Undefined today.
- **(G3) No objector `speaker_id` resolution.** The engine reassigns words to `speaker_id`s;
  `structural_change` gives a display **name** string, not a `speaker_id`. Known objector → which
  `speaker_id`? (Match an existing speaker by name — may not exist; **creating** one is fabrication,
  forbidden.) Unknown objector → there is **no unidentified `speaker_id`** in the document model, only
  `qaFixer`'s display **label** `"UNIDENTIFIED SPEAKER"`. Setting the objection unit's speaker to the
  questioner (the only other option) would **mis-attribute** the objection — exactly what "must NOT
  guess speaker identity / fabricate an attorney" forbids.

**Decision: do NOT implement a speculative engine.** Each of G1–G3 is a contract/product decision
(ADR-level). Inventing them inside the engine would fabricate a representation and, for G3,
necessarily guess or fabricate speaker identity — both forbidden by the Wave-4 constraints and by
§14/§57. Per the standing directive ("if a legitimate dependency remains, do not force; document the
exact dependency and continue"), Wave 4 is recorded as **blocked on a correction-contract decision**.

**Cascade to Wave 5 (`qaFixer` retirement) — UPDATED.** After Decision B, `qaFixer`'s objection split
now has an **apply owner** (the `objection_split` engine), closing G2/G3. Waves 6–7
(`structureConfirmed`/`keepRawLabels` retirement) likewise depend on the flag-on canonical
structure being the live authority.

#### qaFixer four-part deletion gate — RESULT (behaviors ready; blocked only on activation)

Full behavior matrix of `applyQaFixer` (`qaFixer.ts`):

| # | Behavior | Disposition |
|---|----------|-------------|
| B1 | Embedded **objection extraction** (`splitEmbeddedObjections`, regex → Q/unidentified-colloquy/Q) | **MIGRATED** — `objection_split` apply engine + `objectionDetector` producer (G1). |
| B2 | **Short-answer Q/A split** (`splitShortAnswerParagraph`, "Q? A." → Q + A) | apply **MIGRATED** (qa_split engine); the automatic render-time split is **INTENTIONALLY REMOVED** in favor of *reviewed* qa_split (producer = the AI bridge, which explicitly emits qa_split when "one speaker block contains both a question and its answer"). A deterministic short-answer producer is optional (precision-first), not required. |
| B3 | `remergeConsecutive` (re-join same-kind/label paragraphs qaFixer itself over-split) | **INTENTIONAL REMOVAL (obsolete)** — the structural apply splits only at *reviewed* boundaries, so there is no over-split to re-merge in the converged path. |

**Zero UNRESOLVED behaviors** — every legitimate responsibility is migrated or intentionally retired.
The gate fails on exactly ONE part: **(4) runtime-consumer count is non-zero**. `applyQaFixer` is called
at render time by `workspacePresentation.ts:748`, unconditionally, while `PERSISTED_LINE_TYPE_ENABLED`
is off — so it is still the **live structural authority**. Removing that call changes flag-off (i.e.
production) render behavior, which the freeze forbids; it becomes a no-op only once the flag is on and
the structural-apply path is the live authority. **Therefore `qaFixer` retirement is ACTIVATION-READY
but not executable locally** — do not force deletion. Executable step at activation: flip the flag,
confirm parity, delete the `workspacePresentation.ts:748` call + `applyQaFixer` + `qaFixer.ts`, keep
the replacement-behavior tests, drop `qaFixer.test.ts`.

### Exact remaining gate (STOP here under freeze)

The **render-path convergence is deferred** — it is behavioral and changes certified output. NOT built:
- The parallel **converged paragraph/structure builder** (collapsing `workspacePresentation` +
  `transcriptParagraphs` onto one persisted-`line_type` spine). Correctness is unverifiable without
  flipping `PERSISTED_LINE_TYPE_ENABLED`, i.e. activation.
- **Wave 5** Workspace structural-review UI + "View Provider Evidence" surface, and the
  **`keepRawLabels` removal** from normal mode.
- **`qaFixer`** retirement (still `RETIRE-VIA-MIGRATION`; sole runtime consumer `workspacePresentation.ts:743`).
- The full **parity/TXT-JSON convergence/long-transcript regression** suite (§16), which asserts the
  post-convergence invariant and therefore needs the convergence to exist.

**Human Gates unchanged and untouched:** apply migration to prod; write/backfill prod `line_type`;
deploy edge functions / Cloud Run / front-end; flip `PERSISTED_LINE_TYPE_ENABLED`; anything on
certified/locked transcripts. Thomas not retranscribed; `tr_1786372056908_hyjqv3` remains the
read-only-verifiable clean-baseline candidate.

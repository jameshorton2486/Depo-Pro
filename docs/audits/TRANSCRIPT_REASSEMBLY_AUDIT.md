# TRANSCRIPT_REASSEMBLY_AUDIT

## Scope

Read-only audit.

No code changes.
No schema changes.
No migrations.
No implementation.

## Audit Gate

Selected real completed transcripts:

| Transcript ID | Case ID | Job ID | Source audio | Raw Deepgram response path | Gate result |
|------|------|------|------|------|------|
| `tr_1781456706021_4bdiwu` | `case_20260614_esoh81` | `9f334fe3-933e-44c5-91a4-26386cdf5769` | `audio1728584021 (4).m4a` | `76c5dbc9-a65c-4e2f-9813-06bd3b066e49/case_20260614_esoh81/transcription/9f334fe3-933e-44c5-91a4-26386cdf5769_deepgram_response.json` | `PASS` |
| `tr_1781563788609_b38j6p` | `case_20260615_6f2vam` | `2c457eb9-652c-4ecc-96c4-a9d550f263b4` | `audio1728584021 (4).mp3` | `76c5dbc9-a65c-4e2f-9813-06bd3b066e49/case_20260615_6f2vam/transcription/2c457eb9-652c-4ecc-96c4-a9d550f263b4_deepgram_response.json` | `PASS` |

Gate evidence:

- both transcripts are `public.transcripts.status = 'completed'`
- both transcripts have non-null `raw_storage_path`
- both raw response paths exist in `storage.objects` under bucket `case-files`
- both transcripts have persisted `transcript_speakers`, `transcript_utterances`, and `transcript_words` rows

## Context Locked From Prior Work

Already-proven context:

- raw Deepgram responses are preserved
- `transcript_words` preserve word-level attribution
- assembly was the first proven attribution fidelity break
- Assembly Attribution Preservation reduced mixed canonical utterances from `114 -> 0` against the committed raw fixture for `tr_1781456706021_4bdiwu`

Additional live finding relevant to rebuild value:

- persisted live transcript rows have **not** all been backfilled with the latest assembly logic
- current persisted mixed-speaker canonical utterance counts:
  - `tr_1781456706021_4bdiwu`: `114 / 1968`
  - `tr_1781563788609_b38j6p`: `112 / 1972`

That means rebuild infrastructure would have immediate practical value even after the normalization fix exists in code.

## 1. Source-of-Truth Audit

### Ranking

| Rank | Source | Location | Persistence | Completeness | Rebuild suitability |
|------|--------|----------|-------------|--------------|---------------------|
| 1 | Raw Deepgram JSON | Supabase Storage `case-files` via `transcripts.raw_storage_path` | durable object storage | highest | best |
| 2 | `transcript_words` | `public.transcript_words` | durable DB rows | high but not complete | good, limited |
| 3 | `transcript_utterances` | `public.transcript_utterances` | durable DB rows | already canonicalized | poor for rebuild, good for comparison |
| 4 | `EditorDocument` | derived at runtime from API loaders | ephemeral | downstream view only | poor |
| 5 | export artifacts | `public.exports` + storage path | optional case-level output | presentation only | worst |

### Why

#### Raw Deepgram JSON

Best source because it still contains:

- `results.utterances`
- `results.channels[0].alternatives[0].words`
- raw `word.start`
- raw `word.end`
- raw `word.speaker`
- raw `word.speaker_confidence`
- raw utterance confidence and transcript text

Evidence:

- `transcripts.raw_storage_path`
- `storage.objects`
- prior audit fixture at [tr_1781456706021_4bdiwu_deepgram_response.json](/abs/path/C:/Users/james/projects/depo-pro/docs/audits/fixtures/tr_1781456706021_4bdiwu_deepgram_response.json)
- `supabase/functions/transcribe-callback/index.ts: loadSourceTranscriptSegments`

#### `transcript_words`

Strong secondary source because it preserves:

- `word_id`
- `raw_text`
- `start_time`
- `end_time`
- `confidence`
- `speaker_id`
- `speaker_index`
- stable global order

But it does **not** preserve:

- raw `speaker_confidence`
- raw `results.utterances` segmentation
- raw utterance confidence independent of recomputation
- provider metadata beyond what was copied to transcript tables

Evidence:

- `src/api/transcriptRepository.ts: insertNormalizedTranscript`
- `src/types/database.ts: public.Tables.transcript_words`

#### `transcript_utterances`

Not a suitable source of truth for rebuild because it already reflects a prior normalization / assembly decision.

Evidence:

- `src/lib/transcript/normalize.ts: normalizeTranscriptResponse`
- `src/api/transcriptRepository.ts: insertNormalizedTranscript`

#### `EditorDocument`

Not suitable as a rebuild source because it is a read model built from persisted transcript rows.

Evidence:

- `src/api/workspaceService.ts: buildEditorDocumentFromSnapshot`
- `src/lib/buildEditorContent.ts: buildEditorContent`

#### Export Artifacts

Worst rebuild source because they are presentation outputs detached from raw provider structure.

Evidence:

- `src/components/ExportScreen/*`
- `src/types/database.ts: public.Tables.exports`

## 2. Rebuild Feasibility

Question: can `transcript_words` **alone** recreate:

- canonical utterances
- speaker attribution
- utterance ordering
- timestamps
- confidence
- transcript geometry

Answer: `NO`

### Why

`transcript_words` alone is sufficient to recreate a deterministic **word stream** and could support a limited speaker-transition rebuild, but it is not sufficient to recreate the highest-fidelity transcript state because it lacks:

- raw `speaker_confidence`
- original `results.utterances`
- raw utterance confidence
- original provider transcript text
- source-level metadata needed for future ingest-equivalent upgrades

It is also not sufficient for transcript geometry on its own because geometry depends on downstream role/speaker mapping and rendering logic, not just word rows.

Evidence:

- `src/lib/transcript/normalize.ts: normalizeTranscriptResponse`
- `src/lib/buildEditorContent.ts: buildEditorContent`
- `src/editor/pagination.ts: getBlockRole`
- `src/types/database.ts: public.Tables.transcript_words`
- `src/lib/transcript/types.ts: DeepgramWord` and `DeepgramUtterance`

More precise feasibility result:

- `transcript_words` alone can likely support a **limited** rebuild of word stream + ordering + timing
- raw Deepgram JSON is the required highest-fidelity source for a general rebuild engine

## 3. Dependency Audit

Normalization / assembly stages currently in the ingest path:

| Stage | File | Symbol | Purpose | Deterministic | Reusable |
|------|------|--------|---------|---------------|----------|
| Parse provider payload | `supabase/functions/transcribe-callback/index.ts` | `parseDeepgramResponse` | validate Deepgram callback payload | yes | yes |
| Normalize raw response | `src/lib/transcript/normalize.ts` | `normalizeTranscriptResponse` | convert raw Deepgram payload into canonical speakers / utterances / words | yes | yes |
| Merge multi-file segments | `src/lib/transcript/multifileMerge.ts` | `mergeSourceTranscriptSegments` | rebase timing and namespace speakers across multiple source files | yes | yes |
| Advance/finalize multifile job | `src/lib/transcript/multifileCallbackFlow.ts` | `advanceOrFinalizeMultifileJob` | orchestrate multi-file callback progression | yes | no, ingest orchestration only |
| Build transcript persistence bundle | `src/lib/transcript/segmentFinalization.ts` | `buildSegmentTranscriptBundle` | convert normalized output into DB row bundles | yes | yes |
| Replace case transcript set | `src/lib/transcript/segmentFinalization.ts` | `replaceCaseSegmentTranscripts` | delete existing case transcript rows and insert rebuilt bundles | yes | reusable but currently too destructive for safe historical rebuild |
| Persist transcript rows | `src/api/transcriptRepository.ts` | `insertNormalizedTranscript` | write normalized transcript rows into DB | yes | yes |

## 4. Persistence Audit

| Table | Classification | Why |
|------|----------------|-----|
| `transcripts` | must rebuild | stores counts, confidence summary, source metadata, updated_at, raw path linkage |
| `transcript_speakers` | must rebuild | derived from normalized speaker set and word counts |
| `transcript_utterances` | must rebuild | canonical assembly output lives here |
| `transcript_words` | must rebuild | word-to-utterance linkage and sometimes speaker ownership can change with assembly updates |
| `transcript_review_state` | must preserve if word IDs stay stable; otherwise invalidate | keyed to `transcript_id`, but contents are word-id sets; preservation depends on stable `word_id` strategy |
| `transcript_suggestions` | must invalidate or remap | rows reference both `word_id` and `utterance_id`; canonical rebuild can stale utterance targeting and suggestion context |
| `transcript_audit_log` | must preserve and append | historical auditability must not be destroyed; rebuild should add a rebuild event, not erase history |

Additional case-level state outside the prompt’s minimum table list but material to blast radius:

| Table | Classification | Why |
|------|----------------|-----|
| `case_certifications` | must protect | certification is case-level and should not silently survive transcript rebuild without revalidation |
| `exports` | must invalidate or regenerate | exports are case-level artifacts derived from transcript state |

Evidence:

- `src/types/database.ts`
- `supabase/functions/editor-api/index.ts: handlePutReview`
- `supabase/functions/editor-api/index.ts: handleResolveSuggestion`
- `src/api/workspaceService.ts: persistReview`
- `src/api/workspaceService.ts: appendAuditEntries`

## 5. Speaker Attribution Audit

Question: can speaker attribution be fully regenerated from `transcript_words` or raw Deepgram response without retranscription?

Answer: `YES`, but with an important qualifier.

- From raw Deepgram response: `YES` for highest-fidelity deterministic regeneration of current assembly logic
- From `transcript_words` alone: `YES` for a limited deterministic reconstruction of word ownership, but not with the same fidelity envelope as the raw provider payload

Why:

- raw Deepgram preserves `word.speaker` and `speaker_confidence`
- `transcript_words` preserve speaker ownership and timing per word
- current assembly improvements already proved deterministic reconstruction is possible without a new Deepgram job

Evidence:

- `src/lib/transcript/normalize.ts`
- [SPEAKER_ATTRIBUTION_AUDIT_2026-06-15.md](/abs/path/C:/Users/james/projects/depo-pro/docs/audits/SPEAKER_ATTRIBUTION_AUDIT_2026-06-15.md)
- [SPEAKER_ATTRIBUTION_AUDIT_POST_FIX_2026-06-15.md](/abs/path/C:/Users/james/projects/depo-pro/docs/audits/SPEAKER_ATTRIBUTION_AUDIT_POST_FIX_2026-06-15.md)

## 6. Future-Proofing Audit

Would rebuild infrastructure support applying future fixes without retranscription?

| Future fix | Support through rebuild? | Why |
|------|--------------------------|-----|
| speaker attribution | `YES` | already proven by deterministic reassembly from preserved raw data |
| interruption handling | `YES` | depends on utterance/word sequencing and can be recomputed from raw response |
| objection handling | `LIMITED YES` | likely needs richer role/participant semantics beyond raw words alone |
| colloquy grouping | `YES` | assembly/rendering boundary can be recomputed from canonical utterance stream |
| parenthetical handling | `LIMITED YES` | feasible if deterministic rules only; may depend on richer semantic interpretation |
| Stage S geometry | `LIMITED YES` | rebuild can improve source utterance structure, but Stage S still depends on speaker roles and export semantics |

Conclusion:

Rebuild infrastructure would clearly support a class of **deterministic normalization / assembly fixes**. It is less certain as a universal vehicle for every later semantic rendering rule.

## 7. Blast Radius Analysis

Safest rebuild model:

`C. Side-by-side preview then commit`

### Why

`A. Rebuild in place` is too risky because:

- `transcript_suggestions` reference old `utterance_id` / `word_id` context
- `transcript_review_state` may or may not remain valid depending on stable word IDs
- `transcript_audit_log` must remain historically trustworthy
- case-level certification / export artifacts can silently become stale

`B. Create replacement transcript version` is safer than in-place, but still needs preview to expose blast radius before commit.

So the safest model is:

- build a replacement transcript version from raw preserved data
- preview before/after counts and affected downstream artifacts
- commit only after explicit acceptance

This is effectively versioned rebuild with side-by-side preview.

## 8. Rebuild Trigger Design

Recommended trigger model:

- support `single transcript` first
- support `case-wide` only after transcript-scoped rebuild is proven
- defer `bulk admin` until artifact invalidation and certification rules are explicit
- do **not** support automatic rebuild on version change

Why:

- rebuild has downstream blast radius
- review/suggestion/certification semantics need human visibility
- automatic rebuilds would undermine auditability

## Findings

### Proven Facts

- Raw Deepgram response objects still exist for both audited transcripts.
- Both audited transcripts can load persisted speaker / utterance / word tables.
- `transcript_words` preserve timing, confidence, word text, speaker ownership, and global order.
- `transcript_suggestions` and `transcript_review_state` are transcript-scoped downstream artifacts tied to current IDs.
- Current persisted transcripts can remain stale even after a newer normalization fix exists in code.
- No case certifications or exports exist yet for the two audited cases, but the tables and case-level relationships do exist.

### Inferences

- A rebuild engine is feasible from preserved data.
- The safest first version should be limited by transcript lifecycle state and should not mutate certified or already-exported cases in place.
- Future deterministic normalization fixes can benefit from the same rebuild machinery.

## Final Recommendation

`BUILD LIMITED REASSEMBLY ENGINE`

### Why not `DO NOT BUILD`

- preserved raw provider data is sufficient for deterministic rebuild
- the project already demonstrated one successful no-retranscription reassembly improvement
- persisted transcript state can lag behind improved assembly code, so the capability has immediate value

### Why not full `BUILD REASSEMBLY ENGINE` yet

- downstream lifecycle rules are not fully solved
- review state and suggestions introduce stale-reference risk
- certification and export invalidation need explicit protection semantics
- current replacement path (`replaceCaseSegmentTranscripts`) is destructive and case-wide

### Feasibility

High for transcript-row rebuild from raw Deepgram JSON.

### Risk

Moderate, because rebuild touches canonical transcript identity and can stale downstream artifacts.

### Blast Radius

Contained if limited to:

- non-certified transcripts
- preview-first flow
- replacement transcript version rather than in-place mutation

### Estimated Complexity

Moderate to high.

Core rebuild logic is mostly reusable.
Safe lifecycle handling is the harder part.

## Bottom Line

The repository and live data support a deterministic rebuild capability, but the safe first version should be **limited**, not global and not in-place.

The next implementation step, if taken, should be a transcript-scoped preview-and-commit rebuild path using preserved raw Deepgram response as the authoritative source, with explicit handling for stale suggestions, review state, and case-level certification/export artifacts.

# Workspace Transcript Pipeline Audit

**Project:** Workspace Transcript Pipeline  
**Objective:** Make the first transcript shown in the Workspace visually match Deepgram Playground's Paragraph view as closely as possible without changing recognition data.  
**Audit date:** 2026-07-28  
**Repository:** branch `docs/transcript-pipeline-report`, commit `47d3f0c`  
**Scope:** Deepgram response through the first TipTap Workspace render. This is an audit and recommendation document only; it does not authorize or contain implementation changes.

## Architectural rule

> The first transcript the reporter sees must be a faithful rendering of the Deepgram Paragraph transcript. Every subsequent enhancement must be an explicit, reviewable, reversible transformation layered on top of that baseline.

The current implementation does not satisfy this rule. It preserves the provider artifact and word-level `raw_text`, but the first Workspace render is a canonicalized and formatted presentation that may include hidden source material, synthetic content, deterministic word replacements, AI working text, turn resegmentation, flags, speaker-role formatting, and pagination.

## Proposed transcript model

Depo-Pro should explicitly distinguish four transcript products:

| Product | Owner | Purpose | Permitted changes |
|---|---|---|---|
| **Recognition Transcript** | Deepgram | Provider-faithful proofing baseline | None to recognition text. Presentation may group the provider's words using Deepgram's own Paragraph metadata. |
| **Working Transcript** | Reporter | Human correction and participant identification | Reporter-approved spelling, punctuation, speaker, attorney, witness, and other working changes. |
| **Structured Transcript** | Reporter with assisted suggestions | Deposition semantics | Explicit Q/A, colloquy, objections, parentheticals, boundaries, and examination structure. |
| **Legal Transcript** | Reporter/certification workflow | Production deliverable | Legal formatting, geometry, pagination, line numbering, inserts, certification, and export. |

These are not four competing editors or duplicated documents. They are four named views/revisions over one immutable recognition foundation and an append-only set of approved transformations.

---

# Section 1 — Current call graph

## 1.1 Actual Deepgram JSON-to-Workspace path

```text
Deepgram JSON callback
  supabase/functions/transcribe-callback/index.ts
    -> integrityAudit(response)
    -> store raw response JSON in case-files Storage
    -> advanceOrFinalizeMultifileJob(...)
    -> dispatchFinalizeTask(job_id)

Cloud Tasks
  -> POST transcript-finalize worker /tasks/finalize
     transcript_finalize_service/main.ts
       -> finalizeTranscriptJob(...)
          supabase/functions/_shared/transcriptFinalize.ts
            -> download stored response JSON for every source/chunk
            -> normalizeTranscriptResponse(response) for each source
            -> finalizeTranscript(sourceSegments)
                 -> mergeSourceTranscriptSegments(...)
                 -> auditCanonicalTranscript(...)
            -> cleanup partial canonical rows
            -> ingest transcript/speaker/utterance/word/audit rows
            -> mark transcription job complete
            -> runBoundaryEngine(...) [awaited, best effort]
            -> trigger ai-review [fire-and-forget]

Workspace navigation
  src/components/DepoEditor.tsx
    -> choose completed transcript_id
    -> DocumentProvider.loadDocument()
       src/context/DocumentContext.tsx
         -> workspaceApi.getDocument(transcript_id)
            src/api/workspaceService.ts
              -> client.getDocument(transcript_id)
                 src/api/client.ts
                   -> GET editor-api/{transcript_id}/document
                      supabase/functions/editor-api/index.ts
                        -> SELECT transcript_speakers
                        -> SELECT transcript_utterances
                        -> SELECT transcript_words
                        -> map database rows to EditorDocument

First Workspace render
  src/components/TranscriptEditor/TranscriptEditor.tsx
    -> buildEditorContent(EditorDocument, options)
       src/lib/buildEditorContent.ts
         -> attempt to filter excluded utterances
         -> if structure is not confirmed:
              cfe(document, geometry, abbreviationRegistry)
                -> deterministic token/phrase transformations
                -> inline scopist flags
                -> mixed-speaker turn segmentation
                -> spacing rules
                -> page/line calculation
         -> if inferred structure is confirmed:
              buildDisplayDocument(...)
              buildTranscriptParagraphs(...)
                -> cfe(...)
                -> paragraphDisplayImprovements(...)
                -> applyQaFixer(...)
         -> create TipTap JSON
    -> editor.commands.setContent(...)
    -> EditorContent renders TipTap nodes
```

## 1.2 Important correction to the proposed shorthand

The runtime order is not:

```text
buildEditorContent -> workspacePresentation -> TranscriptEditor
```

It is:

```text
TranscriptEditor
  -> buildEditorContent
       -> selected workspacePresentation functions and CFE helpers
  -> TipTap EditorContent
```

`workspacePresentation.ts` is not a database service and is not called by `workspaceService.ts`. It is a frontend presentation library invoked from `buildEditorContent.ts`.

## 1.3 Where the unknown `???` occurs

The unknown region is not one function. It spans four boundaries:

```text
Deepgram JSON
  -> Provider-response gate
  -> Canonicalization and persistence
  -> Automatic boundary/AI enrichment
  -> Editor API layer selection and mapping
  -> Frontend CFE/presentation transformation
  -> Workspace
```

The initial-view problem is concentrated in the final three boundaries, while loss of true Paragraph-view fidelity begins earlier because Deepgram Paragraph metadata is never requested, typed, normalized, or persisted.

## 1.4 Concurrency and timing

The enrichment pipeline is not an atomic sequence:

1. Canonical rows are inserted.
2. The transcription job is marked `complete`.
3. Boundary enrichment is attempted.
4. AI review is triggered without awaiting completion.

The Workspace can therefore become available while enrichment is still changing rows. A first load and a later refresh can produce different visible content even when the reporter has made no edits.

---

# Section 2 — Every transformation

## 2.1 Provider request shape

| Item | Current input | Current output/effect | Reason | Necessary for baseline? | Removable from initial view? |
|---|---|---|---|---|---|
| Deepgram feature parameters | Audio URL plus selected keyterms | `nova-3`, punctuation, diarization, fillers, numerals, utterances, `utt_split=0.8`, smart format, English | Recognition configuration | Mostly yes | Not a display transformation |
| Keyterms | Up to 100 selected terms | Repeated `keyterm` query parameters | Improve recognition of case-specific words | Yes | No |
| Paragraphs | Not requested | No provider Paragraph metadata expected | Current builder never added `paragraphs=true` | **Missing requirement** | N/A |

Owner: `src/lib/deepgram/buildDeepgramRequest.ts`.

The current Deepgram request is not equivalent to the desired Playground request: `paragraphs=true` is missing and `utt_split` is `0.8`, not `1.0`. The response type in `src/lib/transcript/types.ts` also has no Paragraph metadata shape.

Deepgram's current documentation states that Paragraphs is disabled by default, is enabled with `paragraphs=true`, uses punctuation, and is influenced by speaker changes when diarization is enabled. That is the provider representation the Recognition Transcript should render.

## 2.2 Raw response integrity audit

| Input | Output | Reason | Necessary? | Can be removed? |
|---|---|---|---|---|
| Raw Deepgram response | Pass/fail, warnings, metrics | Reject malformed or unusable provider responses | **Must preserve** | No; it does not change recognition text |

Owner: `src/lib/transcript/integrityAudit.ts`, invoked by `supabase/functions/transcribe-callback/index.ts`.

This stage gates processing but does not rewrite words.

## 2.3 Normalization

| Input | Output | Reason | Necessary? | Can be removed from baseline? |
|---|---|---|---|---|
| Deepgram channels, words, and utterances | Canonical speakers, utterances, words, IDs, confidence, timestamps | Give the application stable relational data | **Must preserve internally** | Its structural differences should not dictate baseline presentation |

Owner: `src/lib/transcript/normalize.ts`.

Transformations:

- selects `punctuated_word` before `word`;
- generates `spk_###`, `utt_######`, and `w_########` IDs;
- creates fallback utterances if Deepgram utterances are missing;
- splits provider utterances when word-level speaker IDs change;
- creates canonical `Speaker N` labels;
- initializes `working_text = null`, review state, filler state, and edit state.

The IDs and relational rows are application necessities. The split utterance representation is not necessarily the same as Deepgram Paragraph view and must not be treated as the provider's visual ownership.

## 2.4 Multi-source/chunk merge

| Input | Output | Reason | Necessary? | Can be removed from baseline? |
|---|---|---|---|---|
| Ordered normalized source/chunk segments | One canonical time line | Support long and multiple recordings | **Must preserve when applicable** | No, but the baseline must disclose source boundaries |

Owners: `src/lib/transcript/multifileMerge.ts`, `src/lib/transcript/autoChunking.ts`, and `src/lib/transcript/finalizationPipeline.ts`.

Transformations:

- offsets timestamps;
- resequences canonical IDs;
- reconciles chunk seams;
- namespaces speakers for distinct source files.

Current code does not establish that `Speaker 0` in separate recordings is the same human. Speaker unification should be a later Working Transcript decision.

## 2.5 Canonical integrity gate

| Input | Output | Reason | Necessary? | Can be removed? |
|---|---|---|---|---|
| Merged canonical rows | Pass/fail, warnings, metrics | Prevent orphan IDs, invalid timing, broken order, and duplicate seams | **Must preserve** | No; it does not change recognition wording |

Owner: `src/lib/transcript/canonicalIntegrity.ts`.

## 2.6 Canonical persistence

| Input | Output | Reason | Necessary? | Can be removed? |
|---|---|---|---|---|
| Canonical transcript model | `transcripts`, `transcript_speakers`, `transcript_utterances`, `transcript_words`, audit rows | Server source of truth | **Must preserve** | No |

Owner: `supabase/functions/_shared/transcriptFinalize.ts`.

The raw JSON artifact is retained in Storage, but the Workspace does not read it. It reads database rows through `editor-api`.

## 2.7 Boundary enrichment

| Input | Output | Reason | Necessary? | Can be removed from initial view? |
|---|---|---|---|---|
| Persisted canonical utterances | Exclusion flags/reasons and synthetic parenthetical rows | Identify pre-record, off-record, and post-record material | Useful for Structured Transcript | **Yes — must not affect Recognition Transcript** |

Owners: `src/lib/transcript/boundaryEngine.ts` and `runBoundaryEngine()` in `supabase/functions/_shared/transcriptFinalize.ts`.

Persisted transformations:

- sets `excluded_from_output`;
- sets `exclusion_reason`;
- deletes and recreates boundary-generated synthetic rows;
- inserts synthetic words and utterances.

This stage currently violates the proposed baseline rule because it can hide provider-recognized material and add non-provider material before approval.

## 2.8 AI review

| Input | Output | Reason | Necessary? | Can be removed from initial view? |
|---|---|---|---|---|
| Canonical transcript, confidence flags, speaker issues, case metadata | Word suggestions, speaker proposals, line-type proposals; optionally accepted working text | Assisted correction and structure | Useful for Working/Structured Transcript | **Yes — must be an explicit layer** |

Owners:

- `supabase/functions/ai-review/index.ts` — I/O and persistence;
- `src/lib/transcript/aiReview.ts` — input and auto-apply planning;
- `src/lib/transcript/aiSuggestionEngine.ts` — model prompt and result parsing.

Persisted transformations:

- word-level AI suggestion fields;
- speaker-resolution proposals;
- suggested line types;
- AI review metadata;
- when `AI_REVIEW_AUTO_APPLY` is enabled, high-confidence suggestions can write `working_text` and become accepted without reporter action.

The initial Recognition Transcript must explicitly choose `raw_text`, not `working_text` or accepted AI text.

## 2.9 Editor API mapping

| Input | Output | Reason | Necessary? | Can be changed for baseline? |
|---|---|---|---|---|
| Persisted transcript rows | Frozen `EditorDocument` | Supply the frontend editor contract | **Must preserve service boundary** | **Yes — add a baseline-specific projection outside frozen contract if needed** |

Owner: `supabase/functions/editor-api/index.ts`.

Transformations and losses:

- speaker display uses `assigned_name || display_name || speaker_label`;
- word display uses `working_text ?? text`, not immutable `raw_text`;
- removed words are filtered;
- database utterance rows select boundary/synthetic fields, but `mapUtteranceRow()` returns only the frozen `Utterance` fields and drops `excluded_from_output`, `exclusion_reason`, `is_synthetic`, and persisted utterance text;
- AI suggestion overlay fields are added to the returned word objects.

The dropped utterance metadata also means `buildEditorContent.ts` cannot reliably apply its exclusion check in real API mode, despite attempting to do so. This is a contract/projection mismatch and a source of mode-dependent behavior.

## 2.10 Initial CFE transformation

| Input | Output | Reason | Necessary? | Can be removed from initial view? |
|---|---|---|---|---|
| `EditorDocument` containing current word text | Formatted lines with modified tokens, flags, spacing, roles, page/line numbers | Produce a legal-style transcript early | Useful for Legal Transcript | **Must remove from Recognition Transcript** |

Owners:

- `src/lib/format/cfe.ts`;
- `src/lib/transcript/correctionRegistry.ts`;
- `src/editor/pagination.ts`;
- `src/lib/format/geometryProfile.ts`;
- `src/lib/format/abbreviationRegistry.ts`;
- `Canonical Standards Folder/abbreviation_registry.json`;
- `src/lib/format/grouping.ts`.

Current display transformations include:

- token replacement, such as `K.` to `Okay.`;
- case-number rewriting, such as `C572224L` to `C-5722-24-L`;
- hard-coded name and medical-term replacements;
- phrase replacement, such as `what else signs` to `Waddell Signs`;
- slash-date conversion;
- context-sensitive number conversion;
- repeated-word interruption dashes;
- punctuation spacing, including double spaces after selected boundaries;
- inline `[SCOPIST: FLAG ...]` text;
- speaker-run segmentation within an utterance;
- role-based Q/A/speaker prefixes;
- page and line assignment.

`ENABLE_DISPLAY_TURN_SEGMENTATION` is currently `true`. Consequently, this CFE path runs even when the structure review banner has not been confirmed and even after the operator chooses “Keep Raw Labels.”

## 2.11 Optional inferred structure

| Input | Output | Reason | Necessary? | Can be removed from initial view? |
|---|---|---|---|---|
| Canonical/current document plus case metadata | Inferred names, roles, Q/A, colloquy, objections, merged/split paragraphs | Produce deposition structure | Useful for Structured Transcript | **Must be off initially** |

Owners:

- `src/lib/transcript/workspacePresentation.ts`;
- `src/lib/transcript/paragraphDisplayImprovements.ts`;
- `src/lib/transcript/qaFixer.ts`;
- `src/editor/stageS/colloquy.ts`;
- `src/lib/format/honorificHelper.ts`;
- `src/components/StructureReviewBanner/StructureReviewBanner.tsx`.

Transformations include:

- speaker-role inference from transcript language and case participants;
- speaker display-name replacement;
- Q/A and colloquy classification;
- proceeding/examination/BY-line concepts;
- merging consecutive matching paragraphs;
- splitting short answers embedded after a question;
- extracting embedded objections;
- objection-specific text normalization;
- paragraph artifact cleanup.

## 2.12 TipTap document construction and rendering

| Input | Output | Reason | Necessary? | Can be removed? |
|---|---|---|---|---|
| Formatted/presentation model | TipTap JSON and DOM | Editable transcript with audio-linked words | **Must preserve editor capability** | Legal page chrome must be absent in baseline mode |

Owners:

- `src/lib/buildEditorContent.ts` — TipTap JSON creation;
- `src/components/TranscriptEditor/TranscriptEditor.tsx` — editor lifecycle and edit detection;
- `src/extensions/UtteranceNode.ts` — speaker/line prefix DOM;
- `src/extensions/WordMark.ts` — word identity, confidence, AI, and timing marks;
- `src/extensions/PageBreakNode.ts` — page-break DOM;
- `src/index.css` — final visual geometry and transcript styling.

The component currently displays `CERTIFIED TRANSCRIPT OF DEPOSITION` before certification. That belongs to the Legal Transcript, not the Recognition Transcript.

---

# Section 3 — Deepgram versus Playground versus Depo-Pro

## 3.1 Representation comparison

| Dimension | Deepgram JSON | Deepgram Playground Paragraph view | Current Depo-Pro Workspace |
|---|---|---|---|
| Source | API response | Provider rendering of response Paragraph metadata | Canonical database rows transformed by frontend |
| Paragraphs | Not currently requested or typed by Depo-Pro | Readable paragraphs influenced by punctuation and speaker changes | Reconstructed from utterances/CFE, not provider Paragraph metadata |
| Speaker labels | Word/utterance numeric speaker IDs | `Speaker 0`, `Speaker 1`, etc. | Assigned/inferred display name or canonical label; role may affect prefix |
| Text layer | `word` and `punctuated_word` | Provider transcript text | `working_text ?? text`, followed by CFE/display transformations |
| Punctuation | Deepgram punctuation/smart formatting | Provider punctuation | Provider/current punctuation plus deterministic rewrites and spacing |
| Utterance boundaries | `results.utterances` when requested | Paragraph boundaries are a separate provider feature | Provider utterances may be split, merged, segmented, or regrouped |
| Hidden content | Nothing hidden by Depo-Pro | Nothing hidden by Depo-Pro | Boundary-excluded or removed content may be absent |
| Synthetic content | None | None | Boundary parentheticals and scopist flags can appear |
| Q/A | Not provider-owned | No inferred legal Q/A | May be inferred or role-driven |
| Legal geometry | None | None | Margins, tabs, line numbers, pages, and page breaks |
| Certification | None | None | UI says “CERTIFIED TRANSCRIPT OF DEPOSITION” before certification |
| Editability | Provider result | Read-only provider visualization | Editable TipTap; saves working text |

## 3.2 Differences visible in the supplied sample

The supplied Playground-style sample preserves provider output such as:

- `C572224L`;
- `K.`;
- `what else signs`;
- `09/15/2023`;
- generic `Speaker 0`, `Speaker 1`, and `Speaker 2` labels;
- provider paragraph breaks and obvious diarization mistakes.

The current Workspace pipeline is capable of changing those into:

- `C-5722-24-L`;
- `Okay.`;
- `Waddell Signs`;
- `September 15, 2023`;
- inferred or assigned participant labels;
- Q/A or colloquy prefixes;
- line-wrapped legal pages;
- added confidence/scopist flags.

Those may be useful later corrections or formatting decisions. They are not a faithful initial rendering of Deepgram recognition.

## 3.3 Why adding `paragraphs=true` alone is insufficient

Even after enabling the provider feature, fidelity would still fail because:

1. `DeepgramResponse` does not currently type Paragraph metadata.
2. `normalizeTranscriptResponse()` ignores Paragraph metadata.
3. canonical persistence has no provider-paragraph representation.
4. `editor-api` returns canonical utterances and words, not the provider paragraph projection.
5. `buildEditorContent()` immediately invokes CFE.
6. the editor selects current/working text instead of forcing `raw_text` for baseline mode.

The solution requires an end-to-end Recognition Transcript projection, not just a query-string change.

---

# Section 4 — Ownership map

| Concern | Provider owner | Persistence/canonical owner | Current Workspace owner | Recommended owner |
|---|---|---|---|---|
| Recognition words | Deepgram `word`/`punctuated_word` | `normalize.ts`, `transcript_words.raw_text` | `editor-api` maps current text; CFE may rewrite display | Recognition Transcript projection must always select `raw_text` |
| Paragraphs | Deepgram Paragraph metadata | **No current owner** | CFE/workspace presentation reconstructs paragraphs | Preserve provider Paragraph metadata or a lossless provider-derived paragraph map |
| Numeric speakers | Deepgram diarization | `normalize.ts`, speaker/word/utterance tables | `editor-api`, `workspacePresentation.ts` | Recognition view uses provider numeric labels; Working view owns assignments |
| Speaker identities | None | speaker resolution and speaker tables | `SpeakerPanel`, AI review, presentation inference | Working Transcript, reporter-approved |
| Utterances | Deepgram utterances | `normalize.ts`, `multifileMerge.ts`, boundary engine | `editor-api`, CFE grouping | Canonical storage may retain split units; Recognition view follows provider paragraphs |
| Punctuation | Deepgram punctuation/smart format | `raw_text` | CFE and editor working text | Recognition uses provider punctuation; Working Transcript owns corrections |
| Word/phrase correction | None beyond recognition | AI/working text fields | CFE correction registry and user editor | Working Transcript only; explicit and auditable |
| Visibility/boundaries | None | boundary engine exclusion fields | attempted filter in `buildEditorContent.ts` | Structured Transcript; default Recognition view shows all provider content |
| Synthetic parentheticals | None | boundary engine synthetic rows | loaded as ordinary canonical content where contract permits | Structured Transcript, visibly synthetic and reversible |
| Grouping | Deepgram Paragraphs/utterances | canonical utterances | CFE segmentation and paragraph merging | Recognition uses provider paragraphs; later stages use named transformations |
| Q/A and colloquy | None | persisted/suggested line types | `workspacePresentation.ts`, `qaFixer.ts` | Structured Transcript |
| Objections | Recognition text only | suggested/persisted structure | `qaFixer.ts`, correction registry | Structured Transcript; wording corrections remain Working decisions |
| Legal formatting | None | geometry configuration | CFE, geometry, nodes, CSS | Legal Transcript |
| Pagination/line numbering | None | no recognition ownership | `pagination.ts`, CFE, page-break node | Legal Transcript |
| Certification | None | certification records/locks | current header plus certification screen | Legal Transcript only after certification |
| Rendering | None | `EditorDocument` service projection | `TranscriptEditor`, `buildEditorContent`, TipTap nodes, CSS | One editor with an explicit stage/view configuration |

## 4.1 Ownership conflict summary

The current architecture mixes ownership in three places:

1. **CFE owns both correction and legal formatting.** It rewrites visible words while also computing page geometry.
2. **Workspace presentation owns both speaker inference and legal structure.** Names, roles, Q/A, colloquy, and paragraph merging are applied in one presentation path.
3. **Editor API chooses working text before view selection.** The frontend cannot reliably request an immutable recognition-only projection through the frozen contract.

These responsibilities must be separated by transcript stage, not necessarily by duplicating storage or editors.

---

# Section 5 — Recommendations

## 5.1 Must preserve

1. Raw Deepgram JSON artifact in Storage.
2. Immutable word-level `raw_text`.
3. Provider timestamps, confidence, and numeric diarization IDs.
4. Audio synchronization and stable word identity.
5. Raw-response and canonical integrity gates.
6. Canonical relational persistence needed by editing/search/audio.
7. Human Save control, autosave safety, audit trail, and certification mutation lock.
8. Multi-source ordering and timing offsets, with visible source-boundary provenance.
9. Frozen API contract; any baseline-specific fields must use a separate local/versioned projection rather than reshaping `src/api/types.ts`.

## 5.2 May preserve, but only as explicit layers

1. Boundary detection.
2. Hidden pre-record/off-record/post-record content.
3. Synthetic parentheticals.
4. AI word suggestions.
5. AI or heuristic speaker identity proposals.
6. Reporter working-text corrections.
7. Confidence/scopist flags.
8. Deterministic correction registry suggestions.
9. Speaker-run resegmentation.
10. Q/A, colloquy, objection, and examination structure.
11. Legal spacing and abbreviation rules.
12. Pagination and line numbering.

Every layer must expose what changed, who/what proposed it, whether it is accepted, and how to return to the previous stage.

## 5.3 Must remove from the initial Recognition Transcript

1. CFE deterministic token and phrase replacement.
2. Inline scopist flags inserted into transcript text.
3. Boundary-based hiding.
4. Synthetic boundary parentheticals.
5. AI `working_text` selection and accepted overlay text.
6. Inferred or assigned participant names in place of numeric provider labels.
7. Q/A and colloquy classification.
8. Objection extraction and short-answer splitting.
9. Legal tabs, margins, double-space rules, pagination, and line numbering.
10. `CERTIFIED TRANSCRIPT OF DEPOSITION` before certification.
11. Any silent merging/splitting that makes the first view diverge from provider Paragraph structure.

## 5.4 Required Project 1 deliverable behavior

The initial Workspace should:

1. open in **Recognition Transcript** mode;
2. render provider Paragraph order and paragraph breaks;
3. show `Speaker N` labels from Deepgram diarization;
4. render immutable recognition text, not working or AI text;
5. retain fillers because `filler_words=true` is requested;
6. show all recognized content, including material later proposed for exclusion;
7. omit synthetic content;
8. omit legal geometry and certification chrome;
9. retain word-level audio seeking, confidence metadata, and stable application IDs;
10. provide a visible indication that this is the unmodified recognition baseline.

## 5.5 Future work after Project 1

```text
Recognition Transcript
  -> Working Transcript
       speaker identification
       attorney/witness assignment
       spelling and punctuation corrections
  -> Structured Transcript
       boundaries and parentheticals
       Q/A and colloquy
       objections and examination structure
  -> Legal Transcript
       legal formatting
       pagination and line numbering
       inserts and certification
       export
```

Recommended future controls should be stage-aware rather than a single undifferentiated list. Within a stage, each transformation may still be toggled or reviewed independently.

## 5.6 Implementation boundaries for the later coding phase

No implementation is included in this audit. When implementation begins, it should be divided into independently verifiable changes:

1. **Provider parity capture:** request/type/preserve Deepgram Paragraph metadata.
2. **Recognition projection:** provide raw words, numeric speakers, all source content, and provider paragraph membership without modifying frozen contract types.
3. **Baseline renderer:** build TipTap content without CFE, Q/A, exclusions, synthetic rows, working text, pagination, or certification chrome.
4. **Stage selector:** make Recognition the default and expose later views explicitly.
5. **Transformation provenance:** count and diff changes between stages.
6. **Regression fixtures:** synthetic Deepgram JSON with Paragraph metadata and exact parity assertions.
7. **End-to-end verification:** compare provider paragraph text and speaker order with the first Workspace render while preserving audio-word links.

---

# Final conclusion

The `???` between Deepgram JSON and the Workspace is a distributed transformation pipeline, not a missing adapter. The application currently canonicalizes the provider response, enriches persisted rows, chooses a mutable text layer, and performs legal/correction formatting before the first render.

The correct foundation is not to eliminate canonical storage or the existing editor. It is to introduce an explicit **Recognition Transcript projection and render mode** that bypasses every later-stage transformation while preserving audio, confidence, and stable identity. Working, Structured, and Legal Transcript behavior can then evolve as deliberate, reviewable layers over that baseline.

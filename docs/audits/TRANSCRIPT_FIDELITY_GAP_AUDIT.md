# TRANSCRIPT FIDELITY GAP AUDIT

## Audit Summary

- Audit target transcript: `tr_1781559088619_7rch7i`
- Gold-standard reference: `C:\Users\james\Projects\Heath_Thomas\Thomas_Heath_Deposition_2026-04-30.docx`
- Mode: Read-only audit
- Status: Complete
- Goal: identify reusable transcript-engine capabilities missing between current DEPO-PRO output and a corrected finished deposition transcript

## Task 0 Verification

1. Current DEPO-PRO transcript available:
   - Status: `PASS`
   - Evidence: user-provided live workspace transcript excerpt for `tr_1781559088619_7rch7i`, showing post-refinement output with generic speaker labels such as `SPEAKER 0:` / `SPEAKER 1:` / `SPEAKER 2:`

2. Gold-standard DOCX available:
   - Status: `PASS`
   - Evidence: direct read of `C:\Users\james\Projects\Heath_Thomas\Thomas_Heath_Deposition_2026-04-30.docx` in this session; the DOCX includes `PROCEEDINGS`, inline speaker colloquy, `EXAMINATION`, `BY MR. NUNEZ:`, `Q.` / `A.`, recess parentheticals, and exhibit-marked parentheticals

3. Current transcript reflects post-attribution / post-reassembly / post-rendering state:
   - Status: `PASS`
   - Evidence: recent committed work includes speaker attribution preservation, limited transcript reassembly, and speaker-aware workspace rendering. User-provided live output was observed after refinement and still showed `SPEAKER 0:` style labels, which is exactly the post-foundation state this audit needs to evaluate

4. Audit can compare current output to corrected transcript without modifying either:
   - Status: `PASS`
   - Evidence: this report uses current transcript excerpts, the corrected DOCX text, committed audits, and repository code. No transcript rows, code paths, or DOCX content were modified as part of the comparison

## Proven Facts

- The corrected DOCX renders the opening as deposition geometry, not chat geometry. It starts with:
  - `PROCEEDINGS`
  - `THE REPORTER:  Today is April 30th, 2026. ...`
  - `MR. NUNEZ:  Steven Nunez. ...`
  - `MS. ZHAN:  Lucia Zhan. ...`
  - `MR. THOMAS:  I do.`
  - `HEATH THOMAS,`
  - `having been first duly sworn, testified as follows:`
  - `EXAMINATION`
  - `BY MR. NUNEZ:`
  - `Q.  Good afternoon.  Can you please state your full name for the record?`
  - `A.  Heath P. Thomas.`
- The corrected DOCX contains procedural parentheticals and exhibit handling, for example:
  - `(Recess from 1:34 p.m. to 1:35 p.m.)`
  - `(Recess from 1:36 p.m. to 1:44 p.m.)`
  - `(Exhibit 1 marked)`
- The current DEPO-PRO transcript evidence available to this audit still shows generic labels such as:
  - `SPEAKER 0:`
  - `SPEAKER 1:`
  - `SPEAKER 2:`
- Speaker attribution preservation is complete at the assembly layer:
  - [SPEAKER_ATTRIBUTION_AUDIT_POST_FIX_2026-06-15.md](/abs/path/C:/Users/james/Projects/Depo-Pro/docs/audits/SPEAKER_ATTRIBUTION_AUDIT_POST_FIX_2026-06-15.md) records `114 -> 0` mixed canonical utterances for `tr_1781456706021_4bdiwu`
- Limited transcript reassembly is complete as bounded infrastructure:
  - [TRANSCRIPT_REASSEMBLY_VALIDATION_2026-06-15.md](/abs/path/C:/Users/james/Projects/Depo-Pro/docs/audits/TRANSCRIPT_REASSEMBLY_VALIDATION_2026-06-15.md) records `114 -> 0` and `112 -> 0` mixed canonical utterances for the audited transcripts via preview/apply semantics
- Current workspace rendering is driven by:
  - [TranscriptEditor.tsx](/abs/path/C:/Users/james/Projects/Depo-Pro/src/components/TranscriptEditor/TranscriptEditor.tsx)
  - [buildEditorContent.ts](/abs/path/C:/Users/james/Projects/Depo-Pro/src/lib/buildEditorContent.ts)
  - [UtteranceNode.ts](/abs/path/C:/Users/james/Projects/Depo-Pro/src/extensions/UtteranceNode.ts)
- Current workspace paragraph classification is driven by:
  - [workspaceParagraphs.ts](/abs/path/C:/Users/james/Projects/Depo-Pro/src/lib/transcript/workspaceParagraphs.ts)
- Current editor contract remains utterance-oriented, not Word-paragraph-oriented:
  - [src/api/types.ts](/abs/path/C:/Users/james/Projects/Depo-Pro/src/api/types.ts)

## Inferences

- The dominant remaining gap is not evidence preservation. The system now preserves enough raw and canonical evidence to support a more complete transcript engine.
- The biggest visible gap between current DEPO-PRO output and the corrected transcript is speaker identity resolution in the rendered transcript, not mixed-speaker collapse.
- The next implementation priority should be a reusable engine, not transcript-specific correction logic.

## Category Matrix

| Category | Current State | Expected State | Recoverable Deterministically? | Needs AI? | Priority | Files Likely Responsible | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Speaker Identity | Generic labels like `SPEAKER 0:` remain visible | Named legal roles/participants such as `THE REPORTER:` / `MR. NUNEZ:` / `MS. ZHAN:` / `MR. THOMAS:` | Mostly yes | No | Critical | `src/lib/transcript/resolvedSpeakers.ts`, `src/lib/transcript/workspaceParagraphs.ts`, speaker-mapping save/read path | live transcript excerpt vs corrected DOCX |
| Colloquy Geometry | Inline colloquy engine exists, but rendered identity is still generic and UFM-style geometry is incomplete | Single-line inline colloquy with deposition spacing and correct identity | Yes | No | Critical | `src/extensions/UtteranceNode.ts`, `src/index.css`, `src/lib/buildEditorContent.ts` | corrected DOCX colloquy lines |
| Q/A Formatting | Partial heuristic Q/A reconstruction in workspace renderer | Consistent `Q.` / `A.` deposition structure | Mostly yes | No | Critical | `src/lib/transcript/workspaceParagraphs.ts`, `src/editor/stageS/renderer.ts` | corrected DOCX examination section |
| Examination Sections | Partial; renderer can emit `EXAMINATION` / `BY`, but only from local heuristics | Reliable `EXAMINATION` and `BY MR. ...:` structure | Yes | No | High | `src/lib/transcript/workspaceParagraphs.ts`, `src/extensions/UtteranceNode.ts`, `src/editor/stageS/renderer.ts` | corrected DOCX |
| Swearing-In Ceremony | Raw colloquy likely preserved, ceremony not reconstructed as formal structure | `HEATH THOMAS, having been first duly sworn...` | Largely yes | Possibly later, not required first | High | `src/lib/transcript/workspaceParagraphs.ts`, `src/editor/stageS/renderer.ts` | corrected DOCX |
| Recess Handling | Partial; parenthetical if already obvious, no full procedural reconstruction guarantee | `(Recess from ... to ...)` | Yes | No | High | `src/lib/transcript/workspaceParagraphs.ts`, `src/editor/stageS/offRecord.ts`, `src/editor/stageS/renderer.ts` | corrected DOCX |
| Exhibit Handling | Partial; exhibit reference node exists, exhibit-marking ceremony not reconstructed | `(Exhibit 1 marked)` and stable exhibit references | Likely yes | No | High | `src/components/TranscriptEditor/ExhibitRefNodeView.tsx`, `src/extensions/ExhibitRefNode.ts`, procedural rendering layer | corrected DOCX |
| Objections | Partial; Stage S has isolation logic, workspace renderer does not reuse it | Isolated objection paragraphs such as `MS. ZHAN:  Objection. ...` | Yes | No | High | `src/editor/stageS/renderer.ts`, `src/editor/stageS/objectionHandler.ts`, `src/lib/transcript/workspaceParagraphs.ts` | corrected DOCX |
| Parentheticals | Partial; only explicit parenthetical/recess text recognized | Formal parenthetical transcript structure | Yes | No | High | `src/lib/transcript/workspaceParagraphs.ts`, `src/extensions/UtteranceNode.ts` | corrected DOCX |
| Transcript Formatting | Partial; current layout uses custom grid but not full UFM transcript geometry | Deposition tab stops, inline colloquy margin, consistent transcript spacing | Yes | No | High | `src/index.css`, `src/extensions/UtteranceNode.ts`, export/Stage S geometry references | corrected DOCX |
| Pagination | Approximate, word-count-based page estimation | UFM-style certified pagination | Yes, but later | No | Medium | `src/editor/pagination.ts`, export formatter path | code and corrected transcript expectations |
| Certification Elements | Largely export/certification concern, not current workspace transcript concern | Certified transcript package fidelity | Yes, later | No | Medium | export / certification stage files | architecture + corrected transcript expectations |
| Rule Classification | Not currently documented as engine-level roadmap | Explicit mapping of deterministic / AI / human-only gaps | Yes | No | High | this audit, prompt set | current project state |
| Editor Capability Gap | Basic utterance editor exists, but not Word-style transcript editing | Word-like editing with tabs, carriage returns, paragraph manipulation, while preserving transcript intelligence | Yes, substantial work | No for core behavior | Critical | `src/components/TranscriptEditor/TranscriptEditor.tsx`, `src/extensions/UtteranceNode.ts`, `src/api/types.ts` | code inspection |

## Root Cause Classification Matrix

| Gap | Deterministic Code | Regex / Rules | AI Assist | Human Review Only | Reusable Engine Work | Transcript-Specific Manual Correction | Missing Source Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Speaker labels | Yes | Limited | No | No | Yes | No | No |
| Q/A formatting | Yes | Some | No | No | Yes | No | No |
| Colloquy geometry | Yes | No | No | No | Yes | No | No |
| Examination sections | Yes | Some | No | No | Yes | No | No |
| Swearing-in ceremony | Yes | Some | Optional later | Some edge cases | Yes | No | Possible for rare missing audio |
| Recess handling | Yes | Yes | No | No | Yes | No | No |
| Exhibit handling | Yes | Some | No | Sometimes | Yes | No | Sometimes |
| Objections | Yes | Yes | No | No | Yes | No | No |
| Parentheticals | Yes | Yes | No | No | Yes | No | No |
| Transcript formatting | Yes | No | No | No | Yes | No | No |
| Pagination | Yes | No | No | No | Yes | No | No |
| Certification elements | Yes | No | No | Human certifies | Yes | No | No |

## Detailed Gap Analysis

### 1. Speaker Identity

- Current State: visible transcript output still uses generic cluster labels (`SPEAKER 0:` / `SPEAKER 1:` / `SPEAKER 2:`)
- Expected State: participant-aware and role-aware labels such as `THE REPORTER:`, `MR. NUNEZ:`, `MS. ZHAN:`, `MR. THOMAS:`
- Recoverable Deterministically?: mostly yes
- Needs AI?: no
- Priority: Critical
- Files Likely Responsible:
  - [resolvedSpeakers.ts](/abs/path/C:/Users/james/Projects/Depo-Pro/src/lib/transcript/resolvedSpeakers.ts)
  - [workspaceParagraphs.ts](/abs/path/C:/Users/james/Projects/Depo-Pro/src/lib/transcript/workspaceParagraphs.ts)
  - speaker mapping / overlay save-read path in `workspaceService.ts`
- Evidence:
  - current: user-provided post-refinement transcript shows `SPEAKER 0:` style labels
  - expected: corrected DOCX names reporter, both attorneys, and witness directly
- First Proven Locus: identity resolution gap
- Reusable Engine Work?: Yes

### 2. Colloquy Geometry

- Current State: renderer supports inline label/body geometry, but the visible improvement is capped because identity is generic and the layout is still a simplified workspace approximation
- Expected State: deposition colloquy such as `THE REPORTER:  Today is April 30th, 2026. ...`
- Recoverable Deterministically?: yes
- Needs AI?: no
- Priority: Critical
- Files Likely Responsible:
  - [UtteranceNode.ts](/abs/path/C:/Users/james/Projects/Depo-Pro/src/extensions/UtteranceNode.ts)
  - [index.css](/abs/path/C:/Users/james/Projects/Depo-Pro/src/index.css)
  - [buildEditorContent.ts](/abs/path/C:/Users/james/Projects/Depo-Pro/src/lib/buildEditorContent.ts)
- Evidence:
  - corrected DOCX shows inline label and speech in one deposition paragraph
  - current engine can render inline colloquy, but observed output still does not resemble finished deposition geometry
- First Proven Locus: rendering / formatting gap
- Reusable Engine Work?: Yes

### 3. Q/A Formatting

- Current State: workspace Q/A depends on simple role/question heuristics in [workspaceParagraphs.ts](/abs/path/C:/Users/james/Projects/Depo-Pro/src/lib/transcript/workspaceParagraphs.ts)
- Expected State: stable examination `Q.` / `A.` flow like the corrected DOCX
- Recoverable Deterministically?: mostly yes
- Needs AI?: no
- Priority: Critical
- Files Likely Responsible:
  - [workspaceParagraphs.ts](/abs/path/C:/Users/james/Projects/Depo-Pro/src/lib/transcript/workspaceParagraphs.ts)
  - [stageS/renderer.ts](/abs/path/C:/Users/james/Projects/Depo-Pro/src/editor/stageS/renderer.ts)
- Evidence:
  - corrected DOCX is dominated by `Q.` / `A.`
  - current workspace classifier uses generic question patterns and current state only, not richer transcript geometry
- First Proven Locus: reconstruction / rendering gap
- Reusable Engine Work?: Yes

### 4. Examination Sections

- Current State: partial. The workspace can emit `EXAMINATION` and `BY` lines, but only through lightweight local state, not a full transcript-geometry engine
- Expected State: formal section transitions exactly as a deposition transcript expects
- Recoverable Deterministically?: yes
- Needs AI?: no
- Priority: High
- Files Likely Responsible:
  - [workspaceParagraphs.ts](/abs/path/C:/Users/james/Projects/Depo-Pro/src/lib/transcript/workspaceParagraphs.ts)
  - [UtteranceNode.ts](/abs/path/C:/Users/james/Projects/Depo-Pro/src/extensions/UtteranceNode.ts)
  - [stageS/renderer.ts](/abs/path/C:/Users/james/Projects/Depo-Pro/src/editor/stageS/renderer.ts)
- Evidence:
  - corrected DOCX uses explicit `EXAMINATION` and `BY MR. NUNEZ:`
  - current workspace implementation does not yet prove full examination-geometry fidelity
- First Proven Locus: reconstruction / formatting gap
- Reusable Engine Work?: Yes

### 5. Swearing-In Ceremony

- Current State: preserved as transcript content, but not formalized into the ceremony structure seen in the corrected transcript
- Expected State:
  - `HEATH THOMAS,`
  - `having been first duly sworn, testified as follows:`
- Recoverable Deterministically?: largely yes
- Needs AI?: no for v1
- Priority: High
- Files Likely Responsible:
  - [workspaceParagraphs.ts](/abs/path/C:/Users/james/Projects/Depo-Pro/src/lib/transcript/workspaceParagraphs.ts)
  - [stageS/renderer.ts](/abs/path/C:/Users/james/Projects/Depo-Pro/src/editor/stageS/renderer.ts)
- Evidence:
  - corrected DOCX contains formal ceremony blocks
  - current workspace classifier has no dedicated ceremony model
- First Proven Locus: procedural reconstruction gap
- Reusable Engine Work?: Yes

### 6. Recess Handling

- Current State: partial. Explicit parenthetical text can render as parenthetical; richer off-record transitions are handled in Stage S, not fully in the workspace path
- Expected State: formal recess parentheticals such as `(Recess from 1:34 p.m. to 1:35 p.m.)`
- Recoverable Deterministically?: yes
- Needs AI?: no
- Priority: High
- Files Likely Responsible:
  - [workspaceParagraphs.ts](/abs/path/C:/Users/james/Projects/Depo-Pro/src/lib/transcript/workspaceParagraphs.ts)
  - [stageS/offRecord.ts](/abs/path/C:/Users/james/Projects/Depo-Pro/src/editor/stageS/offRecord.ts)
  - [stageS/renderer.ts](/abs/path/C:/Users/james/Projects/Depo-Pro/src/editor/stageS/renderer.ts)
- Evidence:
  - corrected DOCX has formal recess blocks
  - workspace classifier only recognizes text that already looks like a parenthetical or starts with `recess`
- First Proven Locus: procedural reconstruction gap
- Reusable Engine Work?: Yes

### 7. Exhibit Handling

- Current State: partial. The editor has an exhibit-reference node, but the transcript ceremony for exhibit marking is not reconstructed end-to-end in the visible transcript
- Expected State: exhibit events like `(Exhibit 1 marked)` appear as part of transcript geometry
- Recoverable Deterministically?: likely yes
- Needs AI?: no
- Priority: High
- Files Likely Responsible:
  - [ExhibitRefNode.ts](/abs/path/C:/Users/james/Projects/Depo-Pro/src/extensions/ExhibitRefNode.ts)
  - [ExhibitRefNodeView.tsx](/abs/path/C:/Users/james/Projects/Depo-Pro/src/components/TranscriptEditor/ExhibitRefNodeView.tsx)
  - future procedural rendering layer
- Evidence:
  - corrected DOCX includes `(Exhibit 1 marked)`
  - current visible transcript evidence has not shown equivalent procedural reconstruction
- First Proven Locus: procedural reconstruction gap
- Reusable Engine Work?: Yes

### 8. Objections

- Current State: Stage S has objection isolation logic, but the workspace renderer does not consume that richer logic
- Expected State: isolated objection paragraphs like `MS. ZHAN:  Objection.` and `MS. ZHAN:  Objection.  Form.`
- Recoverable Deterministically?: yes
- Needs AI?: no
- Priority: High
- Files Likely Responsible:
  - [stageS/renderer.ts](/abs/path/C:/Users/james/Projects/Depo-Pro/src/editor/stageS/renderer.ts)
  - [stageS/objectionHandler.ts](/abs/path/C:/Users/james/Projects/Depo-Pro/src/editor/stageS/objectionHandler.ts)
  - [workspaceParagraphs.ts](/abs/path/C:/Users/james/Projects/Depo-Pro/src/lib/transcript/workspaceParagraphs.ts)
- Evidence:
  - corrected DOCX contains isolated objections
  - current workspace path uses simple role + text heuristics and does not reuse objection isolation machinery
- First Proven Locus: procedural reconstruction gap
- Reusable Engine Work?: Yes

### 9. Parentheticals

- Current State: partial. Parentheticals already explicit in text can render as such, but derived procedural parentheticals are not generally reconstructed in workspace rendering
- Expected State: parenthetical transcript blocks for recesses, exhibit marks, and similar procedural transitions
- Recoverable Deterministically?: yes
- Needs AI?: no
- Priority: High
- Files Likely Responsible:
  - [workspaceParagraphs.ts](/abs/path/C:/Users/james/Projects/Depo-Pro/src/lib/transcript/workspaceParagraphs.ts)
  - [UtteranceNode.ts](/abs/path/C:/Users/james/Projects/Depo-Pro/src/extensions/UtteranceNode.ts)
- Evidence:
  - corrected DOCX includes multiple procedural parentheticals
  - current workspace classifier only handles obvious parenthetical strings
- First Proven Locus: procedural reconstruction gap
- Reusable Engine Work?: Yes

### 10. Transcript Formatting

- Current State: partial custom geometry, not full transcript-grade UFM layout
- Expected State: transcript tabs, indentation, colloquy margins, and certified geometry closer to the corrected deposition
- Recoverable Deterministically?: yes
- Needs AI?: no
- Priority: High
- Files Likely Responsible:
  - [index.css](/abs/path/C:/Users/james/Projects/Depo-Pro/src/index.css)
  - [UtteranceNode.ts](/abs/path/C:/Users/james/Projects/Depo-Pro/src/extensions/UtteranceNode.ts)
  - export formatter references
- Evidence:
  - corrected DOCX demonstrates full deposition formatting
  - current workspace surface remains a simplified in-app rendering grid
- First Proven Locus: formatting gap
- Reusable Engine Work?: Yes

### 11. Pagination

- Current State: approximate page layout based on word counts
- Expected State: certified-style pagination and page geometry
- Recoverable Deterministically?: yes
- Needs AI?: no
- Priority: Medium
- Files Likely Responsible:
  - [pagination.ts](/abs/path/C:/Users/james/Projects/Depo-Pro/src/editor/pagination.ts)
  - export formatter path
- Evidence:
  - `estimateLineCount` is word-count-based and approximate
  - corrected DOCX represents finished transcript pagination rather than approximation
- First Proven Locus: pagination gap
- Reusable Engine Work?: Yes

### 12. Certification Elements

- Current State: mostly out of the workspace path; handled downstream in export/certification
- Expected State: final certified transcript fidelity
- Recoverable Deterministically?: yes
- Needs AI?: no
- Priority: Medium
- Files Likely Responsible:
  - certification / export stage files
- Evidence:
  - corrected DOCX is a finished deposition artifact
  - current audit target is a workspace/editor fidelity comparison
- First Proven Locus: certification/export gap
- Reusable Engine Work?: Yes

### 13. Rule Classification

- Current State: no single committed report yet classified all transcript-fidelity gaps into deterministic vs AI vs human-only categories
- Expected State: reusable engine roadmap with deterministic-first rule classification
- Recoverable Deterministically?: yes
- Needs AI?: no
- Priority: High
- Files Likely Responsible: audit / planning layer rather than runtime code
- Evidence: this audit and its governing prompt were created precisely because earlier work was too fix-oriented

### 14. Editor Capability Gap

- Current State: basic utterance editing exists, but the editor is not Word-like. Content is one custom `utterance` block type with inline words; the default paragraph/heading/list stack is disabled in [TranscriptEditor.tsx](/abs/path/C:/Users/james/Projects/Depo-Pro/src/components/TranscriptEditor/TranscriptEditor.tsx)
- Expected State: a reporter can work more like Word while retaining transcript intelligence:
  - edit words and punctuation freely
  - insert carriage returns
  - insert tabs
  - split and merge paragraphs
  - create parentheticals
  - manipulate transcript blocks
  - keep low-confidence highlighting and audio-sync behavior
- Recoverable Deterministically?: yes, but substantial editor work
- Needs AI?: no
- Priority: Critical
- Files Likely Responsible:
  - [TranscriptEditor.tsx](/abs/path/C:/Users/james/Projects/Depo-Pro/src/components/TranscriptEditor/TranscriptEditor.tsx)
  - [UtteranceNode.ts](/abs/path/C:/Users/james/Projects/Depo-Pro/src/extensions/UtteranceNode.ts)
  - [api/types.ts](/abs/path/C:/Users/james/Projects/Depo-Pro/src/api/types.ts)
  - [WordMark.ts](/abs/path/C:/Users/james/Projects/Depo-Pro/src/extensions/WordMark.ts)
- Evidence:
  - `paragraph: false`, `heading: false`, lists/blockquote/etc disabled in editor setup
  - utterance nodes are the fundamental editable block, not free-form transcript paragraphs
- First Proven Locus: editor capability gap
- Reusable Engine Work?: Yes

## Recoverability Assessment

### Likely Deterministic

- speaker identity resolution from existing participant / role metadata
- Q/A reconstruction
- colloquy geometry
- examination sections
- recess handling
- objection isolation
- parenthetical reconstruction
- transcript formatting geometry
- pagination improvements

### Possibly Deterministic but More Complex

- swearing-in / procedural ceremony reconstruction
- exhibit-marking reconstruction
- some editor workflow upgrades while preserving transcript/audit invariants

### Likely Requires Human Review or Missing Evidence

- genuinely missing audio content
- ambiguous speaker identity when source evidence is absent or contradictory
- certification judgment itself

## Editor Capability Gap Summary

### Current Editor

- Can edit words: Yes
- Can edit punctuation: Yes, insofar as punctuation is part of the utterance text
- Can insert carriage returns: No reliable Word-style paragraph workflow is exposed
- Can insert tabs: No Word-style transcript tab workflow is exposed
- Can split paragraphs: Not as a first-class transcript editing operation
- Can merge paragraphs: Not as a first-class transcript editing operation
- Can create parentheticals: Not as a first-class geometry-aware operation
- Can move transcript blocks: Not as a first-class transcript workflow
- Can preserve low-confidence highlighting while editing: Yes, foundation present through [WordMark.ts](/abs/path/C:/Users/james/Projects/Depo-Pro/src/extensions/WordMark.ts)

### Desired Word-Style Workflow

- Word-style text editing: required
- Paragraph-level formatting control: required
- Transcript-geometry-aware editing: required
- Auditability / change tracking expectations: must remain
- Proofreading support expectations: low-confidence highlighting and audio-assisted review must remain

## Likely Responsibility Map

| Gap Area | First Proven Locus | Supporting Files / Symbols |
| --- | --- | --- |
| Speaker identity | Identity resolution engine missing above raw/resolved overlay foundation | `resolvedSpeakers.ts`, `workspaceParagraphs.ts`, speaker mapping save/read path |
| Colloquy geometry | Workspace rendering layer | `UtteranceNode.ts`, `index.css`, `buildEditorContent.ts` |
| Q/A geometry | Lightweight local classifier instead of full transcript geometry engine | `workspaceParagraphs.ts`, `stageS/renderer.ts` |
| Procedural reconstruction | Workspace renderer does not reuse richer procedural logic already explored in Stage S | `stageS/renderer.ts`, `stageS/offRecord.ts`, `stageS/objectionHandler.ts`, `workspaceParagraphs.ts` |
| Formatting / pagination | Simplified workspace geometry and approximate pagination | `index.css`, `UtteranceNode.ts`, `pagination.ts` |
| Editor capability | Utterance-oriented editor model | `TranscriptEditor.tsx`, `UtteranceNode.ts`, `api/types.ts` |

## Engine Inventory

| Engine | Status (`Complete` / `Partial` / `Missing`) | Evidence | Notes |
| --- | --- | --- | --- |
| Deepgram Ingestion | Complete | prior speaker attribution and reassembly audits rely on preserved raw Deepgram responses | no longer the main bottleneck |
| Raw Deepgram Preservation | Complete | committed raw fixtures and reassembly audit evidence | strong foundation |
| Word-Level Confidence / Timing Preservation | Complete | `WordMark` stores timing/confidence/reviewed; prior audits confirm preservation | foundation complete |
| Speaker Attribution Preservation | Complete | `114 -> 0` mixed canonical utterances in post-fix audit | foundation complete |
| Transcript Reassembly Engine | Complete | reassembly audit + validation report | bounded v1 complete |
| Candidate / Preview / Apply Workflow | Complete | `TranscriptReassemblyDialog.tsx` + reassembly validation | bounded v1 complete |
| Audit Trail Infrastructure | Complete | append-only audit log infrastructure already present in workspace services | foundation complete |
| Low-Confidence Review | Partial | confidence/timing highlighting exists, but proofreading workflow is not yet Word-like | keep and enhance |
| Basic Transcript Editor | Partial | text editing and audio sync exist, but not Word-style transcript editing | foundation, not finished |
| Speaker Identity Resolution Engine | Missing | live output still shows `SPEAKER 0:` labels | highest-value missing engine |
| Q/A Reconstruction Engine | Missing | current classifier is heuristic and lightweight, not a full deposition Q/A engine | high-value missing engine |
| Transcript Geometry Engine | Partial | inline colloquy and some structure exist, full deposition formatting does not | partial |
| Procedural Reconstruction Engine | Missing | recess/exhibit/objection/ceremony handling not end-to-end in workspace transcript | missing |
| Word-Style Editing Engine | Partial | basic editing exists, Word-style paragraph/tab workflow does not | partial |

## Prioritized Roadmap

### Wave 1

- Speaker Identity Resolution Engine
- Q/A Reconstruction Engine
- Transcript Geometry Engine

### Wave 2

- Procedural Reconstruction Engine
  - swearing-in ceremony
  - recess handling
  - objections
  - parentheticals
  - exhibit-marking structure

### Wave 3

- Word-Style Editing Engine
  - tabs
  - carriage returns
  - split/merge paragraph operations
  - transcript block manipulation
  - maintain low-confidence and audio-assisted review

### Wave 4

- Pagination fidelity
- certification/output parity improvements

## Final Recommendation

1. What is missing?
   - speaker identity resolution in the visible transcript
   - robust Q/A reconstruction
   - full deposition geometry
   - procedural reconstruction
   - Word-style transcript editing capabilities

2. What is recoverable deterministically?
   - most of the missing transcript structure
   - speaker identity labeling from existing participant/role metadata
   - Q/A structure
   - colloquy geometry
   - recesses, objections, parentheticals, and much of the examination structure

3. What should be built next?
   - a Speaker Identity Resolution Engine that promotes current generic cluster labels into real participant identities in a reusable way

4. What editor capabilities must be added for a Word-like transcript workflow?
   - paragraph-level editing operations
   - tabs and carriage returns
   - transcript block split/merge/move controls
   - geometry-aware parenthetical creation
   - all while preserving low-confidence highlighting, audio sync, and auditability

5. What should NOT be solved with AI?
   - primary speaker labeling from known participant metadata
   - Q/A reconstruction
   - colloquy geometry
   - examination sections
   - recess and objection formatting
   - transcript tabs/indentation/pagination foundations

## Single Next Build Recommendation

Build next:

- **Speaker Identity Resolution Engine**

Reason:

- it is the largest visible gap between current DEPO-PRO output and the corrected deposition
- it is mostly deterministic
- it unlocks the value of the rendering, Q/A, and procedural engines that follow
- it improves every future deposition rather than only this transcript

## Final Determination

- Audit status: `PASS`
- Master roadmap ready: `Yes`
- Follow-on implementation prompt recommended: `PROMPT_SPEAKER_IDENTITY_RESOLUTION_ENGINE.md`

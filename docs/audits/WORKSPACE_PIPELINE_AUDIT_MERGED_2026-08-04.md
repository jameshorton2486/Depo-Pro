# DEPO-PRO — WORKSPACE TRANSCRIPT PIPELINE AUDIT (MERGED)
# Combines: WORKSPACE_PIPELINE_AUDIT_2026-08-04.md (tactical/compliance)
#           WORKSPACE_TRANSCRIPT_PIPELINE_AUDIT.md (architectural, dated 2026-07-28)
# Merged: August 4, 2026
# Branch: feature/stage3-workspace-core (working tree: fix/canon-raw-a-preserve-raw)
# Scope: READ-ONLY. No files were modified, created, built, tested, or linted.
# ═══════════════════════════════════════════════════════════════════════════════

## EXECUTIVE SUMMARY

Two separate audits were conducted against the same branch:

- **July 28 audit** — architectural scope. Traced the full Deepgram JSON →
  Workspace pipeline, identified every transformation applied before the first
  render, and proposed a four-stage transcript model (Recognition → Working →
  Structured → Legal). Concluded that the Workspace currently mixes stage
  responsibilities that should be separated.

- **August 4 audit** — tactical/compliance scope. Audited the correction and
  formatting pipeline against confirmed UFM/Morson's rules derived from four
  real produced Texas deposition transcripts. Produced PASS/FAIL findings
  for all C1–C9 checks and identified the button rename issue.

**Combined headline finding:** The Workspace has two distinct pipelines that
the user and the codebase currently treat as one. The deterministic formatter
runs automatically on load (P-A). The AI suggestion engine runs when the
"Re-review" button is clicked (P-B). These are separate concerns requiring
separate decisions. Meanwhile, P-A itself mixes Recognition Transcript
concerns (provider text) with Legal Transcript concerns (geometry, line
numbers, certified header) in ways that create compliance gaps and make
stage-by-stage evolution difficult.

**Six decisions are required before any code change.** See §7.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 1. ARCHITECTURAL RULE (from July 28 audit)

> The first transcript the reporter sees must be a faithful rendering of the
> Deepgram Paragraph transcript. Every subsequent enhancement must be an
> explicit, reviewable, reversible transformation layered on top of that
> baseline.

The current implementation does not satisfy this rule. The first Workspace
render is a canonicalized and formatted presentation that may include hidden
source material, synthetic content, deterministic word replacements, AI
working text, turn resegmentation, flags, speaker-role formatting, and
pagination — before the reporter has approved any of it.

### Proposed four-stage transcript model

| Stage | Owner | Purpose | Permitted changes |
|---|---|---|---|
| **Recognition Transcript** | Deepgram | Provider-faithful baseline | None to recognition text |
| **Working Transcript** | Reporter | Human corrections | Approved spelling, punctuation, speaker changes |
| **Structured Transcript** | Reporter + AI suggestions | Deposition semantics | Q/A, colloquy, objections, boundaries, examination structure |
| **Legal Transcript** | Reporter / certification workflow | Production deliverable | Legal formatting, geometry, pagination, line numbering, certification, export |

These are four named views over one immutable recognition foundation and an
append-only set of approved transformations — not four competing editors.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 2. THE TWO-PIPELINE REALITY

There is no single "format and correct" button. Two distinct pipelines exist:

### Pipeline P-A — Formatting/correction that renders the Workspace body
Runs automatically on transcript load / structure-confirm. NOT triggered by
the button.

  1.  src/lib/buildEditorContent.ts
        Entry point. Builds TipTap doc JSON from EditorDocument.
        Chooses raw vs. inferred-structure path. Drops BY-line at lines
        320–322. Applies exclusion filter (broken in real-API mode — see §6).

  2.  src/lib/format/cfe.ts
        Canonical Formatting Engine. Line-wraps words into FormattedLine[]
        using geometry profile + abbreviation registry.
        Current display transformations include:
        - token replacement (K. → Okay., C572224L → C-5722-24-L)
        - hard-coded name and medical-term replacements
        - phrase replacement (what else signs → Waddell Signs)
        - slash-date conversion, context-sensitive number conversion
        - repeated-word interruption dashes
        - punctuation spacing (double spaces after selected boundaries)
        - inline [SCOPIST: FLAG ...] text
        - speaker-run segmentation within an utterance
        - role-based Q/A/speaker prefixes, page and line assignment
        NOTE: ENABLE_DISPLAY_TURN_SEGMENTATION = true, so this runs
        even when "Keep Raw Labels" is chosen.

  3.  src/lib/format/geometryProfile.ts
        Single source of truth for tab stop inch values.
        Values are ALSO duplicated in src/index.css:154 — split authority.

  4.  src/lib/format/types.ts
        GeometryProfile, FormattedLine, FormattedWord, role/intent enums.

  5.  src/lib/transcript/workspacePresentation.ts
        Infers speaker roles/labels; classifies Q/A/COLLOQUY/PARENTHETICAL;
        emits BY_LINE/SECTION_HEADER; builds TranscriptParagraph[].
        Transformations: speaker-role inference, display-name replacement,
        Q/A and colloquy classification, proceeding/examination/BY-line,
        merging consecutive matching paragraphs, splitting short answers,
        extracting embedded objections.

  6.  src/lib/transcript/qaFixer.ts
        Splits merged Q/A blocks, embedded objections, short answers;
        re-merges consecutive same-speaker paragraphs.

  7.  src/lib/transcript/paragraphDisplayImprovements.ts
        Final per-paragraph text cleanup.

  8.  src/extensions/UtteranceNode.ts
        Renders each paragraph as a div with a line-number gutter + geometry
        data-attributes. Line number rendered at lines 121–129 (see §6 C8-B).

  9.  src/index.css
        Actual visual indentation (text-indent / margin-left in inches)
        keyed off line-role classes. Duplicates geometry values from
        geometryProfile.ts — must stay in sync on every geometry change.

**NOTE:** editorialEngine.ts, formattingEngine.ts, geometryEngine.ts,
correctionEngines.ts, correctionValidator.ts, and structureEngine.ts are
the DOCX/export + validation path (exportAdapter.ts, transcriptDownloads.ts),
NOT the live TipTap editor path.

### Pipeline P-B — The AI Review button (what actually fires on click)

  1.  src/components/AIReviewBanner/AIReviewBanner.tsx
        The "Re-review" button at line 67.

  2.  src/api/workspaceService.ts triggerAIReview (L858)
        Resolves fresh transcript id.

  3.  src/api/client.ts triggerAIReview (L176)
        POST /transcripts/{id}/ai-review

  4.  supabase/functions/ai-review/index.ts
        Edge function. Branches on AI_REVIEW_BRIDGE:
        - Bridge ON → runBridgeReview (L340) → aiCorrectionBridge.ts
          → Anthropic → CorrectionObject[] → corrections table
        - Bridge OFF (legacy) → aiReview.ts → aiSuggestionEngine.ts
          → Anthropic → writes transcript_words.ai_suggestion,
          speaker_resolution_current, utterance line-types

  5.  src/components/SuggestionsPanel/SuggestionsPanel.tsx
        Surfaces CorrectionObjects for human accept/edit/reject.

  6.  src/lib/transcript/correctionObject.ts + correctionValidator.ts
        Validate/shape corrections. Enforce word_id anchoring, type,
        proposed value, confidence score.

correctionOrchestrator.ts (buildCorrectionReport) runs client-side,
populates state.correctionReport consumed by CorrectionsPanel.tsx.
It is deterministic-report generation, independent of the button.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 3. FULL UPSTREAM PIPELINE — DEEPGRAM TO WORKSPACE

(From July 28 audit — every transformation before buildEditorContent runs)

### 3.1 Provider request shape

  Owner: src/lib/deepgram/buildDeepgramRequest.ts

  Current Deepgram request is NOT equivalent to the Playground request:
  - paragraphs=true is MISSING — no Paragraph metadata is requested, typed,
    or persisted. The DeepgramResponse type has no Paragraph metadata shape.
  - utt_split = 0.8, not 1.0
  Even if paragraphs=true were added, fidelity would still fail because
  normalize.ts ignores Paragraph metadata, canonical persistence has no
  provider-paragraph representation, editor-api returns canonical utterances
  not provider paragraphs, and buildEditorContent immediately invokes CFE.

### 3.2 Raw response integrity gate

  Owner: src/lib/transcript/integrityAudit.ts
  Called by: supabase/functions/transcribe-callback/index.ts
  Gates processing. Does NOT rewrite words. Must preserve.

### 3.3 Normalization

  Owner: src/lib/transcript/normalize.ts
  Transformations:
  - Selects punctuated_word before word
  - Generates spk_###, utt_######, w_######## IDs
  - Creates fallback utterances if Deepgram utterances missing
  - Splits provider utterances when word-level speaker IDs change
  - Creates canonical Speaker N labels
  - Initializes working_text = null, review state, filler state
  The split-utterance representation is not the same as Deepgram Paragraph
  view and must not be treated as the provider's visual ownership.

### 3.4 Multi-source / chunk merge

  Owners: multifileMerge.ts, autoChunking.ts, finalizationPipeline.ts
  Offsets timestamps, resequences IDs, reconciles chunk seams, namespaces
  speakers for distinct source files. Speaker 0 across separate recordings
  is NOT established as the same human — that is a Working Transcript decision.

### 3.5 Canonical integrity gate

  Owner: src/lib/transcript/canonicalIntegrity.ts
  Prevents orphan IDs, invalid timing, broken order, duplicate seams.
  Does not change recognition wording. Must preserve.

### 3.6 Canonical persistence

  Owner: supabase/functions/_shared/transcriptFinalize.ts
  Persists to transcripts, transcript_speakers, transcript_utterances,
  transcript_words, audit rows. Raw JSON retained in Storage but NOT read
  by the Workspace (which reads database rows through editor-api).

### 3.7 Boundary enrichment

  Owners: boundaryEngine.ts, runBoundaryEngine() in transcriptFinalize.ts
  Sets excluded_from_output, exclusion_reason; deletes/recreates synthetic
  boundary rows; inserts synthetic words and utterances.
  VIOLATION: runs before reporter approval; can hide provider-recognized
  material and add non-provider material. Must not affect Recognition Transcript.

### 3.8 AI review (auto-triggered)

  Owners: supabase/functions/ai-review/index.ts, aiReview.ts,
           aiSuggestionEngine.ts
  When AI_REVIEW_AUTO_APPLY is enabled, high-confidence suggestions can
  write working_text and become accepted WITHOUT reporter action.
  VIOLATION: must be an explicit layer, never auto-applied to initial view.

### 3.9 Editor API mapping

  Owner: supabase/functions/editor-api/index.ts
  - Speaker display uses assigned_name || display_name || speaker_label
  - Word display uses working_text ?? text — NOT immutable raw_text
  - Removed words are filtered
  - excluded_from_output, exclusion_reason, is_synthetic are DROPPED by
    mapUtteranceRow(), so buildEditorContent.ts cannot apply its
    exclusion check in real-API mode — contract/projection mismatch.

### 3.10 Concurrency and timing

  Enrichment is NOT atomic:
  1. Canonical rows inserted
  2. Job marked complete
  3. Boundary enrichment attempted
  4. AI review triggered fire-and-forget
  The Workspace can become available while enrichment is still changing rows.
  A first load and a later refresh can produce different visible content even
  when the reporter has made no edits.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 4. BUTTON LOCATION AND RENAME DECISION

### "Re-review" button (P-B trigger):
  File:          src/components/AIReviewBanner/AIReviewBanner.tsx
  Line:          67 (label), 61–69 (full element)
  Current text:  "Re-review" (idle) / "Re-reviewing..." (active)
  onClick:       () => void handleReReview() (L63)
  Call chain:    AIReviewBanner.tsx:63 onClick
                   → handleReReview() :42
                   → workspaceService.ts:858 triggerAIReview
                   → client.ts:176 triggerAIReview
                   → POST .../ai-review
                   → supabase/functions/ai-review/index.ts:29
                     (bridge :340 or legacy :182 generateAISuggestions)

### Secondary labels (not triggers):
  src/components/RightSidebar/RightSidebar.tsx:34 — tab label "AI Review"
  src/components/SuggestionsPanel/SuggestionsPanel.tsx:249 — panel heading

### CRITICAL DECISION REQUIRED — Choose one option before any rename:

  OPTION A: Rename to a truthful label describing AI suggestion review
            (e.g., "Run AI Review", "Review Transcript with AI")
            No rewiring required. Label matches actual behavior.

  OPTION B: Keep current label. Add a separate "Format Transcript" button
            that triggers the P-A formatting pipeline explicitly.

  OPTION C: Rename to "Correct and Format Transcript" AND rewire the button
            to trigger P-A formatting + P-B AI review in sequence.
            Requires additional engineering work.

### Files affected by any rename (minimum scope):
  1. src/components/AIReviewBanner/AIReviewBanner.tsx:67
     (and :24–33 title/detail copy if consistency wanted)
  2. src/components/AIReviewBanner/AIReviewBanner.test.tsx
     (assertions at L67, L76, L86, L99, L105)
  3. src/components/RightSidebar/RightSidebar.tsx:34 (if tab also renamed)
  4. src/components/SuggestionsPanel/SuggestionsPanel.tsx:249 (if panel renamed)
  No API/function identifiers need renaming for a label-only change.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 5. FORMATTING RULE COMPLIANCE — C1 THROUGH C9

Confirmed rules derived from four real produced Texas deposition transcripts
(CSR Trisha Myler). These are the authoritative standard for the Workspace
transcript body.

### C1 — TAB STOP VALUES (src/lib/format/geometryProfile.ts)

  [C1-A] F1 — qaLabelInches
    PASS. Current: 0.5″. Required: 0.5″. File: geometryProfile.ts L12.

  [C1-B] F14 — qaTextInches
    PASS. Current: 1.0″. Required: 1.0″. File: geometryProfile.ts L13.

  [C1-C] F1 — speakerInches
    PASS. Current: 1.5″. Required: 1.5″ (third tab, F1). File: geometryProfile.ts L14.

  [C1-D] F20 — parentheticalInches
    FAIL — CRITICAL.
    Current: 2.0″ (geometryProfile.ts L15 AND src/index.css:154).
    Required: 1.5″ (measured directly from real transcripts — parentheticals
    align with colloquy labels at the third tab, NOT the second tab).
    NOTE: Section B of the audit prompt stated 1.0″ — this was incorrect.
    Direct measurement from real produced transcripts confirms 1.5″.
    Both files must be updated in sync. See OQ-1.

  [C1-E] F5a / F13 — continuationInches
    PASS. Current: 0″. Required: 0″ (flush left wrap). File: geometryProfile.ts L17.

### C2 — COLLOQUY SPACING

  [C2-A] F2 — Two spaces after colon in colloquy labels
    PASS — but NOT in editorialEngine. Implemented at render time:
    geometryEngine.ts:67 (":  "), unifiedRendering.ts:133 (":  "),
    workspacePresentation.ts:760 via COLON_GAP = "  " (stageS/colloquy.ts:3),
    src/index.css:133,147 via content: attr(data-prefix-text) "  ".

  [C2-B] F3 — Two spaces after sentence-ending punctuation
    PASS. editorialEngine.ts applyPunctuationRules L78–94. Generic
    sentence-boundary rule at L88–94 forces . + two spaces unless
    abbreviation/"okay" (isAbbreviation L126–132). ?/! handled L83–87.

### C3 — OBJECTION FORMATTING

  [C3-A] Pattern in editorialEngine.ts L32–35:
    /^((?:(?:THE WITNESS|THE REPORTER|THE VIDEOGRAPHER|[A-Z][A-Z .'-]+):\s*)?)
      Objection[,:;.]?\s+(form|hearsay|speculation|foundation|leading|
      nonresponsive|compound|relevance|privilege|scope|argumentative|vague)
      [.?!]?$/i
    Applied in applyObjectionRules L98–106. Supplementary: qaFixer.ts:16–20,
    correctionRegistry.ts:215–241, correctionEngines.ts:195–218.

  [C3-B] F7 — "Objection.  Form." with TWO spaces
    PARTIAL PASS.
    "Objection. Form." → "Objection.  Form." ✓ PASS
    "Objection, form" → "Objection.  Form." ✓ PASS
    "Objection,form" (no space) → NOT MATCHED (regex requires \s+) ✗ FAIL
    SEPARATE FAIL: correctionRegistry.ts:153–156 maps "Addiction form" →
    "Objection. Form." with ONE space — violates F7 unless re-run through
    editorialEngine afterwards.

  [C3-C] F7 — Special-case exception for objection spacing
    FOUND — CORRECT. Must remain. Hard-codes "Objection.  ${basis}." (L101,
    two spaces). Confirmed house style: 55 occurrences across four real
    transcripts. Do NOT remove this special case.

  F7 FINAL CONFIRMED STATE: "Objection.  Form." — two fragments, two spaces.
  The form "Object to the form." is verbatim attorney speech (3 occurrences
  in embry, all from Hurley), not a reporter format rule.

### C4 — INTERRUPTION DASH

  [C4-A] F6 — INTERRUPTION_DASH value
    PASS. correctionRegistry.ts:41 = " -- " (space-dash-dash-space).
    Also enforced in editorialEngine.ts:72 (\s*(?:--|—)\s* → " -- ").

### C5 — Q./A. WRAP BEHAVIOR

  [C5-A] F13 — Continuation lines return to 0″
    PASS. geometryEngine.ts layoutFor sets continuation_indent_inches:
    profile.tabs.continuationInches (=0) for Q/A (L146–152). CSS: text-indent
    first-line-only (src/index.css:126–129).

  [C5-B] F14 — New paragraph within same Q./A. at 1.0″, no repeated label
    NOT IMPLEMENTED. Same-speaker consecutive paragraphs are MERGED
    (workspacePresentation.ts:636–645 canMergeParagraphs / qaFixer.ts:131–140).
    geometryEngine has no F14-specific new-paragraph-at-text-column rule.
    Decision required: implement F14 or formally document merge as correct.

### C6 — BY LINE POSITION

  [C6-A] F15 — BY MR./MS. NAME: at left margin (0″)
    FAIL — IMPORTANT. Standalone BY_LINE paragraphs are SKIPPED ENTIRELY in
    buildEditorContent.ts (lines 320–322 return without emitting). Where
    BY_LINE geometry IS computed it resolves to 1.5″ (speaker tab), not 0″:
    geometryEngine.ts layoutFor has no BY_LINE branch (L173–178, 180–197).
    CSS: utterance-block--by-line .utt-content { text-indent: 1.5in }
    (src/index.css:140–142). No code renders BY MR./MS. at 0″.

### C7 — PARENTHETICAL BLANK LINES

  [C7-A] F20 — No blank lines above or below
    PASS. unifiedRendering.ts joins all paragraphs uniformly (\n\n, L88).
    CSS applies same inter-block gap to every block (index.css:85–87).
    Parenthetical adds no extra top/bottom spacing (index.css:153–164).

### C8 — SCOPE COMPLIANCE (F19 — Workspace body only)

  [C8-A] Caption/appearances/certificate/errata in Workspace body
    PASS (with note). buildEditorContent.ts emits only utterance + pageBreak
    blocks. A UI chrome title "CERTIFIED TRANSCRIPT OF DEPOSITION" renders in
    TranscriptEditor.tsx:437–451 (header banner, not a transcript paragraph)
    — belongs to the Legal Transcript stage. Decision required (OQ-5).

  [C8-B] Line numbers in Workspace body
    FAIL — F19 CONFLICT. Per-utterance line-number gutter IS rendered:
    UtteranceNode.ts:121–129 + index.css:90–103. Value via buildPages
    (buildEditorContent.ts:30–37, 106). Decision required (OQ-4).

  [C8-C] Text boxes/frames in Workspace body
    PASS. Not found in the body rendering layer.

### C9 — BUTTON LOCATION (see §4 for full detail)
  [C9-A] AIReviewBanner.tsx — "Re-review"/"Re-reviewing..." at L67. ✓
  [C9-B] RightSidebar.tsx:34 — tab label "AI Review". ✓
  [C9-C] Only AIReviewBanner invokes triggerAIReview. No other buttons found.
  [C9-D] Full chain documented in §2 Pipeline P-B.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 6. OWNERSHIP MAP AND CONFLICTS

### Current ownership (from July 28 audit)

| Concern | Persistence owner | Current Workspace owner | Correct stage |
|---|---|---|---|
| Recognition words | raw_text in transcript_words | editor-api maps working_text ?? text; CFE may rewrite | Recognition — must always select raw_text |
| Paragraphs | No current owner | CFE/workspacePresentation reconstructs | Recognition — preserve provider Paragraph metadata |
| Numeric speakers | normalize.ts, speaker tables | editor-api, workspacePresentation.ts | Recognition numeric; Working owns assignments |
| Speaker identities | Speaker resolution tables | SpeakerPanel, AI review, presentation inference | Working, reporter-approved |
| Punctuation | raw_text | CFE + editor working text | Recognition provider punctuation; Working owns corrections |
| Word/phrase correction | AI/working text fields | CFE correction registry + user editor | Working only |
| Boundary visibility | Boundary engine exclusion fields | Attempted filter in buildEditorContent.ts (broken real-API) | Structured |
| Synthetic parentheticals | Boundary engine synthetic rows | Loaded as ordinary content | Structured, visibly synthetic |
| Q/A and colloquy | Suggested/persisted line types | workspacePresentation.ts, qaFixer.ts | Structured |
| Legal formatting | geometry configuration | CFE, geometry, nodes, CSS | Legal |
| Pagination/line numbering | No recognition ownership | pagination.ts, CFE, page-break node, UtteranceNode.ts | Legal |
| Certification header | Certification records/locks | TranscriptEditor.tsx:437–451 (current) | Legal, only after certification |

### Three ownership conflicts

  CONFLICT 1 — CFE owns both correction and legal formatting. It rewrites
  visible words while also computing page geometry.

  CONFLICT 2 — Workspace presentation owns both speaker inference and legal
  structure. Names, roles, Q/A, colloquy, and paragraph merging in one path.

  CONFLICT 3 — Editor API selects working text before view selection. The
  frontend cannot reliably request a recognition-only projection through the
  frozen contract. The exclusion filter in buildEditorContent.ts is broken in
  real-API mode because mapUtteranceRow() drops excluded_from_output and
  exclusion_reason before the frontend can see them.

### Geometry authority split
  Tab values exist in BOTH geometryProfile.ts AND src/index.css:154. These
  must be kept in sync on every geometry change. Recommended long-term:
  derive CSS values from the profile object at build time.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 7. GAPS SUMMARY

### CRITICAL — Produces incorrect output visible to the reporter

  GAP-1  parentheticalInches = 2.0″ in two synced files. Required: 1.5″
         (third tab, aligned with colloquy — confirmed from real transcripts;
         NOT 1.0″). Files: geometryProfile.ts:15, src/index.css:154. Sync.

  GAP-2  Button mislabels its behavior. "Re-review" triggers P-B (AI
         suggestions), not P-A (formatter). Rename decision required (§4).

  GAP-3  BY MR./MS. NAME: never rendered at 0″. Standalone BY-line dropped
         (buildEditorContent.ts:320–322). F15 confirmed: 0″ flush left.

### IMPORTANT — Deviates from confirmed rules

  GAP-4  F19 — Line-number gutter in Workspace body (UtteranceNode.ts:121–129
         + index.css:90–103).

  GAP-5  F7 — One-space objection replacement in correctionRegistry.ts:154.

  GAP-6  F14 — Same-speaker new paragraph not implemented (merged instead).

  GAP-7  Workspace body still mixes stage concerns (CFE runs even on "Keep
         Raw Labels"; certification header before certification; working_text
         over raw_text at the API layer).

### MINOR — Does not affect rendered output currently

  GAP-8  "Objection,form" (no space) not normalized by the objection regex.

  GAP-9  paragraphs=true not requested from Deepgram.

  GAP-10 Exclusion filter in buildEditorContent.ts broken in real-API mode
         (mapUtteranceRow drops excluded_from_output).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 8. OPEN QUESTIONS — SIX DECISIONS REQUIRED BEFORE ANY CODE CHANGE

  OQ-1   F20 parenthetical indent — ratify 1.5″. Prompt said 1.0″; real
         transcripts say 1.5″; code uses 2.0″. RECOMMENDATION: 1.5″.
         Record in a numbered ADR before geometryProfile.ts is touched.

  OQ-2   F5b — New colloquy paragraph, same speaker, no repeated label → 1.5″.
         DIRECT-REVIEW NOTE (Claude Code, 4 reference transcripts): NOT
         observed. Every colloquy continuation is a line-wrap → 0″ (F5a);
         every same-speaker continuation gets a NEW label at 1.5″ (embry p15
         has MR. HURLEY: on lines 2 AND 6). RECOMMENDATION: do NOT ratify F5b
         without a concrete label-less example; treat as retired unless one
         surfaces.

  OQ-3   Button rename + behavior — choose Option A, B, or C in §4.

  OQ-4   F19 line-number gutter — intentional editing aid (exempt) or scope
         violation to remove from the Workspace body?

  OQ-5   F19 certification header — "CERTIFIED TRANSCRIPT OF DEPOSITION"
         renders before certification (TranscriptEditor.tsx:437–451). Remove
         now or defer to UFM section build-out?

  OQ-6   F15 BY-line — implement at 0″ flush left, or formally document that
         inline resumption (F17) is the only intended body form?

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 9. RECOMMENDED NEXT STEPS

### DOCUMENTATION PR — No code. Required first.
  1. Numbered ADR ratifying parenthetical position at 1.5″, retiring 1.0″/2.0″.
  2. Decisions on OQ-2 through OQ-6 recorded in RATIFIED_DECISIONS.md / ADRs.
  3. Update FORMATTING_PIPELINE_MAP.md and FORMATTER_OWNER_AUDIT.md to reflect
     the two-pipeline reality; note geometry authority split; document
     editorialEngine.ts as DOCX/export path only.
  4. Record the four-stage transcript model as an architectural ADR.

### CODE PR 1 — Geometry fix (after docs ratified)
  Fix GAP-1: parentheticalInches → 1.5″. Scope: geometryProfile.ts:15 +
  src/index.css:154 + any tests asserting 2.0″. Same commit to prevent drift.

### CODE PR 2 — Button rename (after OQ-3 decided)
  Scope per option chosen.

### CODE PR 3 — F7 objection one-space fix (small, can go with PR 1)
  Fix GAP-5: correctionRegistry.ts:154 one space → two spaces.

### CODE PR 4 — F15 BY-line (after OQ-6, after PR 1)
  If 0″: buildEditorContent.ts emit BY_LINE; geometryEngine.ts + CSS 0″ branch.

### CODE PR 5 — F14 same-speaker paragraph (after OQ-2 ratified)
  If implement: buildEditorContent.ts + geometryEngine.ts new unlabeled para.

### CODE PR 6 — F19 line numbers (after OQ-4 decided)
  If remove: UtteranceNode.ts + index.css remove gutter.

### LATER — Stage separation (July 28 recommendation)
  - Request paragraphs=true; type/persist metadata
  - Recognition Transcript projection that always selects raw_text
  - Remove CFE from initial Workspace render path
  - Fix mapUtteranceRow() to pass through excluded_from_output
  - Separate boundary engine from initial Recognition view
  - Remove "CERTIFIED TRANSCRIPT OF DEPOSITION" from Workspace header

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## APPENDIX — WHAT MUST BE PRESERVED (from July 28 audit)

### Must preserve unconditionally
  1. Raw Deepgram JSON artifact in Storage
  2. Immutable word-level raw_text
  3. Provider timestamps, confidence, and numeric diarization IDs
  4. Audio synchronization and stable word identity
  5. Raw-response and canonical integrity gates
  6. Canonical relational persistence needed by editing/search/audio
  7. Human Save control, autosave safety, audit trail, certification lock
  8. Multi-source ordering and timing offsets with visible provenance
  9. Frozen API contract (src/api/types.ts)

### May preserve, but only as explicit reviewable layers
  1. Boundary detection and hidden material
  2. Synthetic parentheticals
  3. AI word suggestions and speaker proposals
  4. Reporter working-text corrections
  5. Confidence/scopist flags
  6. Deterministic correction registry suggestions
  7. Speaker-run resegmentation
  8. Q/A, colloquy, objection, and examination structure
  9. Legal spacing and abbreviation rules
  10. Pagination and line numbering

### Must eventually remove from the initial Recognition Transcript view
  1. CFE deterministic token and phrase replacement
  2. Inline scopist flags inserted into transcript text
  3. Boundary-based content hiding
  4. Synthetic boundary parentheticals
  5. AI working_text selection and accepted overlay text
  6. Inferred participant names replacing numeric provider labels
  7. Q/A and colloquy classification
  8. Legal tabs, margins, double-space rules, pagination, line numbering
  9. "CERTIFIED TRANSCRIPT OF DEPOSITION" before certification
  10. Silent merging/splitting that diverges from provider Paragraph structure

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

*Sources: Two read-only audits — August 4, 2026 (compliance) and 2026-07-28
(architectural), both against feature/stage3-workspace-core. No files were
modified during either audit. Transcript-derived corrections (F20 = 1.5″, F7
house style confirmed, F5b NOT observed) folded in from direct review of four
real produced depositions (CSR Trisha Myler).*

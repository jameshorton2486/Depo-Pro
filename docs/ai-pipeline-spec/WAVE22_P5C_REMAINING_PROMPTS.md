# WAVE 22 P5-C — REMAINING PROMPTS NEEDED
# Gap analysis: what P5 and P5-B do NOT cover, and what prompts to build next
#
# Read this before writing any more code. Each section is a self-contained
# next prompt you can hand to Codex or Claude Code.

---

## GAP 1 — Q./A. STRUCTURE FIX FOR AI-CONFIRMED SPEAKERS
# Priority: HIGH — blocks correct transcript display
# Depends on: P5 speaker suggestions accepted

### The Problem
The qaFixer only assigns Q. lines to utterances where speaker_role = ATTORNEY
and A. lines where speaker_role = WITNESS. When Deepgram's diarization is wrong
and the speaker map has not been confirmed, ALL utterances render as colloquy
(MR. PETERSON: text) instead of Q./A. structure.

After P5 runs and the AI correctly identifies speakers, the workspace must
re-run the Q./A. classification pass with the updated speaker roles.

### The Prompt

```
WAVE 22 P5-C PROMPT 1: Post-Speaker-Confirmation Q./A. Re-Classification

In src/lib/transcript/qaFixer.ts, the classifyUtterances() function currently
reads speaker_role at initial load and does not re-run when the speaker map changes.

Add a re-classification trigger:

1. In DocumentContext.tsx, watch for changes to speaker_resolution_current via
   a real-time Supabase subscription on the table for this transcript_id.

2. When any speaker's verified_role changes:
   - Re-run classifyUtterances() for all utterances belonging to that speaker
   - Update transcript_utterances.line_type in the database
   - Invalidate the buildEditorContent query cache

3. The re-classification rules (already in qaFixer.ts — do not change them):
   - speaker_role = ATTORNEY + sentence ends in ? → line_type = Q
   - speaker_role = ATTORNEY + imperative → line_type = Q
   - speaker_role = WITNESS → line_type = A
   - speaker_role = REPORTER → line_type = COLLOQUY
   - speaker_role = OTHER → line_type = COLLOQUY (unchanged)

4. Add a "Reclassify structure" button to the SpeakerPanel header that manually
   triggers this for cases where the subscription fires too late.

Verification:
  - After accepting AI speaker suggestion (MR. BENTLEY, ATTORNEY),
    his utterances switch from colloquy to Q. lines without reload.
  - THE REPORTER utterances never become Q. or A. lines.
  - Existing qaFixer tests still pass.
```

---

## GAP 2 — PRE-RECORD CONTENT EXCLUSION
# Priority: HIGH — pre-record chatter appears in certified transcripts
# Depends on: P5 AI engine (to identify the formal opening block)

### The Problem
Pre-record social chatter (Zoom hellos, "can you hear me", audio checks)
appears in the workspace because the classifier has no gate for it. The
AI engine in P5 can identify the formal opening block, but there is no
pipeline step that strips everything before it.

### The Prompt

```
WAVE 22 P5-C PROMPT 2: Pre-Record Content Gate

In the ai-review Edge Function (supabase/functions/ai-review/index.ts),
after generating suggestions, add a pre-record detection pass:

1. Add to AISuggestionResult:
   preRecordCutoff: { utterance_id: string; sequence_number: number } | null

2. In the AI prompt (aiSuggestionEngine.ts), add to the task JSON:
   find_pre_record_cutoff: true
   
   The AI should return the utterance_id of the FIRST formally on-record block.
   "Formally on-record" means it contains ALL of:
     - A date statement ("Today is [date]" / "Today's date is [date]")
     - A time statement ("The time is [time]")
     - A case identification phrase
   
   Everything BEFORE this utterance is pre-record content.

3. When preRecordCutoff is returned, update all earlier utterances:
   UPDATE transcript_utterances
   SET line_type = 'PRE_RECORD', excluded_from_output = true
   WHERE transcript_id = :id
     AND sequence_number < :cutoff_sequence_number;

4. In workspacePresentation.ts and buildEditorContent.ts:
   - Filter out utterances where excluded_from_output = true
   - These never appear in the workspace, exported TXT, or DOCX

5. Add excluded_from_output boolean column to transcript_utterances
   (new migration file: [timestamp]_add_excluded_from_output.sql)

6. In the CorrectionsPanel summary card, add:
   "N pre-record blocks excluded" — shown in a gray sub-line under the
   total block count, only when N > 0.

Verification:
  - Etminan transcript: "Good afternoon" opening chatter does not appear
  - First visible block in workspace is the formal videographer opening
  - TXT and DOCX export do not contain pre-record content
  - Excluded blocks visible in raw view (a new "Show excluded" toggle)
```

---

## GAP 3 — OFF-RECORD SECTION REPLACEMENT
# Priority: MEDIUM — off-record content included verbatim
# Depends on: GAP 2 (uses same excluded_from_output mechanism)

### The Prompt

```
WAVE 22 P5-C PROMPT 3: Off-Record Section Replacement

Extend the ai-review Edge Function to detect off-record/on-record boundaries.

Add to the AI pass:
  offRecordSections: Array<{
    off_utterance_id: string;
    off_time: string;           // "1:34 p.m."
    on_utterance_id: string | null;
    on_time: string | null;
    is_conclusion: boolean;     // true for final off-record
  }>

For each off-record section:
  1. Mark all utterances between off_utterance_id and on_utterance_id
     as excluded_from_output = true.
  2. Mark off_utterance_id itself as excluded_from_output = true.
  3. Mark on_utterance_id itself as excluded_from_output = true.
  4. Create a SYNTHETIC parenthetical utterance:
     INSERT INTO transcript_utterances (
       transcript_id, sequence_number, line_type,
       raw_text, working_text, is_synthetic
     ) VALUES (
       :transcript_id,
       :off_sequence_number + 0.5,  -- fractional seq to sort between
       'PARENTHETICAL',
       '(Whereupon, a recess was taken at [off_time].)',
       '(Whereupon, a recess was taken at [off_time].)',
       true
     );
  5. If on_time is not null, create a second synthetic parenthetical:
     '(Whereupon, the proceedings resumed at [on_time].)'
  6. If is_conclusion = true:
     '(Whereupon, the deposition was concluded at [off_time].)'

Add is_synthetic boolean column to transcript_utterances.
Synthetic utterances are display-only and cannot be edited.

Verification:
  - Thomas deposition: 4 off-record sections replaced with parenthetical pairs
  - Audio troubleshooting session (1:34–1:44 p.m.) not visible in workspace
  - Parenthetical pairs appear at correct position in transcript flow
  - DOCX export contains parentheticals, not off-record content
```

---

## GAP 4 — UTTERANCE REASSIGNMENT UI (P4 Step 3)
# Priority: HIGH — without this Miah cannot fix diarization errors
# Depends on: P5-B (Corrections Panel must exist)

### The Prompt

```
WAVE 22 P5-C PROMPT 4: Utterance Reassignment in Transcript Editor

Currently Miah can rename and re-role speakers in the Speaker Panel, but she
cannot reassign individual utterances to a different speaker.

This is the missing piece for cases where Deepgram's diarization is wrong
at the utterance level (e.g., two paragraphs labeled MR. BENTLEY should be
DR. ETMINAN).

1. In the transcript editor word view, add a right-click context menu on any
   utterance block with:
     - "Reassign this utterance to..." → shows list of known speakers
     - "Reassign this and all following to..." → batch reassignment

2. On selection:
   UPDATE transcript_utterances
   SET speaker_id = :new_speaker_id,
       speaker_display_name = :new_display_name,
       speaker_role = :new_role,
       manually_reassigned = true
   WHERE id = :utterance_id;

3. Re-run Q./A. classification for the reassigned utterance (same trigger
   as GAP 1 — the real-time subscription fires).

4. Log to change_log:
   { type: 'utterance_reassigned', utterance_id, from_speaker, to_speaker }

5. Add manually_reassigned boolean column to transcript_utterances.
   Manually reassigned utterances are never overwritten by AI re-review.

6. Show a small speaker-chip badge on the utterance block when
   manually_reassigned = true, so Miah can see what she changed.

Verification:
  - Right-click on MR. PETERSON block → select MR. BENTLEY → block relabels
  - Utterance switches to Q. structure if MR. BENTLEY is ATTORNEY
  - Other MR. PETERSON utterances in the same Deepgram cluster are unaffected
  - change_log entry created
  - Hard reload preserves the manual reassignment
```

---

## GAP 5 — RERUN AI REVIEW BUTTON
# Priority: LOW — needed for transcripts where prompt version was updated
# Depends on: P5 (ai_review_meta version gating)

### The Prompt

```
WAVE 22 P5-C PROMPT 5: Force Re-Review Button

In the workspace header or AIReviewBanner, add a "Re-run AI review" button.

Visible when:
  transcript.ai_review_meta.completed = true
  AND (prompt_version has changed OR user explicitly requests rerun)

On click:
  1. Show confirmation: "This will clear all pending AI suggestions and
     run a fresh review. Accepted corrections are preserved. Continue?"
  2. If confirmed:
     - Set ai_suggestion_status = NULL for all pending words
       (accepted/rejected words are NOT touched)
     - Call ai-review Edge Function with force_rerun: true
     - Show AIReviewBanner with "AI is re-reviewing..." state

The force_rerun parameter in the Edge Function bypasses the version gate
and runs the full AI pass regardless of ai_review_meta state. On completion
it overwrites ai_review_meta with the new version and timestamp.

Verification:
  - Button only appears on completed reviews
  - Accepted corrections are not touched by re-run
  - New pending suggestions appear in Corrections Panel after re-run
  - ai_review_meta.prompt_version updated after re-run
```

---

## SUMMARY: FULL BUILD ORDER

| Prompt | File(s) | Priority | Blocks |
|--------|---------|----------|--------|
| P5     | Schema + aiSuggestionEngine + ai-review Edge Fn | CRITICAL | Everything |
| P5-B   | AISuggestionsSection + hooks + CSS | HIGH | Corrections Panel |
| P5-C #1 | qaFixer re-classification trigger | HIGH | Correct Q./A. display |
| P5-C #2 | Pre-record gate + excluded_from_output | HIGH | Clean workspace |
| P5-C #3 | Off-record replacement + synthetic parentheticals | MEDIUM | Clean exports |
| P5-C #4 | Utterance reassignment UI | HIGH | Miah's manual fix flow |
| P5-C #5 | Force re-review button | LOW | Maintenance |

Run them in order. Each depends on the schema from the one above it.
Do not run #2 before the schema from P5 is deployed.
Do not run #3 before #2 is deployed (uses excluded_from_output).

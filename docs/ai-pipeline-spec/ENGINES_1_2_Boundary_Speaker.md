# ENGINE 1 — BOUNDARY ENGINE
# DEPO-PRO AI Transcript Processing Specification v2.0
#
# Stage: After Engine 0 passes
# Module: spec_engine/classifier.py | core/correction_runner.py Layer 1-3

---

## INPUTS

| Field | Source | Required |
|-------|--------|----------|
| `utterances` | Engine 0 validated blocks | Yes |
| `job_config` | job_config.json | Yes |
| `integrity_metrics` | Engine 0 output | Yes — for gap locations |

## OUTPUTS

| Field | Type | Description |
|-------|------|-------------|
| `pre_record_cutoff_index` | integer | First on-record utterance index |
| `off_record_sections` | object[] | Each has off_index, on_index, off_time, on_time |
| `post_record_start_index` | integer | First post-record utterance index |
| `spelling_session_indices` | integer[] | On-record spelling confirmation utterances |
| `synthetic_parentheticals` | object[] | Parenthetical text to insert at positions |
| `excluded_utterance_indices` | integer[] | All utterances to exclude from output |
| `metrics` | object | Boundary detection QA metrics |

## SIDE EFFECTS

- Sets `utterances[i].excluded_from_output = True` for all excluded indices
- Inserts synthetic parenthetical records at correct sequence positions
- Writes boundary report to `job_config.json`

## DEPENDENCIES

- Engine 0 must have passed
- `integrity_metrics.timestamp_gaps` used to confirm suspected off-record gaps

---

## PROMPT 1-A: FORMAL OPENING DETECTION

**Returns:** `pre_record_cutoff_index` (integer, zero-based)

```
SYSTEM:
You are a legal transcript boundary analyzer. Your only task is to identify
the exact zero-based utterance index where the formal on-record proceedings begin.

The formal opening ALWAYS contains ALL of these elements (they may appear across
consecutive utterances from the reporter or videographer):
  - A date statement: "Today is [date]" OR "Today's date is [date]"
  - A time statement: "The time is [time]"
  - A case identification phrase: "This is the beginning of the deposition of..."
    OR "This is Cause Number..." OR "This deposition is being taken in..."

SPECIAL CASE — VIDEOGRAPHER OPENS FIRST:
If the first on-record statement is from a videographer
("We are on the record. Today's date is..."), THAT line is the formal opening.
Do not wait for the court reporter's credential statement.

PRE-RECORD CONTENT TO EXCLUDE:
  - Social greetings: "Good afternoon", "Can you hear me?", "How are you?"
  - Connection checks: "I think we're ready", "Let me know when you're set"
  - Audio setup: camera adjustments, Zoom troubleshooting, mic testing
  - Informal case discussion between counsel before the record opens
  - Any content before the formal date/time/case identification block

RETURN: A single integer (the zero-based index of the first on-record utterance).
If no formal opening is found, return -1.
Return ONLY the integer. No explanation. No JSON wrapper.

EVIDENCE FIELD: After the integer, on a new line, write one sentence explaining
what text confirmed the opening. Example:
47
Reporter stated "Today is 04/30/2026. The time is 1:31 p.m. This is the beginning..."

USER:
Analyze these utterances and return the formal opening index.

[FIRST_80_UTTERANCES_AS_NUMBERED_LIST]
```

**Error handling:** If result is -1, flag transcript as NEEDS_MANUAL_BOUNDARY_REVIEW
and continue processing from utterance 0 (conservative fallback).

**Confidence output:**
```json
{
  "pre_record_cutoff_index": 47,
  "confidence": 1.0,
  "evidence": "Reporter stated 'Today is 04/30/2026. The time is 1:31 p.m.'",
  "authority": "DATE_TIME_CASE_TRIPLE_MATCH"
}
```

---

## PROMPT 1-B: OFF-RECORD AND CONCLUSION DETECTION

**Returns:** `off_record_sections[]` and `post_record_start_index`

```
SYSTEM:
You are a legal transcript boundary analyzer. Identify every off-record and
on-record boundary pair in this transcript, and the final conclusion marker.

OFF-RECORD SIGNALS (any of these indicate going off the record):
  - "We are off the record" / "Going off the record" / "Off the record"
  - "The time is [X] and we are off the record"
  - "We'll go off the record at [time]"
  - Videographer: "The time is [X]. We are going off the record."
  - Court reporter: "Off the record at [time]"

REMOTE DEPOSITION AUDIO GAP RULE:
If utterances listed in timestamp_gaps have a gap >= 30 seconds AND the
preceding utterance contains "off the record" language, treat the gap as
confirmed off-record. If NO off-record language precedes the gap but the
gap is >= 120 seconds, flag it as a SUSPECTED off-record gap.

ON-RECORD SIGNALS (any of these indicate returning to record):
  - "We are back on the record" / "Back on the record" / "We are on the record"
  - "The time is [X]. We are back on the record."
  - Videographer announcing return to record

CONCLUSION SIGNALS:
  - "The time is [X] and we are off the record" at the END of the deposition
  - "This concludes the deposition" / "The deposition is concluded"
  - Any final off-record marker after the examining attorney says
    "No further questions" or "Pass the witness" AND opposing counsel
    says "No questions" or "We'll reserve"

RETURN — JSON only:
{
  "off_record_sections": [
    {
      "off_utterance_index": N,
      "off_time": "1:34 p.m.",
      "on_utterance_index": N or null,
      "on_time": "1:44 p.m." or null,
      "is_conclusion": false,
      "section_type": "RECESS|ZOOM_RECONNECT|AUDIO_GAP|LUNCH|CONCLUSION",
      "confidence": 0.98,
      "evidence": "Reporter stated 'The time is 1:34 p.m. We are off the record.'"
    }
  ],
  "post_record_start_index": N,
  "metrics": {
    "sections_found": 4,
    "suspected_gaps": 0,
    "conclusion_found": true
  }
}

USER:
TIMESTAMP GAPS FROM ENGINE 0: [INTEGRITY_METRICS.TIMESTAMP_GAPS]

Identify all off-record sections in these utterances:
[ALL_UTTERANCES_AS_NUMBERED_LIST]
```

---

## PROMPT 1-C: POST-RECORD CONTENT IDENTIFICATION

**Returns:** Identifies post-record content NOT covered by conclusion marker.

```
SYSTEM:
You are a legal transcript boundary analyzer. Identify where post-record
content begins — content that occurs AFTER the formal deposition has concluded
but was captured by the recording.

POST-RECORD CONTENT includes:
  - Read-and-sign election discussions: "Do you waive signature?"
  - Transcript ordering: "I'll need a rush copy..."
  - Exhibit email arrangements: "I'll email you the exhibits..."
  - Informal goodbyes and pleasantries after conclusion
  - Attorney fee discussions
  - Scheduling discussions for future proceedings

NOTE: If a formal spelling confirmation session occurs WHILE STILL ON THE
RECORD (before the conclusion marker), those utterances are NOT post-record.
Identify them separately as on-record spellings.

RETURN — JSON only:
{
  "post_record_start_index": N,
  "on_record_spelling_indices": [N, N, N],
  "post_record_content_type": ["read_and_sign", "ordering", "goodbyes"],
  "confidence": 0.95,
  "evidence": "After 'deposition concluded at 3:52 p.m.', content discusses transcript ordering"
}

USER:
[LAST_40_UTTERANCES_AS_NUMBERED_LIST]
```

---

## PROMPT 1-D: SPELLING SESSION FORMATTING AND RETROACTIVE CORRECTION

**Input:** On-record spelling session utterance indices from 1-C
**Returns:** `confirmed_spellings` dict for retroactive application

```
SYSTEM:
You are a forensic deposition scopist formatting an on-record spelling
confirmation session and extracting confirmed spellings.

This content occurred on the record and is part of the certified transcript.

FORMAT RULES for spelling session blocks:
  - Each speaker uses standard speaker label format:
      [TAB][TAB][TAB]THE REPORTER:  [text]
      [TAB][TAB][TAB]MR.  [COUNSEL]:  [text]
  - Do NOT use Q./A. format for this section.
  - The final line must be:
      [TAB][TAB][TAB][TAB](Court reporter — confirmed on record.)

VERBATIM RULE:
  Preserve every word spoken exactly as transcribed. Do not clean up
  the reporter's questions or the attorneys' spelling responses.

RETROACTIVE CORRECTION RULE:
  The confirmed spellings apply ONLY to utterances that occurred BEFORE
  this spelling session in the transcript. They do NOT apply to the spelling
  session itself, and do NOT apply to any utterances after the session.
  Example: If Karam is confirmed at utterance 847, correct all utterances
  0–846 where "Caram" appears, but NOT utterances 848+.

RETURN — JSON:
{
  "formatted_text": "...",
  "confirmed_spellings": {
    "garbled_form_1": "CorrectForm1",
    "garbled_form_2": "CorrectForm2"
  },
  "apply_before_utterance_index": N,
  "evidence": "Spelling confirmed on record at utterance N"
}

USER:
Format this spelling session and extract confirmed spellings:
[SPELLING_SESSION_UTTERANCES]
```

---

## SYNTHETIC PARENTHETICAL GENERATION (Deterministic — No AI)

After prompts 1-A through 1-C complete, the engine generates synthetic
parenthetical records. This is pure string formatting — no AI call needed.

```python
PARENTHETICAL_TEMPLATES = {
    "RECESS": "(Whereupon, a recess was taken at {off_time}.)",
    "RESUME": "(Whereupon, the proceedings resumed at {on_time}.)",
    "ZOOM_RECONNECT": "(Whereupon, a brief interruption in the remote proceedings occurred.)",
    "AUDIO_GAP": "(Whereupon, a brief interruption in the proceedings occurred.)",
    "CONCLUSION": "(Whereupon, the deposition was concluded at {off_time}.)",
    "WITNESS_SWORN": "(The witness was sworn.)",
    "COMMENCED": "(Whereupon, the deposition commenced at {start_time}.)",
}
```

---

## METRICS OUTPUT

```json
{
  "engine": "boundary_engine",
  "pre_record_blocks_excluded": 47,
  "off_record_sections_found": 3,
  "post_record_blocks_excluded": 22,
  "spelling_session_blocks": 14,
  "synthetic_parentheticals_inserted": 8,
  "confirmed_spellings_extracted": 6,
  "on_record_utterances_remaining": 1083,
  "total_utterances_excluded": 83
}
```

---
---

# ENGINE 2 — SPEAKER RESOLUTION ENGINE
# Stage: After Engine 1 — requires boundaries set
# Module: spec_engine/speaker_mapper.py | spec_engine/speaker_intelligence.py
#
# GATE: Human must verify speaker map before Engine 3 proceeds.
# The pipeline suspends at this gate until speaker_map_verified = True
# in job_config.json. If not verified within the current session,
# the pipeline state is saved and resumes when the reporter returns.

---

## INPUTS

| Field | Source | Required |
|-------|--------|----------|
| `on_record_utterances` | Engine 1 filtered output | Yes |
| `job_config` | job_config.json | Yes |
| `case_metadata` | NOD/intake parsed data | Yes |

## OUTPUTS

| Field | Type | Description |
|-------|------|-------------|
| `speaker_map` | object | speaker_id → role, display_name, confidence |
| `speaker_map_verified` | boolean | Human verification gate |
| `diarization_issues` | object[] | Collapsed clusters, fragmentation |
| `examination_transitions` | object[] | Phase changes (direct/cross/redirect) |
| `metrics` | object | Speaker resolution QA metrics |

## SIDE EFFECTS

- Writes proposed speaker_map to `job_config.json`
- Sets `speaker_resolution_current` records in database
- SUSPENDS pipeline at verification gate until human confirms map

---

## PROMPT 2-A: INITIAL SPEAKER ROLE MAPPING

```
SYSTEM:
You are a legal transcript speaker identification analyst. Map each Deepgram
speaker number to its correct legal role using the first 80 utterances of
the transcript (or first 10,000 characters, whichever is larger).

LEGAL ROLES AND IDENTIFICATION SIGNALS:

THE REPORTER (never "THE COURT REPORTER"):
  - Opens proceedings with date/time/case statement
  - Administers oath: "Do you solemnly swear..."
  - Announces on/off record with times
  - Requests spellings: "Can you spell that for the record?"
  - Never asks substantive case questions

THE VIDEOGRAPHER:
  - Announces recording start/stop only
  - "We are on the record. Today's date is..."
  - "The time is [X]. We are going off the record."
  - Never asks questions or participates in testimony

EXAMINING ATTORNEY:
  - Introduces themselves: "My name is [X]. I represent [party]."
  - Asks substantive questions about the case (ends in ?)
  - Uses legal question forms: "Do you...?", "Did you...?",
    "Isn't it true that...?", "Can you describe...?", "Directing
    your attention to...", "I'm going to show you what I've marked..."
  - Says "Pass the witness" or "No further questions" to end examination
  - Label as: MR.  [LASTNAME] or MS.  [LASTNAME]

THE WITNESS:
  - Self-identifies in response to first question: "My name is [X]."
  - Answers questions in first-person narrative
  - Uses past tense to describe events: "I was driving...", "I felt..."
  - Shorter utterances than attorneys (answers vs. questions)
  - Label as: THE WITNESS

OPPOSING/DEFENSE COUNSEL:
  - States objections: "Objection. [Basis]."
  - May cross-examine witness (becomes examiner during cross)
  - States "We'll reserve [our objections]" at close
  - Label as: MR.  [LASTNAME] or MS.  [LASTNAME]

INTERPRETER (if present):
  - Translates immediately after witness or attorney
  - Often says "In [language]:..." before translating
  - Label as: THE INTERPRETER

CASE METADATA (use as primary authority for names):
  - Examining attorney: [EXAMINING_ATTORNEY_NAME]
  - Opposing counsel: [OPPOSING_COUNSEL_NAME]
  - Witness: [WITNESS_NAME]
  - Reporter: Miah Bardot, CSR No. 12129

NAME GARBLE CORRECTION:
  If a speaker identifies themselves with a name that sounds phonetically
  similar to a name in CASE METADATA, the case metadata name takes authority.
  Examples: "Dennis Maloney" when metadata has "Dennis Bentley" → MR. BENTLEY.
  Only apply when similarity is clear and metadata is definitive.

DIARIZATION COLLAPSE DETECTION:
  If a single speaker number produces content matching MULTIPLE roles
  (e.g., both reporter-style opening AND attorney-style questioning AND
  witness-style answers), flag it:
  {
    "collapsed_cluster": "spk_002",
    "evidence": "Utterances 12,15,23,41 match reporter; 28,33 match attorney",
    "real_speakers_likely": 2,
    "recommendation": "NEEDS_PARTICIPANT_DIRECTORY_REVIEW"
  }

CONSERVATIVE RULE: If a speaker's identity is ambiguous after reading 80
utterances, return "UNKNOWN" with a flag. Never guess.

RETURN — JSON only:
{
  "speaker_map": {
    "spk_000": {
      "display_name": "THE REPORTER",
      "role": "REPORTER",
      "confidence": 0.99,
      "evidence": "Utterance 3: 'Today is 04/30/2026. The time is 1:31 p.m.'",
      "authority": "FORMAL_OPENING_DETECTED"
    },
    "spk_001": {
      "display_name": "THE VIDEOGRAPHER",
      "role": "VIDEOGRAPHER",
      "confidence": 0.97,
      "evidence": "Utterance 1: 'We are on the record.'",
      "authority": "RECORDING_ANNOUNCEMENT"
    },
    "spk_002": {
      "display_name": "MR.  BENTLEY",
      "role": "ATTORNEY",
      "confidence": 0.94,
      "evidence": "Utterance 8: 'Good afternoon. My name is Dennis... I represent the plaintiff.'",
      "authority": "SELF_IDENTIFICATION_PLUS_CASE_METADATA",
      "name_correction_applied": "Maloney → Bentley per case metadata"
    },
    "spk_003": {
      "display_name": "THE WITNESS",
      "role": "WITNESS",
      "confidence": 0.96,
      "evidence": "Utterance 15: 'My name is Mohammad Etminan.'",
      "authority": "SELF_IDENTIFICATION"
    }
  },
  "diarization_issues": [],
  "speakers_unresolved": [],
  "metrics": {
    "speakers_mapped": 4,
    "high_confidence": 4,
    "ambiguous": 0,
    "collapsed_clusters": 0
  }
}

USER:
CASE METADATA:
[CASE_METADATA_JSON]

TRANSCRIPT (first 80 on-record utterances):
[NUMBERED_UTTERANCE_LIST]
```

---

## PROMPT 2-B: MID-DEPOSITION SPEAKER MAP VERIFICATION

**Run only for depositions > 45 minutes or when Engine 0 flagged diarization warnings.**

```
SYSTEM:
You are verifying a speaker map generated from the first 80 utterances.
Speaker numbers in Deepgram can shift after audio breaks, Zoom reconnections,
or device changes. Review the middle section and confirm the map still holds.

CURRENT CONFIRMED MAP: [CURRENT_SPEAKER_MAP_JSON]

SHIFT SIGNALS (indicate the map may have changed):
  - A speaker number that was REPORTER now produces substantive testimony
  - A speaker number that was WITNESS now produces legal questions
  - A new speaker number appears that was not in the first 80 utterances
  - Two previously distinct speaker numbers now produce identical content types

DIARIZATION COLLAPSE (specific to multi-attorney depositions):
  In a deposition with more than 2 attorneys, Deepgram frequently collapses
  attorneys from the same firm into one speaker cluster. Flag if:
  - One cluster produces questions directed to DIFFERENT parties
  - One cluster produces both plaintiff AND defense-style arguments

RETURN — JSON only:
{
  "map_still_valid": true,
  "shifted_speakers": {},
  "new_speakers": {},
  "collapsed_clusters": [],
  "shift_detected_at_utterance": null,
  "confidence": 0.97,
  "evidence": "All speaker patterns consistent with initial map through utterance 450"
}

USER:
CURRENT MAP: [CURRENT_SPEAKER_MAP_JSON]
UTTERANCES [N] THROUGH [M]: [MIDDLE_UTTERANCES]
```

---

## PROMPT 2-C: CONTENT-BASED ATTRIBUTION OVERRIDE

**Runs AFTER human has verified the speaker map.**
**Purpose:** Fix individual utterances where Deepgram's diarization was wrong.

```
SYSTEM:
You are fixing individual utterance misattributions. The overall speaker map
is confirmed. Some specific utterances were assigned to the wrong speaker.

CONFIRMED SPEAKER MAP: [CONFIRMED_SPEAKER_MAP_JSON]

ATTRIBUTION SIGNALS — use content to override diarization:

QUESTION SIGNALS (utterance belongs to EXAMINING ATTORNEY):
  - Ends in "?" AND content is a substantive legal question
  - Contains "Let me ask you...", "Directing your attention to...",
    "I'm going to show you...", "Isn't it true that..."
  - Contains "Pass the witness" or "No further questions"
  - Contains counsel appearances: "My name is [X], I represent..."
  - Begins examination section: "Good afternoon. I'm going to ask you..."

ANSWER SIGNALS (utterance belongs to WITNESS):
  - First-person narrative about personal events
  - Direct factual answers: "Yes", "No", "I don't recall", "Correct"
  - Self-identification in first substantive question
  - Physical sensation descriptions: "I felt pain in...", "I heard..."

REPORTER SIGNALS (utterance belongs to THE REPORTER):
  - Date/time/case opening statements
  - Oath administration
  - On/off record announcements
  - Spelling requests

OBJECTION SIGNALS (utterance belongs to OPPOSING COUNSEL):
  - Begins with "Objection" or any known objection garble
  - "I'm going to object..." / "Note my objection"
  - "We'll reserve for trial"

VERBATIM RULE: Do NOT change any spoken words. Only reassign the speaker label.

RETURN — JSON array (only blocks needing reassignment):
[
  {
    "utterance_index": N,
    "current_speaker_id": "spk_002",
    "correct_speaker_id": "spk_003",
    "correct_display_name": "THE WITNESS",
    "reason": "Content is first-person answer: 'I was driving north on...'",
    "confidence": 0.96,
    "authority": "CONTENT_ANALYSIS"
  }
]

USER:
CONFIRMED MAP: [CONFIRMED_SPEAKER_MAP_JSON]
CASE METADATA: [CASE_METADATA_JSON]

Review these utterances for misattribution:
[UTTERANCES_WITH_POTENTIAL_ATTRIBUTION_ERRORS]
```

---

## PROMPT 2-D: EXAMINATION TRANSITION DETECTION

```
SYSTEM:
Identify every examination phase transition in this deposition.

EXAMINATION PHASES (in order):
  1. EXAMINATION — direct examination by the noticing attorney
  2. CROSS-EXAMINATION — examination by opposing counsel
  3. REDIRECT EXAMINATION — second examination by original examiner
  4. RECROSS-EXAMINATION — second examination by opposing counsel
  (Further phases: RE-REDIRECT, RE-RECROSS as needed)

TRANSITION SIGNALS:
  - "Pass the witness" / "I'll pass the witness" / "Your witness"
  - "No further questions [at this time]"
  - "I have a few questions on cross..."
  - A different attorney begins asking substantive questions

RETURN — JSON:
{
  "transitions": [
    {
      "transition_utterance_index": N,
      "trigger_text": "Pass the witness.",
      "new_phase": "CROSS-EXAMINATION",
      "new_examiner_speaker_id": "spk_004",
      "new_examiner_display_name": "MS.  DURBIN",
      "insert_header_before_utterance_index": N+1,
      "confidence": 0.99
    }
  ]
}

USER:
CONFIRMED MAP: [CONFIRMED_SPEAKER_MAP_JSON]
[ALL_ON_RECORD_UTTERANCES]
```

---

## PIPELINE GATE — HUMAN VERIFICATION REQUIRED

```
After Engine 2 completes:
  1. Display proposed speaker_map in Workspace Speaker Panel
  2. Reporter reviews and edits if needed
  3. Reporter clicks "Confirm Speaker Map"
  4. Set job_config.speaker_map_verified = true
  5. Proceed to Engine 3

Gate timeout behavior:
  - If reporter does not verify in current session:
    Save pipeline state. DO NOT auto-proceed.
    On next session open, resume from this gate.
    Show banner: "Speaker map needs your confirmation before processing continues."

Gate failure behavior:
  - If reporter cannot identify all speakers:
    Allow partial verification. Flag unverified speakers as UNKNOWN.
    Proceed to Engine 3 with unverified speakers rendered as SPEAKER [N].
```

---

## METRICS OUTPUT

```json
{
  "engine": "speaker_resolution_engine",
  "speakers_identified": 5,
  "high_confidence": 4,
  "medium_confidence": 1,
  "ambiguous": 0,
  "diarization_issues": 0,
  "collapsed_clusters": 0,
  "examination_transitions": 2,
  "attribution_overrides": 12,
  "human_verified": true,
  "verification_timestamp": "2026-04-30T13:45:22Z"
}
```

# ENGINE 3 — STRUCTURE ENGINE
# DEPO-PRO AI Transcript Processing Specification v2.0
#
# Stage: After Engine 2 gate is passed (speaker_map_verified = True)
# Module: spec_engine/classifier.py | spec_engine/qa_fixer.py

---

## INPUTS

| Field | Source | Required |
|-------|--------|----------|
| `on_record_utterances` | Engine 1 output | Yes |
| `confirmed_speaker_map` | Engine 2 + human | Yes — gate enforced |
| `examination_transitions` | Engine 2 output | Yes |
| `case_metadata` | job_config.json | Yes |

## OUTPUTS

| Field | Type | Description |
|-------|------|-------------|
| `classified_blocks` | object[] | Each block with type, speaker, text |
| `structure_report` | object | Q/A counts, colloquy counts, flags |
| `conversation_flow_violations` | object[] | Q→Q or A→A sequence errors |
| `metrics` | object | Structure QA metrics |

---

## PROMPT 3-A: BLOCK TYPE CLASSIFICATION

```
SYSTEM:
You are a forensic deposition scopist. Classify each speaker utterance into
exactly one block type.

CONFIRMED SPEAKER MAP: [CONFIRMED_SPEAKER_MAP_JSON]

BLOCK TYPES:

Q — Substantive question from the examining attorney to the witness.
  Requirements: MUST be from a speaker with role ATTORNEY.
  Content signals:
    - Ends in "?" OR is an imperative directed at the witness
      ("Tell me about...", "Describe what you saw...",
       "State your full name for the record.")
    - Directed AT the witness, not at opposing counsel or the reporter
  BY-LINE RULE: When examination resumes after an objection, prepend
    "(BY MR.  [LASTNAME])  " to the first word of the next Q block.
    Do NOT create a separate block — it is PART of the Q block text.
  Format example:
    Q.[TAB](BY MR.  BENTLEY)  Can you explain what happened next?

A — Substantive answer from the witness.
  Requirements: MUST be from a speaker with role WITNESS.
  Any length: single word ("Yes.") through multiple paragraphs.
  Filler words, stutters, and informal speech are preserved exactly.

SP — Speaker label / colloquy. Use for:
  - Reporter statements (openings, oath, on/off record)
  - Attorney objections and their responses
  - Attorney appearances and stipulations
  - Counsel-to-counsel dialogue not directed at witness
  - Videographer announcements
  - Interpreter statements
  - "You can answer" instruction after an objection (append to preceding
    objection SP block — do NOT create a new block)

PN — Parenthetical notation (synthetic or manually inserted). Use for:
  - (The witness was sworn.)
  - (Whereupon, a recess was taken at [time].)
  - (Whereupon, the proceedings resumed at [time].)
  - (Whereupon, [Exhibit N] was marked for identification.)
  - (Reading:) before witness reads a document aloud
  - (In English:) when non-English witness answers in English
  - (Interpreter sworn.)
  - (The witness indicated.)

HEADER — Section header. Use for:
  - EXAMINATION
  - CROSS-EXAMINATION
  - REDIRECT EXAMINATION
  - RECROSS-EXAMINATION
  (Followed immediately by BY [EXAMINER]: on the next line)

NEEDS_SPLIT — Block contains BOTH a question AND an answer merged together.
  Add: "split_point": "exact text where Q ends"

NEEDS_EXTRACT — Block contains an objection embedded inside Q or A.
  Add: "objection_text": "exact objection text", "position": "start|middle|end"

CRITICAL RULES:
  - A block from a REPORTER speaker is NEVER Q or A — always SP
  - A block from a WITNESS speaker is NEVER Q — always A
  - "Yes.", "No.", "Correct.", "I don't recall." from WITNESS are A, never Q
  - Very short answers are A blocks even when trivially brief
  - Do NOT classify pre-record, off-record, or post-record blocks —
    those are already excluded

RETURN — JSON array, one entry per utterance:
[
  {
    "utterance_index": N,
    "utterance_id": "utt_xxx",
    "block_type": "Q|A|SP|PN|HEADER|NEEDS_SPLIT|NEEDS_EXTRACT",
    "speaker_id": "spk_002",
    "display_name": "MR.  BENTLEY",
    "confidence": 0.99
  }
]

USER:
CONFIRMED MAP: [CONFIRMED_SPEAKER_MAP_JSON]

Classify each utterance:
[ON_RECORD_UTTERANCES_WITH_SPEAKER_LABELS]
```

---

## PROMPT 3-B: EMBEDDED Q/A SPLITTING

**Only called for utterances classified as NEEDS_SPLIT.**

```
SYSTEM:
You are a forensic deposition scopist splitting merged Q/A blocks.
Deepgram merged a question and answer into one utterance.

STANDALONE ANSWER TOKENS (these mark where Q ends and A begins):
  Yes | No | Yeah | Yep | Nope | Nah | Correct | Right | Sure |
  Absolutely | Exactly | Certainly | True | False | Agreed | Indeed |
  I do | I did | I was | I wasn't | I have | I haven't | I don't know |
  I don't recall | I'm not sure | I can't say | Not that I recall |
  Not to my knowledge | I believe so | I believe not | I would say so |
  I wouldn't say so | Probably | Possibly | Maybe | I have no idea |
  I have no recollection | Uh-huh | Mm-hmm | That's correct |
  That is correct | I believe so | I'm sorry

DO NOT SPLIT when:
  - The attorney is reading a prior answer back: "And you said yes, correct?"
    (the "yes" is a quote, not a new answer)
  - The question and answer form a continuous legal exchange where splitting
    would be ambiguous — insert [SCOPIST: FLAG N: Possible embedded answer — verify]

VERBATIM RULE: Do NOT change any words. Only identify where the split occurs.

RETURN — JSON array:
[
  {
    "utterance_index": N,
    "utterance_id": "utt_xxx",
    "splits": [
      {
        "block_type": "Q",
        "speaker_id": "spk_002",
        "display_name": "MR.  BENTLEY",
        "text": "exact question text as transcribed"
      },
      {
        "block_type": "A",
        "speaker_id": "spk_003",
        "display_name": "THE WITNESS",
        "text": "exact answer text as transcribed"
      }
    ]
  }
]

USER:
Confirmed examiner: [EXAMINER_DISPLAY_NAME] ([EXAMINER_SPEAKER_ID])
Confirmed witness: THE WITNESS ([WITNESS_SPEAKER_ID])

Split these merged blocks:
[NEEDS_SPLIT_BLOCKS]
```

---

## PROMPT 3-C: OBJECTION EXTRACTION

**Only called for utterances classified as NEEDS_EXTRACT.**

```
SYSTEM:
You are a forensic deposition scopist extracting embedded objections.

CONFIRMED MAP: [CONFIRMED_SPEAKER_MAP_JSON]

OBJECTION IDENTIFICATION — these are always SP blocks from opposing counsel:
  Any text matching these patterns (also accept garbled forms):
  "Objection" / "Injection" / "Infection" / "Protection" / "Perfection" /
  "Detection" / "Dissection" / "Eviction" / "Addiction" / "Deflection" /
  "Definition" / "Perception" — ALL of these → "Objection."
  
  "I'm going to object" / "I'll object" / "Note my objection"
  "Objection to the form" / "Objection as to form"

EXTRACTION POSITION — the objection may appear at:
  start: attorney begins objecting then witness answers
  middle: witness is answering, attorney interrupts
  end: witness answer is complete, attorney objects afterward

POST-OBJECTION BY-LINE:
  After extracting an objection, the next Q block from the examiner must begin:
  "(BY MR.  [LASTNAME])  " prepended to the question text.
  Do NOT create a separate block for the BY-line.

"YOU CAN ANSWER" RULE:
  If "You can answer" / "You may answer" / "Go ahead and answer" follows
  the objection text in the same block, append it to the objection text.
  Do NOT create a separate block for it.

VERBATIM RULE: Preserve exact objection language. "Objection. Form." stays as
spoken even if the basis is stated twice. Do not normalize or combine.

RETURN — JSON array:
[
  {
    "utterance_index": N,
    "utterance_id": "utt_xxx",
    "original_block_type": "Q|A",
    "extracted_objection": {
      "speaker_id": "spk_004",
      "display_name": "MS.  DURBIN",
      "text": "Objection.  Form.  You can answer.",
      "position": "middle"
    },
    "remaining_q_text": "question text with objection removed",
    "remaining_a_text": "answer text with objection removed",
    "insert_by_line_on_next_q": true,
    "next_q_examiner": "MR.  BENTLEY"
  }
]

USER:
[NEEDS_EXTRACT_BLOCKS]
```

---

## PROMPT 3-D: COLLOQUY VERIFICATION

```
SYSTEM:
Review these classified SP blocks and verify they are correctly identified
as colloquy (not testimony). Flag any SP block that should actually be Q or A.

COLLOQUY includes (should remain SP):
  - Attorney-to-attorney logistics not directed at witness
  - Witness being instructed about deposition process
  - Counsel appearances and stipulations
  - Attorney-client privilege instructions
  - Exhibit logistics discussions
  - Reporter spelling requests
  - "You can answer" after objection (append to objection block)

MISCLASSIFIED as SP — these should be Q or A:
  - Attorney asking the witness a substantive question (even if phrased
    as "Let me ask you...") → Q
  - Witness answering with a short factual statement → A
  - "Yes." / "No." / "Correct." in testimony context → A (never SP)

RETURN — only blocks that need reclassification:
[
  {
    "utterance_index": N,
    "current_type": "SP",
    "correct_type": "Q|A",
    "reason": "one sentence",
    "confidence": 0.91
  }
]

USER:
[SP_CLASSIFIED_BLOCKS]
```

---

## PROMPT 3-E: CONVERSATION FLOW VALIDATION

```
SYSTEM:
Verify the classified transcript follows valid deposition conversation flow.
A well-structured deposition follows Q → A → Q → A patterns during examination.

DETECT THESE VIOLATIONS:

TYPE 1 — Double Question (Q → Q without intervening A):
  An attorney asks two questions in a row with no witness answer between them.
  EXCEPTION: Compound questions where the second "question" is actually a
  clarification mid-sentence ("Did you see the car — the red car, I mean?")
  If GENUINE violation: flag for scopist review — may indicate missed utterance.

TYPE 2 — Double Answer (A → A without intervening Q):
  Witness gives two separate answers with no attorney question between them.
  EXCEPTION: Witness continues a long answer across multiple Deepgram utterances.
  If GENUINE violation: Deepgram may have missed an attorney question — flag.

TYPE 3 — Answer Before First Question:
  A block is classified A but appears before any Q block in that examination section.
  This indicates a classification error — the "answer" is likely colloquy or the
  opening block of the examination.

RETURN — JSON:
{
  "violations": [
    {
      "violation_type": "DOUBLE_QUESTION|DOUBLE_ANSWER|ANSWER_BEFORE_QUESTION",
      "utterance_indices": [N, N+1],
      "severity": "error|warning",
      "auto_fixable": false,
      "flag_text": "[SCOPIST: FLAG N: Possible missing utterance between blocks N and N+1 — verify from audio]"
    }
  ],
  "flow_valid": true,
  "metrics": {
    "total_qa_pairs": 147,
    "violations_found": 2,
    "auto_fixed": 0,
    "flags_inserted": 2
  }
}

USER:
[ALL_CLASSIFIED_BLOCKS_IN_ORDER]
```

---

## FRAGMENT MERGING (Deterministic — No AI)

After all classification prompts complete, the engine runs a deterministic
fragment merge pass. No AI needed — this is pure structural logic.

```python
def merge_consecutive_fragments(classified_blocks: list) -> list:
    """
    Merge consecutive blocks with SAME speaker AND SAME type where the
    first block does not end in a complete sentence.
    
    MERGE WHEN:
      - Same speaker_id AND same block_type
      - First block does NOT end in . ? or !
      - Combined text forms a single coherent utterance
      - Neither block is a standalone answer token alone
    
    DO NOT MERGE WHEN:
      - First block ends in . ? or !  (it is complete)
      - Blocks are different types
      - Blocks are different speakers
      - Second block begins a new question or new topic
    
    DUPLICATE REMOVAL:
      If two consecutive IDENTICAL blocks exist (same speaker, same words,
      length >= 4 chars), keep only the first — the second is a Deepgram artifact.
      Short words (I, so, he, we, no, to) are NEVER removed even if duplicated.
    """
```

---

## METRICS OUTPUT

```json
{
  "engine": "structure_engine",
  "total_blocks_classified": 1083,
  "q_blocks": 203,
  "a_blocks": 198,
  "sp_blocks": 87,
  "pn_blocks": 12,
  "header_blocks": 4,
  "blocks_split": 23,
  "objections_extracted": 14,
  "fragments_merged": 41,
  "duplicates_removed": 7,
  "flow_violations": 2,
  "flags_inserted": 2
}
```

---
---

# ENGINE 4A — METADATA CORRECTION ENGINE
# Stage: After Engine 3 — operates on classified blocks
# Purpose: Fix structural identifiers only. No testimony content touched.
# Module: spec_engine/corrections.py (MULTIWORD_CORRECTIONS + UNIVERSAL_CORRECTIONS)
# THIS ENGINE IS ENTIRELY DETERMINISTIC — NO AI CALLS

---

## CORRECTIONS APPLIED (all regex, no AI)

### Reporter Credentials
```python
REPORTER_NAME_GARBLES = [
    # Input pattern → Correct output
    (r'\bMia\s+Bardo\b',       'Miah Bardot'),
    (r'\bMia\s+Bardell\b',     'Miah Bardot'),
    (r'\bMia\s+Bordeau\b',     'Miah Bardot'),
    (r'\bMia\s+Bardeau\b',     'Miah Bardot'),
    (r'\bLea\s+Bardot\b',      'Miah Bardot'),
    (r'\bLea\s+Bardeau\b',     'Miah Bardot'),
    (r'\bNeobardeau\b',        'Miah Bardot'),
    (r'\bMiyamardeau\b',       'Miah Bardot'),
    (r'\bcourt\s+for\s+a\s+license',  'court reporter, licensed'),
    (r'\bcourt\s+border\b',    'court reporter'),
]

CSR_NUMBER_GARBLES = [
    (r'\bnumber\s+1200129\b',           'CSR No. 12129'),
    (r'\bnumber\s+twelve\s+one\s+two\s+nine\b',  'CSR No. 12129'),
    (r'\b(CSR\s+No\.\s+\d{4,6})\.\s+\d\b',  r'\1'),  # Remove trailing artifact
]
```

### Oath and Procedural Phrases
```python
OATH_GARBLES = [
    (r'\bso\s+happy\s+God\b',          'so help you God'),
    (r'\bso\s+help\s+you\s+guide\b',   'so help you God'),
    (r'\bshall\s+help\s+you\s+God\b',  'so help you God'),
    (r'\bpenalty\s+of\s+curtory\b',     'penalty of perjury'),
    (r'\bpenalty\s+of\s+cursory\b',     'penalty of perjury'),
    (r'\bremote\s+storing\b',           'remote swearing'),
    (r'\bmouth\s+swearing\b',           'remote swearing'),
    (r'\byour\s+remit\s+for\s+this\b', 'your agreement for this'),
    (r'\bnotice\s+and\s+attorney\b',    'noticing attorney'),
    (r'^They\s+do\.$',                  'I do.'),  # Oath response — standalone block only
    (r'\bsame\s+effect\s+as\s+a\s+weapon\s+in\s+the\s+courthouse\b',
     'same force and effect as if given in open court'),
]
```

### Case Number Formatting
```python
# Context-scoped: only fires after "Cause Number" or "Cause No."
CAUSE_NUMBER_PATTERN = re.compile(
    r'(\b(?:Cause\s+No\.?|Cause\s+Number|cause\s+number)\s+)(\d{2}),(\d{3,5})\b',
    re.IGNORECASE
)
# Replaces: "Cause Number 2025,CI23267" → "Cause Number 2025-CI-23267"

COURT_LABEL_GARBLES = [
    (r'\bBear\s+County\b',   'Bexar County'),   # Texas-specific
    (r'\bBurr\s+County\b',   'Bexar County'),
    (r'\bcost\s+number\b',   'cause number'),
    (r'\bcop\s+number\b',    'cause number'),
]
```

### Pass the Witness
```python
PASS_WITNESS_GARBLES = [
    (r'\bpast\s+witness\b',   'Pass the witness.'),
    (r'\bpastor\s+witness\b', 'Pass the witness.'),
    (r'\bpast\s+away\b(?!\s+\w)',  'Pass the witness.'),
]
```

**OUTPUT per correction:**
```json
{
  "word_id": "wrd_xxx",
  "original": "Mia Bardo",
  "corrected": "Miah Bardot",
  "confidence": 1.0,
  "authority": "DETERMINISTIC_REGISTRY",
  "rule_id": "REPORTER_NAME_GARBLE",
  "evidence": "Pattern match: /\\bMia\\s+Bardo\\b/"
}
```

---

# ENGINE 4B — CONFIRMED SPELLINGS ENGINE
# Entirely deterministic. No AI. Applies human-curated corrections.

```python
def apply_confirmed_spellings(blocks, confirmed_spellings, cutoff_index):
    """
    Apply only to blocks BEFORE cutoff_index (the spelling session position).
    Never apply to the spelling session itself or blocks after it.
    
    confirmed_spellings: dict from Engine 1-D output
      {"Caram": "Karam", "Dunnill": "Dunnell", "Chrestman": "Chrisman"}
    
    Matching: exact string match, case-insensitive.
    Partial match safety: "Karam" does NOT match "Karamzade" — require
    word boundary check (\b) on both sides of the match.
    """
```

**OUTPUT per correction:**
```json
{
  "word_id": "wrd_xxx",
  "original": "Caram",
  "corrected": "Karam",
  "confidence": 1.0,
  "authority": "CONFIRMED_SPELLING",
  "evidence": "Confirmed on record at utterance 847 by court reporter",
  "applies_through_utterance": 846
}
```

---

# ENGINE 4C — LEGAL PHRASE ENGINE
# Deterministic patterns for legal terminology. No AI.

```python
OBJECTION_GARBLE_MAP = {
    # Only applied to SP blocks classified as objections
    # NEVER applied to Q or A blocks
    "Injection form": "Objection.  Form.",
    "Infection form": "Objection.  Form.",
    "Direction form": "Objection.  Form.",
    "Objection. Ford.": "Objection.  Form.",
    "Objection. Four.": "Objection.  Form.",     # Confirmed Etminan garble
    "Exit form": "Objection.  Form.",
    "Action form": "Objection.  Form.",
    "Action point": "Objection.  Form.",
    "Injection": "Objection.",
    "Infection": "Objection.",
    "Protection": "Objection.",
    "Perfection": "Objection.",
    "Detection": "Objection.",
    "Dissection": "Objection.",
    "Eviction": "Objection.",
    "Addiction": "Objection.",
    "Deflection": "Objection.",
    "Definition": "Objection.",
    "Perception": "Objection.",
    # Objection type standardization (two spaces between sentence and basis)
    "Objection. Form.": "Objection.  Form.",
    "Objection. Nonresponsive.": "Objection.  Nonresponsive.",
    "Objection. Hearsay.": "Objection.  Hearsay.",
    "Objection. Speculation.": "Objection.  Speculation.",
    "Objection. Foundation.": "Objection.  Foundation.",
    "Objection. Leading.": "Objection.  Leading.",
    "Bleeding.": "Leading.",          # Alternate garble for "Leading"
    "Leaving.": "Leading.",
}
```

---

# ENGINE 4D — MEDICAL PHRASE ENGINE
# Deterministic dictionary. No AI.
# Only active when case_type includes medical claims.

```python
MEDICAL_GARBLES = {
    "polyhydraminose": "polyhydramnios",
    "polyhydramine": "polyhydramnios",
    "polyhydraminosis": "polyhydramnios",
    "microsomia": "macrosomia",   # Common reversal in obstetric cases
    "LNP": "LMP",
    "3 hour GPT": "3-hour GTT",
    "thecal sac": "thecal sac",   # Preserve correct form
    "theca sac": "thecal sac",
    "thick hole sack": "thecal sac",
    "neuro foraminal": "neuroforaminal",
    "new row foraminal": "neuroforaminal",
    "radiculop athy": "radiculopathy",
    "cervical gia": "cervicalgia",
    "lumbar face ets": "lumbar facets",
    "face et loading": "facet loading",
    "sub acromial bursa": "subacromial bursa",
    "sub deltoid bursitis": "subdeltoid bursitis",
    "annular disc bulge": "annular disc bulge",   # Preserve correct form
    "inter vertebral disc": "intervertebral disc",
    "disc herniation": "disc herniation",
    "degenerative disc disease": "degenerative disc disease",
    "curriculum of IT": "curriculum vitae",
    "curriculum of a tea": "curriculum vitae",
}
```

---

# ENGINE 4E — AI CONTEXTUAL CORRECTION ENGINE
# AI CALL — handles what 4A-4D cannot resolve deterministically
# Uses the FOUR-TEST VERBATIM MANDATE as the gate for every suggestion

```
SYSTEM:
You are a forensic deposition scopist. The deterministic engines have already
handled structural identifiers, confirmed spellings, and known garble patterns.
Your task is to resolve ONLY the remaining ambiguous tokens that require
contextual understanding.

THE FOUR-TEST VERBATIM MANDATE — A correction is only permitted if ALL FOUR
tests pass. If ANY test fails, return the token unchanged with a FLAG:

  TEST 1: Is this clearly a speech-to-text artifact (not what was spoken)?
  TEST 2: Is the intended word/phrase unambiguous from context?
  TEST 3: Does the correction NOT alter testimony meaning or substance?
  TEST 4: Would any competent scopist make this same correction without hesitation?

VERBATIM PROTECTED — NEVER CORRECT THESE:
  uh, um, ah, like, you know, I mean, basically, so, well
  uh-huh, uh-uh, mm-hmm, yeah, yep, nope, nah
  gonna, kinda, wanna, gotta, lemme, y'all
  Grammatical errors in witness testimony
  Profanity (preserve exactly as spoken)
  Stutters and false starts (I -- I, the -- the)
  Any testimony word where you are not 100% certain

PERMITTED CORRECTIONS (only with all four tests passing):
  - Medical terminology garbles not caught by Engine 4D
  - Legal phrase garbles not caught by Engine 4C
  - Proper names from case metadata where garble is phonetically obvious
  - Technical terminology specific to the case type

CONFIDENCE LEVELS:
  >= 0.92: Return correction with auto_apply: true
  0.85-0.91: Return correction with auto_apply: false (Miah reviews)
  < 0.85: Return FLAG only, no correction

MONEY AMOUNT FLAG RULE (NEW):
  Any dollar amount under $50 in a professional fee or salary context
  MUST be flagged — it is likely a decimal-shift ASR error:
  [SCOPIST: FLAG N: Verify amount — "$7.50" may be "$750" — verify from audio]

RETURN — JSON:
{
  "suggestions": [
    {
      "word_id": "wrd_xxx",
      "utterance_id": "utt_xxx",
      "original": "raiding",
      "suggestion": "radiating",
      "confidence": 0.96,
      "auto_apply": true,
      "reason": "Context: 'pain was raiding down my leg' — 'radiating' is the only sensible medical term",
      "authority": "CONTEXTUAL_MEDICAL_TERM",
      "four_tests": {
        "test_1_artifact": true,
        "test_2_unambiguous": true,
        "test_3_no_meaning_change": true,
        "test_4_scopist_agrees": true
      }
    }
  ],
  "flags": [
    {
      "word_id": "wrd_yyy",
      "utterance_id": "utt_yyy",
      "original": "$7.50",
      "flag_text": "[SCOPIST: FLAG N: Verify amount — '$7.50' may be '$750' — verify from audio]",
      "reason": "Dollar amount under $50 in salary context — likely decimal-shift error"
    }
  ],
  "metrics": {
    "tokens_reviewed": 48,
    "auto_apply": 31,
    "human_review": 12,
    "flags_only": 5
  }
}

USER:
CASE METADATA: [CASE_METADATA_JSON]
CASE TYPE: [CASE_TYPE]
CONFIRMED SPELLINGS ALREADY APPLIED: [CONFIRMED_SPELLINGS_LIST]

Flagged tokens needing contextual review:
[AMBIGUOUS_TOKENS_WITH_CONTEXT]
```

---

# ENGINE 4F — SCOPIST FLAG ENGINE
# Deterministic rules + outputs from 4E. Generates all remaining flags.

```python
FLAG_CATEGORIES = {
    "VERIFY_SPELLING": "Verify spelling of '{garbled}' — likely '{guess}'",
    "VERIFY_AUDIO": "Verify from audio — '{phrase}' is unclear",
    "VERIFY_SPEAKER": "Verify speaker — this block may be {speaker_a} or {speaker_b}",
    "CONFLICT": "Conflict — '{fact}' stated as '{v1}' at block {x} and '{v2}' at block {y}",
    "INAUDIBLE": "Inaudible — verify from audio",
    "VERIFY_CASE_FILE": "Verify — transcript shows '{x}', NOD shows '{y}'",
    "MONEY_AMOUNT": "Verify amount — '{amount}' may be '{corrected}' — verify from audio",
    "DIARIZATION": "Verify speaker — diarization collapse detected in this section",
    "DATE_DISCREPANCY": "Verify date — '{date_1}' at block {x} conflicts with '{date_2}' at block {y}",
}

FLAG_FORMAT = "[SCOPIST: FLAG {N}: {category} — {description}]"
```

---

## METRICS OUTPUT (Engines 4A-4F combined)

```json
{
  "engine": "correction_engines",
  "4a_metadata_corrections": 31,
  "4b_confirmed_spelling_corrections": 18,
  "4c_legal_phrase_corrections": 22,
  "4d_medical_corrections": 9,
  "4e_ai_corrections": {
    "reviewed": 48,
    "auto_applied": 31,
    "pending_review": 12,
    "flagged_only": 5
  },
  "4f_scopist_flags_generated": 8,
  "total_corrections": 111,
  "verbatim_violations_detected": 0
}
```

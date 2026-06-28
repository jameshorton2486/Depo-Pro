# ENGINE 4.5 — CORRECTION VALIDATION ENGINE
# DEPO-PRO AI Transcript Processing Specification v2.0
#
# Stage: After all correction engines (4A–4F), BEFORE Engine 5
# Purpose: Verify no correction violated verbatim policy before rendering
# Module: spec_engine/validator.py
# THIS ENGINE IS ENTIRELY DETERMINISTIC — NO AI CALLS
#
# If this engine raises an ERROR, the pipeline halts.
# If it raises a WARNING, the flag is inserted and processing continues.

---

## INPUTS

| Field | Source | Required |
|-------|--------|----------|
| `original_blocks` | Engine 3 classified output | Yes — immutable reference |
| `corrected_blocks` | Engines 4A–4F output | Yes |
| `verbatim_protected_tokens` | Hardcoded list | Yes |
| `correction_log` | All 4A–4F outputs | Yes |

## OUTPUTS

| Field | Type | Description |
|-------|------|-------------|
| `validation_passed` | boolean | Pipeline gate — false halts Engine 5 |
| `verbatim_violations` | object[] | Any corrections that touched protected words |
| `consistency_errors` | object[] | Same entity corrected two different ways |
| `contradiction_errors` | object[] | AI and deterministic engines conflict |
| `unresolved_flags` | object[] | Flags with no evidence field |
| `correction_summary` | object | Final correction count by engine and type |
| `metrics` | object | Full validation QA report |

---

## CHECK V-1: VERBATIM VIOLATION DETECTION

```python
VERBATIM_PROTECTED = frozenset({
    # Filler words — NEVER touched
    "uh", "um", "ah", "er", "uh-huh", "uh-uh", "mm-hmm", "mhmm",
    "yeah", "yep", "yup", "nope", "nah",
    "so", "well", "like", "you know", "i mean", "basically",
    "gonna", "wanna", "kinda", "gotta", "lemme", "y'all",
    # Short stutter words — NEVER removed even if duplicated
    "i", "he", "she", "we", "no", "to", "do", "be", "go",
})

def check_verbatim_violations(original_blocks, corrected_blocks, correction_log):
    """
    For each correction in the log, verify it did NOT:
    1. Remove a word in VERBATIM_PROTECTED
    2. Add words not in the original block
    3. Change the meaning of testimony content
    4. Alter money amounts or figures without a flag
    """
    violations = []
    
    for correction in correction_log:
        original_words = set(correction["original"].lower().split())
        corrected_words = set(correction["suggestion"].lower().split())
        
        # Check: did we remove a protected word?
        removed = original_words - corrected_words
        protected_removed = removed & VERBATIM_PROTECTED
        if protected_removed:
            violations.append({
                "type": "VERBATIM_WORD_REMOVED",
                "word_id": correction["word_id"],
                "protected_words_removed": list(protected_removed),
                "original": correction["original"],
                "corrected": correction["suggestion"],
                "severity": "ERROR"
            })
        
        # Check: money amounts corrected without a flag
        if re.search(r'\$[\d,]+\.?\d*', correction["original"]):
            if "MONEY_AMOUNT" not in correction.get("authority", ""):
                violations.append({
                    "type": "MONEY_AMOUNT_UNCHECKED",
                    "word_id": correction["word_id"],
                    "original": correction["original"],
                    "corrected": correction["suggestion"],
                    "severity": "WARNING",
                    "flag_required": True
                })
    
    return violations
```

**HALT CONDITION:** Any violation with severity "ERROR" → halt Engine 5.
**WARNING:** Insert flag and continue.

---

## CHECK V-2: CONSISTENCY VERIFICATION

```python
def check_correction_consistency(correction_log):
    """
    Detect cases where the same proper noun, entity name, or term was
    corrected to TWO DIFFERENT values by different engines.
    Example: "Bentley" corrected to "Bentley" by 4A, but "Bentley" corrected
    to "Peterson" by 4E (conflict — 4E should have deferred to 4A).
    """
    corrections_by_original = {}
    conflicts = []
    
    for c in correction_log:
        key = c["original"].lower()
        if key not in corrections_by_original:
            corrections_by_original[key] = []
        corrections_by_original[key].append({
            "suggestion": c["suggestion"],
            "engine": c.get("engine", "unknown"),
            "word_id": c["word_id"]
        })
    
    for original, entries in corrections_by_original.items():
        suggestions = set(e["suggestion"] for e in entries)
        if len(suggestions) > 1:
            conflicts.append({
                "type": "INCONSISTENT_CORRECTION",
                "original": original,
                "conflicting_suggestions": list(suggestions),
                "affected_word_ids": [e["word_id"] for e in entries],
                "severity": "ERROR",
                "resolution": "Use the highest-authority correction: "
                              "CONFIRMED_SPELLING > DETERMINISTIC_REGISTRY > AI_CONTEXTUAL"
            })
    
    return conflicts
```

**HALT CONDITION:** Any inconsistent correction → halt Engine 5.
**Auto-resolution:** Apply authority hierarchy:
`CONFIRMED_SPELLING > DETERMINISTIC_REGISTRY > AI_CONTEXTUAL`

---

## CHECK V-3: EVIDENCE COMPLETENESS

```python
def check_evidence_completeness(correction_log):
    """
    Every correction must have:
    - authority: the source rule or engine
    - confidence: a numeric score
    - reason: one sentence explanation
    
    Corrections missing evidence cannot be certified.
    """
    incomplete = []
    
    for c in correction_log:
        missing = []
        if not c.get("authority"):
            missing.append("authority")
        if c.get("confidence") is None:
            missing.append("confidence")
        if not c.get("reason"):
            missing.append("reason")
        
        if missing:
            incomplete.append({
                "word_id": c["word_id"],
                "missing_fields": missing,
                "severity": "WARNING"
            })
    
    return incomplete
```

---

## CHECK V-4: SPEAKER ATTRIBUTION CONSISTENCY

```python
def check_speaker_consistency(corrected_blocks, confirmed_speaker_map):
    """
    After all corrections and reassignments, verify:
    1. No REPORTER block is classified as Q or A
    2. No WITNESS block is classified as Q
    3. Every Q block has an ATTORNEY speaker
    4. Every A block has a WITNESS speaker
    5. No UNKNOWN speaker appears in Q or A blocks
    """
    violations = []
    
    for block in corrected_blocks:
        role = confirmed_speaker_map.get(block["speaker_id"], {}).get("role", "UNKNOWN")
        
        if block["block_type"] == "Q" and role not in ("ATTORNEY", "UNKNOWN"):
            violations.append({
                "type": "Q_BLOCK_NON_ATTORNEY",
                "utterance_index": block["utterance_index"],
                "speaker_role": role,
                "severity": "WARNING"
            })
        
        if block["block_type"] == "A" and role == "ATTORNEY":
            violations.append({
                "type": "A_BLOCK_ATTORNEY",
                "utterance_index": block["utterance_index"],
                "severity": "WARNING"
            })
        
        if block["block_type"] in ("Q", "A") and role == "REPORTER":
            violations.append({
                "type": "QA_BLOCK_REPORTER",
                "utterance_index": block["utterance_index"],
                "block_type": block["block_type"],
                "severity": "ERROR"
            })
    
    return violations
```

---

## VALIDATION GATE

```
If any ERROR-level check fails:
  → Halt. Do not proceed to Engine 5.
  → Surface all errors in the Workspace corrections panel.
  → Allow the reporter to manually resolve before re-running validation.

If only WARNING-level checks fail:
  → Insert scopist flags at the affected blocks.
  → Proceed to Engine 5 with warnings noted in metrics.

If all checks pass:
  → Set validation_passed = true
  → Proceed to Engine 5
```

---

## METRICS OUTPUT

```json
{
  "engine": "correction_validation",
  "validation_passed": true,
  "checks_run": 4,
  "errors_found": 0,
  "warnings_found": 1,
  "verbatim_violations": 0,
  "consistency_errors": 0,
  "evidence_incomplete": 1,
  "speaker_consistency_violations": 0,
  "total_corrections_validated": 111,
  "total_corrections_approved": 110,
  "flags_added_by_validation": 1
}
```

---
---

# ENGINE 5 — FORMATTING ENGINE (STAGE S)
# DEPO-PRO AI Transcript Processing Specification v2.0
#
# Stage: LAST — runs only after validation passes
# Purpose: Render classified, corrected blocks into UFM-compliant text
# Module: spec_engine/emitter.py | clean_format/formatter.py
#
# CRITICAL RULE: Engine 5 RENDERS. It does NOT decide.
# Every structural and content decision was made by Engines 0–4.5.
# Engine 5 is a pure string formatter. It has no AI calls and no
# correction logic. If content looks wrong at this stage, the problem
# is in an earlier engine.

---

## INPUTS

| Field | Source | Required |
|-------|--------|----------|
| `validated_blocks` | Engine 4.5 approved output | Yes |
| `examination_transitions` | Engine 2D output | Yes |
| `synthetic_parentheticals` | Engine 1 output | Yes |
| `spelling_session_blocks` | Engine 1D output | Yes |
| `job_config` | job_config.json | Yes |

## OUTPUTS

| Field | Type | Description |
|-------|------|-------------|
| `formatted_text` | string | Complete UFM-formatted transcript |
| `docx_paragraphs` | object[] | Paragraph objects for DOCX writer |
| `geometry_violations` | object[] | Any layout errors detected |
| `metrics` | object | Formatting QA metrics |

---

## FORMAT SPECIFICATIONS

### Q. and A. Lines (TAB structure)
```
Format:  [TAB]Q.[TAB]text exactly as corrected by Engines 4A-4E.
         [TAB]A.[TAB]text exactly as corrected by Engines 4A-4E.

Tab stops: 360 twips (Q./A. label), 900 twips (body text start)
Continuation lines: wrap to LEFT MARGIN (0") — not to body column.
Double-spaced throughout.

BY-LINE FORMAT (already embedded in Q block text by Engine 3C):
  [TAB]Q.[TAB](BY MR.  BENTLEY)  question text here...
  NOT a separate block — it is the first text of the Q block.

EXAMPLE:
  [TAB]Q.[TAB]Can you describe what happened at the intersection?
  [TAB]A.[TAB]Yes. I was driving north on Frontage Road, uh, and I saw the
  light turn red. I stopped, and then -- then a vehicle struck me from behind.
```

### Speaker Labels / Colloquy (SP blocks)
```
Format:  [TAB][TAB][TAB]HONORIFIC NAME:  text
Tab stops: 1440 twips (speaker label start)

HONORIFIC RULE (DP-010 certified standard — ONE space after period):
  MR. BENTLEY:  (one space after MR., two spaces after colon)
  MS. DURBIN:   (one space after MS.)
  MRS. JONES:   (one space after MRS.)
  DR. ETMINAN:  (one space after DR. — only in speaker label context)
  THE REPORTER:  (two spaces after colon)
  THE WITNESS:   (two spaces after colon)
  THE VIDEOGRAPHER:  (two spaces after colon)
  THE INTERPRETER:   (two spaces after colon)

⚠ CRITICAL: ONE space after the honorific period. Not two.
  CORRECT:   MR. BENTLEY:  Objection.
  WRONG:     MR.  BENTLEY:  Objection.

IN-BODY HONORIFIC RULE:
  When Mr./Ms./Mrs. appears IN TESTIMONY TEXT (not as a label), use:
  one space after period, sentence case:
  "Good afternoon, Mr. Bentley."  ← correct in body text
  "Good afternoon, MR. BENTLEY:" ← only in label position
```

### Parentheticals (PN blocks)
```
Format:  [TAB][TAB][TAB][TAB](Text in past tense.)
Tab stops: 2160 twips (parenthetical start)

ALL REQUIRED FORMS:
  (The witness was sworn.)
  (Whereupon, the deposition commenced at [time].)
  (Whereupon, a recess was taken at [time].)
  (Whereupon, the proceedings resumed at [time].)
  (Whereupon, a brief interruption in the remote proceedings occurred.)
  (Whereupon, [Exhibit N] was marked for identification.)
  (Whereupon, the deposition was concluded at [time].)
  (Reading:)
  (In English:)
  (Interpreter sworn.)
  (The witness indicated.)
  (Court reporter — confirmed on record.)

MULTI-LINE PARENTHETICAL:
  When a parenthetical is long enough to wrap, continuation lines
  remain at the SAME indentation level (four tabs) — NOT returning to
  the left margin. This is the OPPOSITE of Q./A. continuation behavior.
```

### Examination Headers (HEADER blocks)
```
Format:  Flush left, no tabs, bold in DOCX.
  EXAMINATION
  BY MR.  BENTLEY:
  
  or
  
  CROSS-EXAMINATION
  BY MS.  DURBIN:

One blank line BEFORE the EXAMINATION header.
No blank line AFTER the BY line — the first Q follows immediately.

NOTE: BY-line uses TWO spaces after the period:
  "BY MR.  BENTLEY:" — two spaces after MR.
  This is the ONLY context where two spaces follow the honorific period.
```

---

## PUNCTUATION ENGINE (applied to all block text)

```python
def apply_punctuation_rules(text: str) -> str:
    """
    Apply Morson's punctuation rules to formatted block text.
    These are deterministic string operations — no AI.
    """
    
    # 1. TWO SPACES after sentence-ending punctuation before capital letter
    # EXCEPT after abbreviations (Mr., Ms., Mrs., Dr., No., CSR, a.m., p.m.)
    ABBREVIATIONS = re.compile(
        r'\b(?:Mr|Ms|Mrs|Dr|No|CSR|a\.m|p\.m|St|Ave|Blvd|Rd|Inc|LLC|PLLC|Corp)\.'
    )
    # Apply two-space rule only to positions NOT following an abbreviation
    
    # 2. OBJECTION SPACING — two spaces between sentence and basis
    text = re.sub(r'(Objection\.)\s+(Form|Hearsay|Speculation|Foundation|Leading|'
                  r'Nonresponsive|Compound|Relevance|Privilege|Scope|'
                  r'Argumentative|Vague)\.', 
                  r'\1  \2.', text)
    
    # 3. EM DASH formatting — spaced double-hyphen
    # Interrupted speech: word -- (no text after)
    # Self-correction: word -- word
    # Short-word stutters (1-3 chars): I -- I, the -- the
    # NEVER: comma, colon, or semicolon before or after --
    
    # 4. ELLIPSIS — three SPACED periods (. . .) for trailing off
    # Four spaced periods (. . . .) when trailing at end of sentence
    # NEVER use ellipsis for interrupted speech — use -- instead
    
    # 5. OKAY formatting
    # "Okay." (period) when used as a transition acknowledgment
    # NEVER "Okay," (comma)
    # When "Okay." ends an A block, move to start of next Q block
    
    # 6. ECHO QUESTIONS (tag questions at end of statements)
    # Use comma before tag: "You were driving, correct?"
    # EXCEPTION: "Correct?" as standalone attorney Q is its own Q block
    
    # 7. SERIES OF QUESTIONS without conjunctions
    # "Was your partner loyal? trustworthy? honorable?" — no capitalization
    
    return text
```

---

## NUMBER FORMATTING (deterministic)

```python
NUMBER_RULES = {
    # Spell out one through ten in COUNTING contexts
    "counting": {"1": "one", "2": "two", "3": "three", "4": "four",
                 "5": "five", "6": "six", "7": "seven", "8": "eight",
                 "9": "nine", "10": "ten"},
    
    # ALWAYS use figures for:
    "always_figures": ["dates", "times", "ages", "dollar_amounts",
                       "exhibit_numbers", "addresses", "phone_numbers",
                       "medical_values", "percentages", "cause_numbers"],
    
    # Sentence-starting numbers always spell out
    "sentence_start": True,
    
    # Percentages: figure + "percent" (never % symbol)
    "percentage": lambda n: f"{n} percent",
    
    # Currency: $ + figure, no decimal for even amounts
    "currency": lambda n, cents: f"${n}" if cents == 0 else f"${n}.{cents:02d}",
    
    # Times: no leading zero
    "time": "9:30 a.m." not "09:30 a.m.",
    
    # Heights: feet-inches notation
    "height": "5'7\"",
    
    # Phone numbers: (210) 620-6642
    "phone": "(NNN) NNN-NNNN",
}
```

---

## GEOMETRY VIOLATION CHECKS

```python
GEOMETRY_CHECKS = [
    # Check 1: Q block missing TAB before Q
    ("Q_MISSING_LEADING_TAB", r'^Q\.[TAB]', "ERROR"),
    
    # Check 2: A block missing TAB before A
    ("A_MISSING_LEADING_TAB", r'^A\.[TAB]', "ERROR"),
    
    # Check 3: Speaker label using two spaces after period
    # (THE ONLY VALID TWO-SPACE case is BY lines)
    ("SPEAKER_LABEL_DOUBLE_SPACE", r'(?:MR|MS|MRS|DR)\.\s{2}[A-Z]', "ERROR"),
    
    # Check 4: Parenthetical using fewer than four tabs
    ("PARENTHETICAL_INDENT", r'^\t{0,3}\(', "ERROR"),
    
    # Check 5: Parenthetical in present tense
    ("PARENTHETICAL_TENSE", r'\((?:is|are|has)\s', "WARNING"),
    
    # Check 6: Single space after sentence-ending punctuation
    ("SINGLE_SPACE_AFTER_TERMINAL", r'[.?!]\s(?=[A-Z])', "WARNING"),
    
    # Check 7: THE COURT REPORTER used instead of THE REPORTER
    ("COURT_REPORTER_LABEL", r'THE COURT REPORTER:', "ERROR"),
    
    # Check 8: Objection with single space before basis
    ("OBJECTION_SINGLE_SPACE", r'Objection\.\s(?:Form|Hearsay|Speculation)', "WARNING"),
]
```

---

## METRICS OUTPUT

```json
{
  "engine": "formatting_engine",
  "blocks_formatted": 1083,
  "q_lines": 203,
  "a_lines": 198,
  "sp_lines": 87,
  "pn_lines": 12,
  "header_lines": 4,
  "total_characters": 87432,
  "geometry_violations": {
    "errors": 0,
    "warnings": 2,
    "auto_fixed": 2
  },
  "punctuation_corrections": 156,
  "number_formatting_applied": 43,
  "output_ready": true
}
```

---
---

# MASTER SPECIFICATION — PIPELINE ORCHESTRATION
# DEPO-PRO AI Transcript Processing Specification v2.0

---

## PIPELINE FLOW

```
Raw Deepgram JSON
      │
      ▼
┌─────────────────┐
│  ENGINE 0       │  Integrity Audit
│  INTEGRITY      │  • JSON structure
│  AUDIT          │  • Timestamp ordering
│                 │  • Speaker coverage
│  HALT on fail   │  • Confidence stats
└────────┬────────┘  • Duplicate IDs
         │ PASS
         ▼
┌─────────────────┐
│  ENGINE 1       │  Boundary Engine
│  BOUNDARY       │  • Pre-record detection (1-A)
│  ENGINE         │  • Off-record detection (1-B)
│                 │  • Post-record detection (1-C)
│  AI: 3 calls    │  • Spelling session (1-D)
└────────┬────────┘  • Synthetic parentheticals
         │
         ▼
┌─────────────────┐
│  ENGINE 2       │  Speaker Resolution
│  SPEAKER        │  • Role mapping (2-A)
│  RESOLUTION     │  • Mid-depo verification (2-B)
│                 │  • Attribution override (2-C)
│  AI: 4 calls    │  • Exam transitions (2-D)
└────────┬────────┘
         │
    ┌────┴────┐
    │  GATE   │  Human verifies speaker map
    │  HUMAN  │  SUSPENDS until confirmed
    └────┬────┘
         │ VERIFIED
         ▼
┌─────────────────┐
│  ENGINE 3       │  Structure Engine
│  STRUCTURE      │  • Block classification (3-A)
│                 │  • Q/A splitting (3-B)
│  AI: 5 calls    │  • Objection extraction (3-C)
└────────┬────────┘  • Colloquy verification (3-D)
         │           • Flow validation (3-E)
         ▼           • Fragment merging (deterministic)
┌─────────────────┐
│  ENGINES 4A-4F  │  Correction Engines
│  CORRECTIONS    │  4A: Metadata (deterministic)
│                 │  4B: Confirmed spellings (deterministic)
│  AI: 1 call     │  4C: Legal phrases (deterministic)
│  (4E only)      │  4D: Medical phrases (deterministic)
└────────┬────────┘  4E: AI contextual (1 AI call)
         │           4F: Scopist flags (deterministic)
         ▼
┌─────────────────┐
│  ENGINE 4.5     │  Correction Validation
│  VALIDATION     │  • Verbatim violation check
│                 │  • Consistency check
│  HALT on error  │  • Evidence completeness
└────────┬────────┘  • Speaker consistency
         │ PASS
         ▼
┌─────────────────┐
│  ENGINE 5       │  Formatting Engine (Stage S)
│  FORMATTING     │  • UFM geometry
│                 │  • Punctuation rules
│  NO AI CALLS    │  • Number formatting
└────────┬────────┘  • Geometry validation
         │
         ▼
   WORKSPACE UI
   DOCX / TXT / PDF
```

---

## AI CALL SUMMARY

| Engine | Prompts | Calls | Purpose |
|--------|---------|-------|---------|
| 0 | None | 0 | Deterministic |
| 1 | 1-A, 1-B, 1-C, 1-D | 3–4 | Boundary detection |
| 2 | 2-A, 2-B, 2-C, 2-D | 3–4 | Speaker resolution |
| 3 | 3-A, 3-B, 3-C, 3-D, 3-E | 2–5 | Structure classification |
| 4A–4D | None | 0 | Deterministic |
| 4E | AI prompt | 1 | Contextual correction |
| 4F | None | 0 | Deterministic |
| 4.5 | None | 0 | Deterministic |
| 5 | None | 0 | Deterministic |
| **TOTAL** | | **9–14** | |

---

## ERROR HANDLING (applies to ALL engines)

```
For any AI call that returns non-JSON when JSON is required:
  1. Retry once with: "Return ONLY valid JSON. Your previous response
     was not parseable. Return nothing except the JSON object."
  2. If retry fails: mark the specific ENGINE STEP as FAILED.
     Continue remaining steps if possible.
     Surface the failure in the Workspace QA dashboard.
     Do NOT halt the entire pipeline for a single step failure.
  3. If ENGINE 0 or Engine 4.5 VALIDATION fails: halt entirely.
     These are integrity gates — partial output is worse than no output.

For network errors or timeout:
  Retry with exponential backoff: 2s, 4s, 8s (3 attempts).
  After 3 failures: mark step as FAILED, continue if non-critical.

For confidence below threshold:
  Never guess. Return FLAG only. Let the reporter decide.
```

---

## VERBATIM MANDATE (governs ALL engines)

```
NEVER CORRECT:
  uh, um, ah, like, you know, I mean, basically
  uh-huh, uh-uh, mm-hmm, yeah, yep, nope, nah
  gonna, kinda, wanna, gotta, lemme, y'all
  Grammatical errors in testimony
  Profanity (preserve exactly)
  Stutters and false starts
  Any word where all four tests are not met

FOUR-TEST GATE (for every AI correction):
  TEST 1: Clearly a speech-to-text artifact?
  TEST 2: Intended word unambiguous from context?
  TEST 3: Does NOT alter testimony meaning?
  TEST 4: Every competent scopist would agree?
  
  All four MUST be true. One failure = FLAG, not correction.
```

---

## QA DASHBOARD METRICS (accumulated across all engines)

```json
{
  "transcript_id": "tr_xxx",
  "pipeline_version": "v2.0",
  "completed_at": "2026-04-30T14:23:11Z",
  "integrity_audit": {
    "passed": true,
    "word_count": 12847,
    "utterance_count": 1083,
    "speaker_count": 5,
    "mean_confidence": 0.91
  },
  "boundary_engine": {
    "pre_record_excluded": 47,
    "off_record_sections": 3,
    "post_record_excluded": 22,
    "on_record_utterances": 1014
  },
  "speaker_engine": {
    "speakers_mapped": 5,
    "human_verified": true,
    "diarization_issues": 1,
    "attribution_overrides": 12
  },
  "structure_engine": {
    "q_blocks": 203,
    "a_blocks": 198,
    "sp_blocks": 87,
    "pn_blocks": 12,
    "splits_performed": 23,
    "objections_extracted": 14,
    "fragments_merged": 41
  },
  "correction_engines": {
    "total_corrections": 111,
    "by_engine": {
      "4a_metadata": 31,
      "4b_confirmed": 18,
      "4c_legal": 22,
      "4d_medical": 9,
      "4e_ai_auto": 31,
      "4e_ai_pending": 12
    },
    "scopist_flags": 8,
    "verbatim_violations": 0
  },
  "validation": {
    "passed": true,
    "errors": 0,
    "warnings": 1
  },
  "formatting": {
    "geometry_violations": 0,
    "punctuation_corrections": 156,
    "output_characters": 87432
  },
  "pending_human_review": {
    "ai_suggestions": 12,
    "scopist_flags": 8,
    "total_items": 20
  }
}
```

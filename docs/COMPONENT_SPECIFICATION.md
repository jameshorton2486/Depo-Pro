> **Provenance note for the web app (`depo-pro`, Vite/React/Supabase):** Compiled from the `depo_final_wave8`
> desktop codebase. The PIPELINE STAGES, ALGORITHMS, INVARIANTS, and GATES (immutable raw layer, speaker-map
> confirmation gate, objection isolation, Q/A tether, 25-slot pages, UFM geometry values) are authoritative
> for this repo. The IMPLEMENTATION details are not: Python file paths, python-docx/reportlab dependencies,
> and the 250 MB uploader are the desktop build's. This repo persists to Supabase Postgres, uploads under a
> 2 GB configured limit (Pro plan), and will choose its own export tooling at the Export stage.

# Depo-Pro Component Specification
## UFM Formatting Engine + Deepgram JSON Processing

**Purpose:** Comprehensive blueprint for replicating the UFM (Uniform Format Manual) formatting engine and Deepgram speech-to-text integration from the Depo-Pro codebase.

**Source:** `depo_final_wave8-main` codebase analysis

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Deepgram JSON Processing](#2-deepgram-json-processing)
3. [Transcript Data Models](#3-transcript-data-models)
4. [UFM Geometry & Layout](#4-ufm-geometry--layout)
5. [Rendering Pipeline (Stage S)](#5-rendering-pipeline-stage-s)
6. [Pagination Engine](#6-pagination-engine)
7. [Correction Engine](#7-correction-engine)
8. [Export Writers](#8-export-writers)
9. [Speaker Mapping](#9-speaker-mapping)
10. [Implementation Checklist](#10-implementation-checklist)

---

## 1. Architecture Overview

### Pipeline Flow

```
Audio/Video File
       ↓
┌──────────────────────────────────────────────────────────────┐
│  DEEPGRAM CLIENT (backend/deepgram/client.py)                │
│  - Sends audio to Deepgram Nova-3 API                        │
│  - Returns raw JSON response (immutable once saved)          │
└──────────────────────────────────────────────────────────────┘
       ↓
┌──────────────────────────────────────────────────────────────┐
│  TRANSCRIPT ASSEMBLER (backend/transcript/assembler.py)      │
│  - Normalizes Deepgram JSON → canonical data model           │
│  - Extracts: words[], utterances[], speakers[]               │
└──────────────────────────────────────────────────────────────┘
       ↓
┌──────────────────────────────────────────────────────────────┐
│  SPEAKER MAPPING (Wave 9)                                     │
│  - Maps speaker indices → named participants                 │
│  - Assigns roles: examining_attorney, witness, etc.          │
└──────────────────────────────────────────────────────────────┘
       ↓
┌──────────────────────────────────────────────────────────────┐
│  CORRECTION ENGINE (backend/corrections/pipeline.py)         │
│  - Stages: Guard → Artifacts → Metadata → Typography → Flags │
│  - Applies regex rules, legal phrase corrections             │
└──────────────────────────────────────────────────────────────┘
       ↓
┌──────────────────────────────────────────────────────────────┐
│  STAGE S RENDERER (backend/stage_s/renderer.py)              │
│  - Converts utterances → RenderLines                         │
│  - Handles: Q/A, colloquy, parentheticals, objections        │
└──────────────────────────────────────────────────────────────┘
       ↓
┌──────────────────────────────────────────────────────────────┐
│  PAGINATION ENGINE (backend/pagination/paginator.py)         │
│  - Wraps RenderLines → PhysicalLines                         │
│  - Places into 25-slot pages per UFM                         │
└──────────────────────────────────────────────────────────────┘
       ↓
┌──────────────────────────────────────────────────────────────┐
│  GEOMETRY ENGINE (backend/geometry/engine.py)                │
│  - Applies UFM measurements (margins, fonts, spacing)        │
│  - Produces GeometryDocument with exact coordinates          │
└──────────────────────────────────────────────────────────────┘
       ↓
┌──────────────────────────────────────────────────────────────┐
│  EXPORT WRITERS (backend/export/)                            │
│  - DOCX Writer (python-docx)                                 │
│  - PDF Writer (reportlab)                                    │
│  - TXT/RTF Writers                                           │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. Deepgram JSON Processing

### 2.1 Deepgram API Configuration

**File:** `backend/deepgram/client.py`

```python
DEEPGRAM_ENDPOINT = "https://api.deepgram.com/v1/listen"

# Required API parameters for legal transcription
DEEPGRAM_PARAMS = {
    "model": "nova-3",           # Current best model
    "punctuate": "true",         # Add punctuation
    "paragraphs": "true",        # Group into paragraphs
    "diarize_model": "latest",   # Speaker diarization v2
    "filler_words": "true",      # CRITICAL: Keep "um", "uh" verbatim
    "utterances": "true",        # Return utterance-level groupings
    "smart_format": "true",      # Apply smart formatting
}

# Keyterm boosting (up to 100 terms)
KEYTERM_LIMIT = 100
```

### 2.2 Deepgram Response Structure

```json
{
  "metadata": {
    "request_id": "uuid",
    "sha256": "audio_file_hash",
    "created": "2026-05-21T21:14:29.221Z",
    "duration": 8837.799,
    "channels": 1,
    "model_info": {
      "model_uuid": {
        "name": "general-nova-3",
        "version": "2025-07-31.0",
        "arch": "nova-3"
      }
    }
  },
  "results": {
    "channels": [{
      "alternatives": [{
        "transcript": "Full transcript text...",
        "confidence": 0.998,
        "words": [
          {
            "word": "good",
            "start": 164.685,
            "end": 165.005,
            "confidence": 0.985,
            "speaker": 0,
            "speaker_confidence": 1.0,
            "punctuated_word": "Good"
          }
          // ... more words
        ]
      }]
    }],
    "utterances": [
      {
        "speaker": 0,
        "start": 164.685,
        "end": 166.845,
        "transcript": "Good afternoon, mister Nunez.",
        "confidence": 0.98,
        "words": [/* word objects */]
      }
      // ... more utterances
    ]
  }
}
```

### 2.3 Key Fields to Extract Per Word

| Field | Type | Description |
|-------|------|-------------|
| `word` | string | Lowercase bare word |
| `punctuated_word` | string | Word with punctuation (prefer this) |
| `start` | float | Start timestamp in seconds |
| `end` | float | End timestamp in seconds |
| `confidence` | float | 0.0-1.0 recognition confidence |
| `speaker` | int | Speaker index (0, 1, 2...) |
| `speaker_confidence` | float | Diarization confidence |

---

## 3. Transcript Data Models

### 3.1 NormalizedTranscript (Canonical Layer)

**File:** `backend/transcript/assembler.py`

```python
@dataclass
class NormalizedTranscript:
    words: list[dict]           # All word tokens
    utterances: list[dict]      # Speaker turn blocks
    speakers: list[dict]        # Speaker map
    duration_seconds: float     # Total audio duration
    full_text: str              # Concatenated transcript
```

### 3.2 Canonical Word Object

```python
word_obj = {
    "word_id": str,             # UUID
    "utterance_id": str,        # Parent utterance UUID
    "word_index": int,          # Sequential position
    "raw_text": str,            # Original from Deepgram (IMMUTABLE)
    "working_text": str | None, # Corrected version (mutable)
    "speaker_index": int,       # Speaker number
    "start_time": float,        # Audio timestamp
    "end_time": float,          # Audio timestamp
    "confidence": float,        # Recognition confidence
    "is_filler": int,           # 1 if um/uh/etc, else 0
    "reviewed": int,            # Human review flag
}
```

### 3.3 Canonical Utterance Object

```python
utterance_obj = {
    "utterance_id": str,        # UUID
    "utterance_index": int,     # Sequential position
    "speaker_index": int,       # Speaker number
    "speaker_label": str,       # "Speaker 0", "Speaker 1", etc.
    "start_time": float,        # First word start
    "end_time": float,          # Last word end
    "text": str,                # Full utterance text
    "avg_confidence": float,    # Average word confidence
}
```

### 3.4 Speaker Object

```python
speaker_obj = {
    "speaker_row_id": str,      # UUID
    "speaker_index": int,       # Deepgram speaker number
    "speaker_label": str,       # Display label
    "assigned_name": str|None,  # "MR. JENKINS" (after mapping)
    "speaker_role": str|None,   # "examining_attorney", "witness", etc.
    "word_count": int,          # Words spoken by this speaker
}
```

### 3.5 Filler Tokens (Preserve Verbatim)

```python
_FILLER_TOKENS = {"um", "uh", "uh-huh", "huh-uh", "mm-hmm", "er", "ah"}
```

**CRITICAL RULE:** Never remove filler words. Flag them with `is_filler=1` but keep in transcript.

---

## 4. UFM Geometry & Layout

### 4.1 Texas UFM GeometryProfile

**File:** `backend/geometry/profile.py`

```python
@dataclass(frozen=True)
class GeometryProfile:
    name: str = "texas_ufm"
    
    # Page size (US Letter: 8.5" x 11")
    page_width_twips: int = 12240      # 8.5 inches
    page_height_twips: int = 15840     # 11 inches
    
    # Margins (CRITICAL: must total 2.0" for 6.5" text area)
    margin_top_twips: int = 1440       # 1.0"
    margin_bottom_twips: int = 1440    # 1.0"
    margin_left_twips: int = 1800      # 1.25"
    margin_right_twips: int = 1080     # 0.75"
    
    # Typography
    body_font: str = "Courier New"
    body_font_pt: int = 12
    lines_per_page: int = 25           # UFM MANDATE
    line_spacing_pt: int = 28          # Exactly 28pt
    
    # Tab system (twips from left text margin)
    tab_stops_twips: tuple = (360, 900, 1440, 2160, 2880)
    # Tab 1 (360):  Q./A. designations
    # Tab 2 (900):  Q/A text start
    # Tab 3 (1440): Speaker labels (colloquy)
    # Tab 4 (2160): Procedural parentheticals
    # Tab 5 (2880): Deep indentation
    
    # Character limits per line
    chars_per_line_min: int = 56
    chars_per_line_max: int = 63
    
    # Format box border
    format_box_line_pt: float = 0.75
```

### 4.2 Unit Conversions

```python
TWIPS_PER_INCH = 1440
TWIPS_PER_POINT = 20

def twips_to_points(twips: int) -> float:
    return twips / 20.0

def twips_to_inches(twips: int) -> float:
    return twips / 1440.0
```

### 4.3 Text Area Calculation

```python
text_area_width_twips = page_width_twips - margin_left_twips - margin_right_twips
# = 12240 - 1800 - 1080 = 9360 twips = 6.5 inches (UFM minimum)

text_area_height_twips = page_height_twips - margin_top_twips - margin_bottom_twips
# = 15840 - 1440 - 1440 = 12960 twips = 9 inches
```

---

## 5. Rendering Pipeline (Stage S)

### 5.1 Line Types

**File:** `backend/stage_s/models.py`

```python
# Line type constants
LINE_Q = "Q"                       # Examination question
LINE_A = "A"                       # Witness answer
LINE_COLLOQUY = "colloquy"         # Named speaker, not Q/A
LINE_PARENTHETICAL = "parenthetical"
LINE_BY = "by_line"                # "BY MR. SMITH:" attribution
LINE_EXAMINATION = "examination"   # "EXAMINATION" section header
LINE_FLAGGED = "flagged"           # Unmapped speaker
LINE_BLANK = "blank"

# Record state
ON_RECORD = "ON_RECORD"
OFF_RECORD = "OFF_RECORD"

# Tab levels (semantic)
TAB_MARGIN = 0                     # Left margin
TAB_QA_DESIGNATION = 1             # "Q." / "A." position
TAB_QA_TEXT = 2                    # Q/A spoken text
TAB_COLLOQUY = 3                   # Speaker label position
TAB_PARENTHETICAL = 4              # Parenthetical position
```

### 5.2 RenderLine Object

```python
@dataclass
class RenderLine:
    line_id: str                    # Unique identifier
    line_type: str                  # LINE_Q, LINE_A, etc.
    text: str                       # Content text
    speaker_label: str              # "MR. JENKINS:" etc.
    source_utterance_ids: list[str] # Traceability
    tab_level: int                  # TAB_* constant
    procedural: bool                # Generated (not spoken)
    render_state: str               # ON_RECORD / OFF_RECORD
    audit_note: str                 # Processing notes
```

### 5.3 Role → Q/A Mode Mapping

```python
def qa_mode_for_role(role: str) -> str:
    """Return 'Q', 'A', or '' (colloquy) for a participant role."""
    mapping = {
        "examining_attorney": "Q",
        "witness": "A"
    }
    return mapping.get(role, "")  # Empty = colloquy
```

### 5.4 Participant Roles

| Role | Description | Q/A Mode |
|------|-------------|----------|
| `examining_attorney` | Attorney asking questions | Q |
| `witness` | Person being deposed | A |
| `defending_attorney` | Defense counsel | Colloquy |
| `videographer` | Video operator | Parenthetical triggers |
| `court_reporter` | The reporter (usually not transcribed) | Colloquy |
| `interpreter` | Language interpreter | Colloquy |

### 5.5 Opening Ritual

When the first examining attorney speaks:
1. Emit `EXAMINATION` header line
2. Emit `BY MR. SMITH:` attribution line
3. Then emit the first Q line

### 5.6 Objection Isolation

When a non-Q/A speaker (defending attorney) says something that looks like an objection:
1. Append `--` to the interrupted Q/A line
2. Emit the objection as standalone colloquy
3. Prepend `--` to the next Q line (resumption)

```python
def looks_like_objection(text: str) -> bool:
    t = text.lower().strip()
    return t.startswith("objection") or t.startswith("object")
```

### 5.7 Off-Record Handling

Detect videographer statements like:
- "We are going off the record" → emit `(Off the record.)`
- "Back on the record" → emit `(Back on the record.)`

Content spoken during off-record spans is tagged but preserved.

---

## 6. Pagination Engine

### 6.1 Core Constants

```python
LINES_PER_PAGE = 25              # UFM mandate
DEFAULT_WRAP_WIDTH = 58          # Characters (conservative)
```

### 6.2 Data Models

**PhysicalLine:** One actually printed line after wrapping

```python
@dataclass
class PhysicalLine:
    text: str
    tab_level: int
    line_type: str
    source_render_line_id: str
    is_continuation: bool = False  # True if wrap continuation
    procedural: bool = False
```

**PageSlot:** One numbered position (1-25) on a page

```python
@dataclass
class PageSlot:
    slot_number: int               # 1..25
    physical_line: PhysicalLine | None
```

**Page:** A full page with 25 slots

```python
@dataclass
class Page:
    page_number: int
    page_id: str                   # "page-0001"
    slots: list[PageSlot]          # Exactly 25 slots
```

**ContinuationState:** Records when content spans page boundary

```python
@dataclass
class ContinuationState:
    render_line_id: str
    line_type: str
    from_page: int
    to_page: int
```

### 6.3 Line Wrapping Algorithm

```python
def wrap_text(text: str, width: int) -> list[str]:
    """Greedy word wrap. Never splits or drops words."""
    words = text.split()
    if not words:
        return [""]
    
    lines = []
    current = ""
    
    for word in words:
        candidate = word if not current else f"{current} {word}"
        if len(candidate) <= width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    
    if current:
        lines.append(current)
    
    return lines or [""]
```

### 6.4 Q/A Tether Rule

A question must not be stranded at the bottom of a page with its answer starting on the next page. If the Q's physical lines + at least 1 line of A won't fit, push Q to the next page.

---

## 7. Correction Engine

### 7.1 Stage Pipeline Order

```
G (Guard)      → Shield protected spans (quotes, names)
A (Artifacts)  → Remove Deepgram mechanical errors
M (Metadata)   → Exact-match substitutions
X (Lexicon)    → Legal phrase corrections
S (Structure)  → Q/A formatting (in Stage S renderer)
T (Typography) → Spacing, honorifics, dashes
F (Flags)      → Detect low-confidence, flag for review
U (Unguard)    → Restore protected spans
```

### 7.2 Typography Rules

**File:** `backend/corrections/typography.py`

Key rules:
- Two spaces after sentence-ending punctuation before capital
- Single space after abbreviations (Ms., Mr., a.m.)
- Em dashes for stutters: `I--I`, `was -- was`
- Honorifics must be capitalized: `MR.`, `MS.`, `MRS.`
- Double space after honorific period and after colon in speaker labels

### 7.3 Guard/Unguard Pattern

Protect verbatim content that shouldn't be modified:
1. **Guard:** Replace protected spans with sentinel tokens
2. **Process:** Run through correction stages
3. **Unguard:** Restore original content

---

## 8. Export Writers

### 8.1 DOCX Writer

**File:** `backend/export/docx_writer.py`

Uses `python-docx` library.

```python
from docx import Document
from docx.shared import Pt, Inches

def build_docx(doc, geometry):
    word = Document()
    
    # Apply UFM margins
    section = word.sections[0]
    section.page_width = Inches(8.5)
    section.page_height = Inches(11)
    section.left_margin = Inches(1.25)
    section.right_margin = Inches(0.75)
    section.top_margin = Inches(1.0)
    section.bottom_margin = Inches(1.0)
    
    # Typography
    for paragraph in word.paragraphs:
        for run in paragraph.runs:
            run.font.name = "Courier New"
            run.font.size = Pt(12)
        paragraph.paragraph_format.line_spacing = Pt(28)
```

### 8.2 Format Box (Border)

UFM requires solid lines around the text area. Achieved via paragraph borders in DOCX:

```python
def add_format_box_border(paragraph, line_pt=0.75):
    """Add solid border around paragraph (UFM format box)."""
    pPr = paragraph._p.get_or_add_pPr()
    pBdr = OxmlElement("w:pBdr")
    sz = str(int(line_pt * 8))  # Size in 8ths of a point
    
    for side in ("top", "left", "bottom", "right"):
        bdr = OxmlElement(f"w:{side}")
        bdr.set(qn("w:val"), "single")
        bdr.set(qn("w:sz"), sz)
        bdr.set(qn("w:color"), "000000")
        pBdr.append(bdr)
    
    pPr.append(pBdr)
```

---

## 9. Speaker Mapping

### 9.1 Index → Participant Map

**Build after transcription, before corrections:**

```python
def build_index_map(participants: list[dict]) -> dict:
    """Map speaker_index → participant info."""
    return {
        p["speaker_index"]: {
            "label": p["assigned_name"],
            "role": p["speaker_role"],
        }
        for p in participants
        if p.get("speaker_index") is not None
    }
```

### 9.2 Mapping Confirmation Gate

**CRITICAL:** The correction engine requires confirmed speaker mapping before running. This prevents running corrections on unmapped speakers.

```python
if not speaker_map_confirmed:
    raise SpeakerMapUnverifiedError(
        "Correction engine requires a confirmed speaker mapping."
    )
```

---

## 10. Implementation Checklist

### Phase 1: Deepgram Integration
- [ ] Create Deepgram client with correct parameters
- [ ] Implement keyterm normalization (100 term limit)
- [ ] Build offline fallback for testing
- [ ] Store raw JSON response (immutable)

### Phase 2: Transcript Assembly
- [ ] Implement `normalize()` function
- [ ] Extract words[], utterances[], speakers[]
- [ ] Calculate confidence scores
- [ ] Flag filler words (never remove)

### Phase 3: Speaker Mapping
- [ ] Build speaker index detection
- [ ] Create mapping UI/workflow
- [ ] Implement role assignment
- [ ] Add confirmation gate

### Phase 4: Stage S Rendering
- [ ] Define line types and tab levels
- [ ] Implement Q/A line builder
- [ ] Implement colloquy line builder
- [ ] Add EXAMINATION header emission
- [ ] Add BY-line attribution
- [ ] Implement objection isolation
- [ ] Handle off-record transitions

### Phase 5: Pagination
- [ ] Implement text wrapping
- [ ] Create 25-slot page model
- [ ] Implement Q/A tethering
- [ ] Track page continuations

### Phase 6: Geometry
- [ ] Define GeometryProfile
- [ ] Implement twip conversions
- [ ] Calculate format box coordinates
- [ ] Apply margins and spacing

### Phase 7: Correction Engine
- [ ] Implement guard/unguard
- [ ] Build typography rules
- [ ] Add flag detection
- [ ] Create correction log

### Phase 8: Export
- [ ] DOCX writer with python-docx
- [ ] Apply UFM formatting
- [ ] Add format box borders
- [ ] Generate line numbers

---

## Appendix A: Key File Locations

| Component | Source File |
|-----------|-------------|
| Deepgram Client | `backend/deepgram/client.py` |
| Transcript Assembler | `backend/transcript/assembler.py` |
| Geometry Profile | `backend/geometry/profile.py` |
| Geometry Engine | `backend/geometry/engine.py` |
| Stage S Renderer | `backend/stage_s/renderer.py` |
| Line Builder | `backend/stage_s/line_builder.py` |
| Models | `backend/stage_s/models.py` |
| Paginator | `backend/pagination/paginator.py` |
| Wrapping | `backend/pagination/wrapping.py` |
| Corrections Pipeline | `backend/corrections/pipeline.py` |
| Typography | `backend/corrections/typography.py` |
| DOCX Writer | `backend/export/docx_writer.py` |
| UFM Data Dictionary | `docs/DEPO-PRO_UFM_Data_Dictionary_v2.md` |

---

## Appendix B: Dependencies

### Python
```
python >= 3.10
python-docx >= 0.8.11    # DOCX generation
reportlab >= 4.0         # PDF generation (optional)
loguru >= 0.7            # Logging
```

### External APIs
- Deepgram Nova-3 API (requires API key)
- Environment variable: `DEEPGRAM_API_KEY`

---

*Document generated from `depo_final_wave8-main` codebase analysis.*
*Last updated: June 2026*

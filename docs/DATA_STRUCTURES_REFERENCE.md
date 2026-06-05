> **Provenance note for the web app (`depo-pro`, Vite/React/Supabase):** Compiled from the `depo_final_wave8`
> desktop codebase. These object shapes and the Texas UFM geometry values are adopted as the canonical
> TRANSCRIPT-DOMAIN data model for this repo (CanonicalWord raw_text/working_text semantics, utterance and
> speaker shapes, RenderLine/tab levels, 25-slot pages). Storage columns map onto this repo's Supabase
> tables and the frozen contract in `src/api/types.ts` — where the two disagree, log the delta in
> CONTRACT_NOTES.md rather than silently renaming. SQLite-isms (0/1 integer booleans) may be represented
> idiomatically (true/false) so long as semantics are preserved.

# Depo-Pro Data Structures & JSON Schemas
## Quick Reference for Implementation

---

## 1. Deepgram API Request

### Endpoint
```
POST https://api.deepgram.com/v1/listen
```

### Headers
```http
Authorization: Token {DEEPGRAM_API_KEY}
Content-Type: audio/mpeg  (or audio/wav, video/mp4, etc.)
```

### Query Parameters
```
?model=nova-3
&punctuate=true
&paragraphs=true
&diarize_model=latest
&filler_words=true
&utterances=true
&smart_format=true
&keyterm={term1}
&keyterm={term2}
...
```

### Supported Content Types
```python
CONTENT_TYPES = {
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".m4a": "audio/mp4",
    ".mp4": "video/mp4",
    ".mov": "video/quicktime",
    ".aac": "audio/aac",
    ".ogg": "audio/ogg",
    ".flac": "audio/flac",
    ".webm": "audio/webm",
}
```

---

## 2. Deepgram Response Schema

```typescript
interface DeepgramResponse {
  metadata: {
    request_id: string;
    sha256: string;
    created: string;           // ISO timestamp
    duration: number;          // seconds
    channels: number;
    models: string[];
    model_info: {
      [model_uuid: string]: {
        name: string;          // "general-nova-3"
        version: string;
        arch: string;
      }
    }
  };
  results: {
    channels: Array<{
      alternatives: Array<{
        transcript: string;    // Full transcript text
        confidence: number;    // 0.0-1.0
        words: DeepgramWord[];
      }>;
    }>;
    utterances?: DeepgramUtterance[];
  };
}

interface DeepgramWord {
  word: string;                // Lowercase bare word
  punctuated_word: string;     // With punctuation
  start: number;               // Start time (seconds)
  end: number;                 // End time (seconds)
  confidence: number;          // 0.0-1.0
  speaker: number;             // Speaker index
  speaker_confidence: number;  // Diarization confidence
}

interface DeepgramUtterance {
  speaker: number;
  start: number;
  end: number;
  transcript: string;
  confidence: number;
  words: DeepgramWord[];
}
```

---

## 3. Canonical Word Object

```typescript
interface CanonicalWord {
  word_id: string;            // UUID v4
  utterance_id: string;       // Parent utterance UUID
  word_index: number;         // Sequential position (0-based)
  raw_text: string;           // Original from Deepgram (IMMUTABLE)
  working_text: string | null;// Corrected version (mutable)
  speaker_index: number;      // Speaker number from Deepgram
  start_time: number;         // Audio timestamp (seconds)
  end_time: number;           // Audio timestamp (seconds)
  confidence: number;         // 0.0-1.0 (4 decimal places)
  is_filler: 0 | 1;           // 1 if um/uh/etc
  reviewed: 0 | 1;            // Human review flag
}
```

### Example
```json
{
  "word_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "utterance_id": "f0e1d2c3-b4a5-6789-0abc-def123456789",
  "word_index": 42,
  "raw_text": "objection,",
  "working_text": null,
  "speaker_index": 1,
  "start_time": 245.685,
  "end_time": 246.125,
  "confidence": 0.9854,
  "is_filler": 0,
  "reviewed": 0
}
```

---

## 4. Canonical Utterance Object

```typescript
interface CanonicalUtterance {
  utterance_id: string;       // UUID v4
  utterance_index: number;    // Sequential position
  speaker_index: number;      // Speaker number
  speaker_label: string;      // "Speaker 0", "Speaker 1"
  start_time: number;         // First word start
  end_time: number;           // Last word end
  text: string;               // Full utterance text
  avg_confidence: number;     // Average word confidence
}
```

### Example
```json
{
  "utterance_id": "f0e1d2c3-b4a5-6789-0abc-def123456789",
  "utterance_index": 15,
  "speaker_index": 0,
  "speaker_label": "Speaker 0",
  "start_time": 164.685,
  "end_time": 175.250,
  "text": "Good afternoon, mister Nunez. How are you today?",
  "avg_confidence": 0.9821
}
```

---

## 5. Speaker/Participant Object

```typescript
interface Speaker {
  speaker_row_id: string;      // UUID v4
  speaker_index: number;       // Deepgram speaker number
  speaker_label: string;       // "Speaker 0" (before mapping)
  assigned_name: string | null;// "MR. JENKINS" (after mapping)
  speaker_role: string | null; // Role enum
  word_count: number;          // Words spoken
}

type SpeakerRole = 
  | "examining_attorney"
  | "witness"
  | "defending_attorney"
  | "videographer"
  | "court_reporter"
  | "interpreter"
  | "other";
```

### Example
```json
{
  "speaker_row_id": "12345678-abcd-efgh-ijkl-mnopqrstuvwx",
  "speaker_index": 0,
  "speaker_label": "Speaker 0",
  "assigned_name": "MR. NUNEZ",
  "speaker_role": "examining_attorney",
  "word_count": 1547
}
```

---

## 6. RenderLine Object (Stage S Output)

```typescript
interface RenderLine {
  line_id: string;                    // "s-0001", "s-0002"
  line_type: LineType;
  text: string;                       // Content text
  speaker_label: string;              // "MR. JENKINS:" for colloquy
  source_utterance_ids: string[];     // Traceability
  tab_level: TabLevel;
  procedural: boolean;                // Generated, not spoken
  render_state: "ON_RECORD" | "OFF_RECORD";
  audit_note: string;
}

type LineType = 
  | "Q"              // Examination question
  | "A"              // Witness answer
  | "colloquy"       // Named speaker, not Q/A
  | "parenthetical"  // Procedural note
  | "by_line"        // "BY MR. SMITH:"
  | "examination"    // "EXAMINATION" header
  | "flagged"        // Unmapped speaker
  | "blank";

type TabLevel = 0 | 1 | 2 | 3 | 4;
// 0: Margin
// 1: Q/A designation
// 2: Q/A text
// 3: Colloquy label
// 4: Parenthetical
```

### Examples

**Q Line:**
```json
{
  "line_id": "s-0042",
  "line_type": "Q",
  "text": "And what was your position at Home Depot?",
  "speaker_label": "",
  "source_utterance_ids": ["uuid-here"],
  "tab_level": 1,
  "procedural": false,
  "render_state": "ON_RECORD",
  "audit_note": ""
}
```

**Colloquy Line:**
```json
{
  "line_id": "s-0043",
  "line_type": "colloquy",
  "text": "MR. MADRID:  Objection. Vague and ambiguous.",
  "speaker_label": "MR. MADRID:",
  "source_utterance_ids": ["uuid-here"],
  "tab_level": 3,
  "procedural": false,
  "render_state": "ON_RECORD",
  "audit_note": "Objection isolated to standalone colloquy."
}
```

**BY Line:**
```json
{
  "line_id": "s-0010",
  "line_type": "by_line",
  "text": "BY MR. NUNEZ:",
  "speaker_label": "BY MR. NUNEZ:",
  "source_utterance_ids": [],
  "tab_level": 0,
  "procedural": true,
  "render_state": "ON_RECORD",
  "audit_note": "Initial examination attribution."
}
```

---

## 7. Pagination Objects

### PhysicalLine
```typescript
interface PhysicalLine {
  text: string;
  tab_level: number;
  line_type: string;
  source_render_line_id: string;
  is_continuation: boolean;    // True if wrap continuation
  procedural: boolean;
}
```

### PageSlot
```typescript
interface PageSlot {
  slot_number: number;         // 1-25
  physical_line: PhysicalLine | null;
}
```

### Page
```typescript
interface Page {
  page_number: number;
  page_id: string;             // "page-0001"
  slots: PageSlot[];           // Always 25 items
}
```

### ContinuationState
```typescript
interface ContinuationState {
  render_line_id: string;
  line_type: string;
  from_page: number;
  to_page: number;
}
```

### PaginatedDocument
```typescript
interface PaginatedDocument {
  pages: Page[];
  continuations: ContinuationState[];
  total_pages: number;
}
```

---

## 8. Geometry Objects

### GeometryProfile
```typescript
interface GeometryProfile {
  name: string;                        // "texas_ufm"
  
  // Page size (twips)
  page_width_twips: number;            // 12240 (8.5")
  page_height_twips: number;           // 15840 (11")
  
  // Margins (twips)
  margin_top_twips: number;            // 1440 (1.0")
  margin_bottom_twips: number;         // 1440 (1.0")
  margin_left_twips: number;           // 1800 (1.25")
  margin_right_twips: number;          // 1080 (0.75")
  
  // Typography
  body_font: string;                   // "Courier New"
  body_font_pt: number;                // 12
  lines_per_page: number;              // 25
  line_spacing_pt: number;             // 28
  
  // Tab stops (twips from left margin)
  tab_stops_twips: number[];           // [360, 900, 1440, 2160, 2880]
  
  // Character limits
  chars_per_line_min: number;          // 56
  chars_per_line_max: number;          // 63
  
  // Format box
  format_box_line_pt: number;          // 0.75
}
```

### PageGeometry
```typescript
interface PageGeometry {
  page_number: number;
  
  // Page size (points)
  page_width_pt: number;
  page_height_pt: number;
  
  // Margins (points)
  margin_left_pt: number;
  margin_right_pt: number;
  margin_top_pt: number;
  margin_bottom_pt: number;
  
  // Text area (points)
  text_area_width_pt: number;
  text_area_height_pt: number;
  
  // Typography
  font_name: string;
  font_size_pt: number;
  line_spacing_pt: number;
  lines_per_page: number;
  
  // Format box (points)
  format_box_left_pt: number;
  format_box_right_pt: number;
  format_box_top_pt: number;
  format_box_bottom_pt: number;
  format_box_line_pt: number;
  
  // Line number column
  line_num_column_pt: number;
  
  // Tab stops (points)
  tab_stops_pt: number[];
  
  // Header
  header_page_num: number;
  
  // Content
  slots: PageSlot[];
}
```

---

## 9. Correction Log Entry

```typescript
interface CorrectionLogEntry {
  rule_id: string;           // "TYPO:HONORIFIC", "REGEX:001"
  stage: string;             // "typography", "artifacts", "regex"
  utterance_id: string;
  before: string;            // Original text
  after: string;             // Corrected text
}
```

### Example
```json
{
  "rule_id": "TYPO:HONORIFIC",
  "stage": "typography",
  "utterance_id": "uuid-here",
  "before": "mr. Smith",
  "after": "MR.  Smith"
}
```

---

## 10. Flag Object

```typescript
interface Flag {
  flag_id: string;
  flag_type: FlagType;
  utterance_id: string;
  word_id?: string;
  message: string;
  severity: "info" | "warning" | "critical";
}

type FlagType =
  | "low_confidence"      // Word confidence < threshold
  | "unmapped_speaker"    // Speaker not assigned
  | "garbled_objection"   // Unrecognized legal phrase
  | "scopist_review"      // Needs human review
  | "potential_error";    // Correction engine uncertainty
```

---

## 11. Export Document

```typescript
interface ExportDocument {
  caption: string | null;
  cause_number: string | null;
  witness: string | null;
  pages: ExportPage[];
}

interface ExportPage {
  page_number: number;
  lines: ExportLine[];
}

interface ExportLine {
  line_number: number;     // 1-25
  text: string;
}
```

---

## 12. Job Configuration

```typescript
interface JobConfig {
  job_id: string;
  transcript_id: string;
  
  // Speaker mapping
  confirmed_spellings: Record<string, string>;
  speaker_map_confirmed: boolean;
  
  // Deepgram settings
  deepgram_keyterms: string[];
  
  // Reporter info
  reporter_name: string;
  reporter_csr: string;
  
  // Engine flags
  deterministic_parity_mode: boolean;
  
  // Custom rules
  regex_rules: RegexRule[];
}

interface RegexRule {
  rule_id: string;
  find_pattern: string;
  replace_with: string;
  rule_order: number;
  enabled: boolean;
}
```

---

## Quick Conversion Reference

### Twips ↔ Points ↔ Inches

```
1 inch = 1440 twips = 72 points
1 point = 20 twips
1 twip = 0.05 points = 1/1440 inch

twips_to_points = twips / 20
twips_to_inches = twips / 1440
points_to_twips = points * 20
inches_to_twips = inches * 1440
```

### Texas UFM Values

| Measurement | Inches | Twips | Points |
|-------------|--------|-------|--------|
| Page Width | 8.5" | 12240 | 612 |
| Page Height | 11" | 15840 | 792 |
| Left Margin | 1.25" | 1800 | 90 |
| Right Margin | 0.75" | 1080 | 54 |
| Top Margin | 1.0" | 1440 | 72 |
| Bottom Margin | 1.0" | 1440 | 72 |
| Text Width | 6.5" | 9360 | 468 |
| Line Spacing | — | 560 | 28 |

---

*Reference document for Depo-Pro component replication.*

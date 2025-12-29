# Transcript Layer Model

> **Document Type:** Architectural Specification  
> **Last Updated:** December 2024  
> **Status:** IMPLEMENTED

## Overview

Depo-Pro uses a **layered transcript architecture** where the base transcript text becomes immutable after AI processing. All subsequent modifications are stored as separate layers. This design ensures:

- **Legal Integrity:** Original transcript preserved for court requirements
- **Audit Compliance:** Complete change history for every modification
- **Privilege Protection:** Attorney work product isolated from discovery

---

## Layer Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     LAYER 6: ATTORNEY WORK PRODUCT              │
│                     (Privileged - Separate access control)      │
│   • Internal strategy notes                                     │
│   • Case theory annotations                                     │
│   • Privileged communications                                   │
├─────────────────────────────────────────────────────────────────┤
│                     LAYER 5: EXHIBIT LINKS                      │
│                     (TranscriptAnnotationExhibit)               │
│   • Links between testimony and evidence                        │
│   • Exhibit references by page:line                             │
├─────────────────────────────────────────────────────────────────┤
│                     LAYER 4: ISSUE CODES                        │
│                     (TranscriptAnnotation)                      │
│   • Legal theme tags (Negligence, Damages, etc.)                │
│   • Impeachment markers                                         │
│   • Cross-deposition references                                 │
├─────────────────────────────────────────────────────────────────┤
│                     LAYER 3: ANNOTATIONS                        │
│                     (TranscriptionEdit, Notes)                  │
│   • Word corrections by scopist                                 │
│   • Speaker re-assignments                                      │
│   • Highlights and bookmarks                                    │
├─────────────────────────────────────────────────────────────────┤
│                     LAYER 2: WORD METADATA                      │
│                     (Transcription.words JSON)                  │
│   • Timestamps (start, end)                                     │
│   • Confidence scores                                           │
│   • Speaker identification                                      │
│   • Review status (flagged, reviewed)                           │
├─────────────────────────────────────────────────────────────────┤
│                     LAYER 1: BASE TRANSCRIPT                    │
│                     (Transcription.fullTranscript)              │
│   • Original AI-generated text                                  │
│   • IMMUTABLE after lockedAt timestamp                          │
│   • Source of truth for legal certification                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Layer 1: Base Transcript (Immutable)

**Database:** `Transcription.fullTranscript`  
**Type:** Text (PostgreSQL TEXT)  
**Mutability:** Locked after AI completion

The raw transcript text produced by Deepgram AI. This layer:
- Is frozen when `lockedAt` is set
- Cannot be modified after locking
- Is the source of truth for legal certification
- Is preserved even if corrections are made (corrections live in Layer 3)

### Schema Fields

```prisma
model Transcription {
  id              String    @id @default(cuid())
  fullTranscript  String    @db.Text    // IMMUTABLE after lock
  deepgramRawJson String?   @db.Text    // Complete API response
  
  // Lock control
  lockedAt        DateTime?             // When text was frozen
  lockedBy        String?               // "system" or userId
  lockReason      String?               // "ai_complete", "manual", "export"
}
```

### Lock Triggers

| Event | Lock Reason | Locked By |
|-------|-------------|-----------|
| AI transcription completes | `ai_complete` | `system` |
| User exports transcript | `export` | userId |
| Manual lock request | `manual` | userId |
| Scopist marks complete | `scopist_complete` | userId |

### Why Immutability Matters

1. **Legal Discovery:** Opposing counsel can request the "original" transcript
2. **Court Certification:** Certified transcripts must show original + corrections
3. **Audit Trail:** Every change is traceable to a user and timestamp
4. **Rollback:** Corrections can be undone without losing original

---

## Layer 2: Word Metadata

**Database:** `Transcription.words` (JSON)  
**Type:** JSONB array  
**Mutability:** Partially mutable (review status only)

Each word from Deepgram with timing and quality metadata.

### Data Structure

```typescript
interface WordMetadata {
  // Identity
  word: string;              // Raw word (e.g., "objection")
  punctuatedWord: string;    // With punctuation (e.g., "Objection,")
  
  // Timing (immutable)
  start: number;             // Start time in seconds
  end: number;               // End time in seconds
  
  // Quality (immutable)
  confidence: number;        // 0.0 - 1.0 from Deepgram
  speaker: number | null;    // Speaker ID from diarization
  
  // Review state (mutable)
  isFlagged: boolean;        // confidence < 0.85
  isReviewed: boolean;       // Scopist verified this word
}
```

### Example

```json
{
  "words": [
    {
      "word": "objection",
      "punctuatedWord": "Objection.",
      "start": 125.45,
      "end": 126.12,
      "confidence": 0.92,
      "speaker": 0,
      "isFlagged": false,
      "isReviewed": false
    },
    {
      "word": "heresay",
      "punctuatedWord": "heresay",
      "start": 126.45,
      "end": 127.01,
      "confidence": 0.73,
      "speaker": 0,
      "isFlagged": true,
      "isReviewed": false
    }
  ]
}
```

### Mutable vs Immutable Fields

| Field | Mutable? | Who Can Change |
|-------|----------|----------------|
| word | No | — |
| punctuatedWord | No | — |
| start | No | — |
| end | No | — |
| confidence | No | — |
| speaker | No* | *See Layer 3 for corrections |
| isFlagged | Yes | System (recalculation) |
| isReviewed | Yes | Scopist |

---

## Layer 3: Annotations & Corrections

**Database:** `TranscriptionEdit`  
**Type:** Relational table  
**Mutability:** Append-only (new records, no updates)

User-created corrections, notes, and speaker reassignments. These do NOT modify the base transcript—they layer on top.

### Schema

```prisma
model TranscriptionEdit {
  id              String        @id @default(cuid())
  transcriptionId String
  transcription   Transcription @relation(...)
  
  // Editor info
  editorId        String
  editorEmail     String?
  editorRole      UserRole?
  
  // Edit details
  editType        EditType
  originalText    String?       // What was there before
  editedText      String?       // What it should be
  position        Float?        // Audio timestamp (seconds)
  wordIndex       Int?          // Index in words array
  
  // Metadata
  metadata        Json?         // Additional context
  createdAt       DateTime      @default(now())
}

enum EditType {
  WORD_CORRECTION      // Fix a misheard word
  SPEAKER_ASSIGNMENT   // Reassign who said something
  PUNCTUATION          // Fix punctuation
  INAUDIBLE_MARK       // Mark as [inaudible]
  FORMATTING           // Paragraph breaks, etc.
}
```

### Rendering Corrected Transcript

When displaying or exporting, corrections are applied on-the-fly:

```typescript
function renderTranscript(transcription: Transcription): string {
  // Start with base text
  let result = transcription.fullTranscript;
  
  // Apply corrections in order
  const edits = await getEdits(transcription.id);
  
  for (const edit of edits) {
    if (edit.editType === 'WORD_CORRECTION') {
      // Replace at position
      result = applyCorrection(result, edit);
    }
  }
  
  return result;
}
```

---

## Layer 4: Issue Codes

**Database:** `TranscriptAnnotation`  
**Type:** Relational table  
**Mutability:** Full CRUD by attorneys

Legal theme tags applied to testimony ranges for trial preparation.

### Schema

```prisma
model TranscriptAnnotation {
  id           String   @id @default(cuid())
  transcriptId String
  
  // Issue code
  issueCode    String   // e.g., "NEGLIGENCE", "DAMAGES"
  issueLabel   String   // Display name
  issueColor   String   // Hex color for highlighting
  
  // Range (page:line format for attorneys)
  pageStart    Int
  lineStart    Int
  pageEnd      Int
  lineEnd      Int
  
  // Notes
  note         String?  @db.Text
  
  // Creator
  createdById  String
  createdAt    DateTime @default(now())
  
  // Links to exhibits
  linkedExhibits TranscriptAnnotationExhibit[]
}
```

### Common Issue Codes

| Code | Label | Color | Use Case |
|------|-------|-------|----------|
| `CONTRADICTION` | Contradiction | Red | Witness contradicts prior statement |
| `ADMISSION` | Admission | Green | Favorable admission |
| `NEGLIGENCE` | Negligence | Orange | Supports negligence claim |
| `DAMAGES` | Damages | Blue | Supports damages calculation |
| `IMPEACHMENT` | Impeachment | Purple | Can be used to impeach |
| `KEY_TESTIMONY` | Key Testimony | Yellow | Important for case |

---

## Layer 5: Exhibit Links

**Database:** `TranscriptAnnotationExhibit`  
**Type:** Junction table  
**Mutability:** Full CRUD by attorneys

Connections between testimony and evidence documents.

### Schema

```prisma
model TranscriptAnnotationExhibit {
  id           String   @id @default(cuid())
  
  // Links
  annotationId String
  annotation   TranscriptAnnotation @relation(...)
  exhibitId    String
  exhibit      Exhibit @relation(...)
  
  // Creator
  createdById  String
  createdAt    DateTime @default(now())
  
  @@unique([annotationId, exhibitId])
}
```

### Use Case

When a witness says "I'm looking at the contract from 2022":

1. Attorney creates annotation at that line
2. Links to Exhibit 14 (the 2022 contract)
3. In review UI, clicking the link opens the exhibit

---

## Layer 6: Attorney Work Product (Privileged)

**Access Control:** Role-based, separate query path  
**Privilege Status:** Protected by attorney-client privilege

Internal notes, strategy, and analysis that must NEVER be shared with opposing counsel or included in discovery.

### Current Implementation

```typescript
// Annotations can have notes - treat as potentially privileged
// Filter in queries based on requesting user's role

async function getAnnotationsForExport(
  transcriptId: string,
  requestingUserId: string,
  includePrivileged: boolean
) {
  const annotations = await prisma.transcriptAnnotation.findMany({
    where: { transcriptId },
  });
  
  // TODO: Add isPrivileged field and filter
  // For now, notes are only visible to same-firm users
  return annotations;
}
```

### Future Enhancement

```prisma
model TranscriptAnnotation {
  // ... existing fields
  
  // Privilege control
  isPrivileged    Boolean @default(false)
  privilegeScope  String? // "personal", "firm", "case_team"
}
```

---

## Position Reference Systems

### Time-Based (Scopist View)

Used during audio-synchronized review.

```typescript
// Reference by audio timestamp
const wordRef = { start: 125.5, end: 126.2 };

// Find word at current audio time
function findWordAtTime(words: WordMetadata[], time: number): number {
  return words.findIndex(w => w.start <= time && w.end >= time);
}

// Seek to word
function seekToWord(audioRef: AudioPlayerRef, word: WordMetadata): void {
  audioRef.seekTo(Math.max(0, word.start - 1)); // 1 second buffer
}
```

### Page:Line (Attorney View)

Used for legal citations and exports.

```typescript
// Legal citation format
const citation = "Smith Dep. 42:10-15"; // Page 42, Lines 10-15

// Database storage
interface AnnotationRange {
  pageStart: number;  // 42
  lineStart: number;  // 10
  pageEnd: number;    // 42
  lineEnd: number;    // 15
}

// Convert timestamp to page:line (for export)
function timestampToPageLine(
  timestamp: number, 
  wordsPerLine: number = 10,
  linesPerPage: number = 25
): { page: number; line: number } {
  const wordIndex = findWordAtTime(words, timestamp);
  const lineNumber = Math.floor(wordIndex / wordsPerLine) + 1;
  const page = Math.floor((lineNumber - 1) / linesPerPage) + 1;
  const lineOnPage = ((lineNumber - 1) % linesPerPage) + 1;
  
  return { page, line: lineOnPage };
}
```

### Character Offset (Internal)

Used for precise text positioning in corrections.

```typescript
interface TextPosition {
  startOffset: number;  // Character index in fullTranscript
  endOffset: number;
}

// Find word boundaries in text
function findWordPosition(
  text: string,
  wordIndex: number
): TextPosition {
  const words = text.split(/\s+/);
  let offset = 0;
  
  for (let i = 0; i < wordIndex; i++) {
    offset += words[i].length + 1; // +1 for space
  }
  
  return {
    startOffset: offset,
    endOffset: offset + words[wordIndex].length,
  };
}
```

---

## Export Considerations

### Standard Export (DOCX/PDF)

1. **Base Text:** Start with `fullTranscript`
2. **Apply Corrections:** Overlay `TranscriptionEdit` records
3. **Format:** Add page numbers, line numbers per legal standard
4. **Exclude:** Layer 6 privileged content

### Certified Export

1. **Show Original + Corrections:** Industry standard format
2. **Strikethrough:** Original text with strikethrough
3. **Underline:** Corrected text with underline
4. **Errata Sheet:** List of all corrections with page:line references

### Attorney Export (Internal)

1. Include all annotations
2. Include issue codes with colors
3. Include linked exhibits
4. Include privileged notes (if authorized)

---

## Query Patterns

### Get Transcript with All Layers

```typescript
const transcriptWithLayers = await prisma.transcription.findUnique({
  where: { id: transcriptId },
  include: {
    edits: {
      orderBy: { createdAt: 'asc' },
    },
    job: {
      include: {
        exhibits: true,
      },
    },
  },
});
```

### Get Attorney View

```typescript
const attorneyView = await prisma.attorneyTranscript.findUnique({
  where: { id: transcriptId },
  include: {
    annotations: {
      include: {
        linkedExhibits: {
          include: { exhibit: true },
        },
      },
      orderBy: [
        { pageStart: 'asc' },
        { lineStart: 'asc' },
      ],
    },
  },
});
```

---

## Related Documentation

- [Deepgram Legal Config](./DEEPGRAM_LEGAL_CONFIG.md) - Transcription settings
- [Transcript Locking](../lib/transcript-locking.ts) - Lock implementation
- [Confidence Utilities](../lib/confidence.ts) - Word quality handling

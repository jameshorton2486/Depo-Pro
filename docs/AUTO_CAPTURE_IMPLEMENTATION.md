# Auto Capture Tool - Implementation Complete ✅

## Overview

The Auto Capture Tool allows reporters to capture proper nouns during depositions, which are automatically fed to Deepgram for improved transcription accuracy. The system integrates multiple sources of proper nouns and provides a user-friendly interface for live capture.

---

## Features Implemented

### 1. Multi-Source Keyword Integration ✅

The transcription system now fetches proper nouns from three sources:

- **DepositionNote** (`PROPER_NOUN` type) - From reporter notes
- **CSRProperNoun** - Live-captured during deposition
- **CaseExtractedTerm** - AI-extracted from uploaded documents (NOD, CSR paperwork, etc.)

**Files Modified:**
- `lib/transcription/buildKeywords.ts` - Enhanced to fetch from all sources
- `lib/workers/transcription-worker.ts` - Updated with comprehensive logging

**Key Features:**
- Automatic deduplication across all sources
- Priority-based sorting (higher priority terms processed first)
- Boost calculation: Base 15 + priority value (capped at 100)
- Respects Deepgram limits (100 for Nova-3 keyterm, 1000 for Nova-2 keywords)

### 2. Dictionary API Redirection ✅

**File:** `app/api/jobs/[id]/dictionary/route.ts`

- Fixed 503 "feature disabled" error
- Redirects GET/POST requests to `/api/jobs/[id]/proper-nouns`
- Maintains backward compatibility for legacy integrations

### 3. Proper Nouns API (CRUD) ✅

**Files Created:**
- `app/api/jobs/[id]/proper-nouns/route.ts` - List & Create
- `app/api/jobs/[id]/proper-nouns/[nounId]/route.ts` - Update & Delete

**Endpoints:**
- `GET /api/jobs/[id]/proper-nouns` - List all proper nouns for a job
- `POST /api/jobs/[id]/proper-nouns` - Create a new proper noun
- `PATCH /api/jobs/[id]/proper-nouns/[nounId]` - Update a proper noun
- `DELETE /api/jobs/[id]/proper-nouns/[nounId]` - Delete a proper noun

**Security:**
- Authentication required for all endpoints
- Only Reporters and Admins can create/update/delete
- Scopists can read (for reference during review)
- Job ownership verification for Reporters

**Features:**
- Auto-creates CSRRecord if not exists
- Duplicate prevention (unique constraint on `csrRecordId + value`)
- Input validation (value required, valid category)
- Proper error handling with descriptive messages

### 4. Live Notes Capture UI ✅

**File:** `components/jobs/live-notes-capture.tsx`

**Features:**
- Quick-add form with category selection
- 9 category types with icons:
  - 👤 Person Name
  - 🏢 Company Name
  - 📍 Place Name
  - 📄 Product Name
  - ⚖️ Legal Term
  - 🩺 Medical Term
  - 💻 Technical Term
  - # Acronym
  - ❓ Other
- Phonetic hint support
- Priority setting (0-100)
- Real-time list of captured terms
- Edit/Delete functionality
- Search and category filtering
- Loading states and error handling
- Toast notifications for user feedback

**Integration:**
- Added to `app/(dashboard)/jobs/[id]/page.tsx`
- Visible to Reporters and Admins only
- Positioned before ReporterProperNounsPanel

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    AUTO CAPTURE DATA FLOW                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. DOCUMENT UPLOAD (Intake)                                    │
│     ├── User uploads NOD, CSR Paperwork, Depo Notes            │
│     ├── PDF text extracted                                      │
│     ├── Claude AI extracts proper nouns                         │
│     └── Terms saved to CaseExtractedTerm                        │
│                                                                 │
│  2. LIVE CAPTURE (During Deposition)                            │
│     ├── Reporter opens Job Detail page                          │
│     ├── Uses "Live Notes Capture" component                     │
│     ├── Adds names, companies, places as mentioned              │
│     └── Terms saved to CSRProperNoun                            │
│                                                                 │
│  3. TRANSCRIPTION (When triggered)                              │
│     ├── Worker fetches all CSRProperNouns for the job          │
│     ├── Worker fetches all CaseExtractedTerms for linked case  │
│     ├── Worker fetches DepositionNote PROPER_NOUN entries      │
│     ├── Deduplicates across all sources                        │
│     ├── Prioritizes by priority value                          │
│     ├── Limits to 100 terms (Nova-3) or 1000 (Nova-2)         │
│     ├── Sends to Deepgram as keyterms/keywords                 │
│     └── Improved transcription accuracy for proper nouns!       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## API Reference

### GET /api/jobs/[id]/proper-nouns

Lists all proper nouns for a job.

**Response:**
```json
{
  "properNouns": [
    {
      "id": "clx...",
      "value": "Dr. Martinez",
      "category": "PERSON_NAME",
      "phoneticHint": "mar-TEE-nez",
      "priority": 10,
      "useInTranscription": true,
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ]
}
```

### POST /api/jobs/[id]/proper-nouns

Creates a new proper noun.

**Request Body:**
```json
{
  "value": "Dr. Martinez",
  "category": "PERSON_NAME",
  "phoneticHint": "mar-TEE-nez",
  "priority": 10
}
```

**Response:**
```json
{
  "properNoun": {
    "id": "clx...",
    "value": "Dr. Martinez",
    "category": "PERSON_NAME",
    "phoneticHint": "mar-TEE-nez",
    "priority": 10,
    "useInTranscription": true,
    "createdAt": "2024-01-15T10:00:00Z"
  }
}
```

### PATCH /api/jobs/[id]/proper-nouns/[nounId]

Updates a proper noun. All fields are optional.

**Request Body:**
```json
{
  "value": "Dr. John Martinez",
  "category": "PERSON_NAME",
  "phoneticHint": "mar-TEE-nez",
  "priority": 15,
  "useInTranscription": true
}
```

### DELETE /api/jobs/[id]/proper-nouns/[nounId]

Deletes a proper noun.

**Response:**
```json
{
  "success": true
}
```

---

## Testing Checklist

- [x] Transcription worker fetches from all three sources
- [x] Dictionary API redirects correctly
- [x] Proper nouns API endpoints work (CRUD)
- [x] Live Notes Capture UI displays correctly
- [x] Can add proper nouns via UI
- [x] Can edit proper nouns via UI
- [x] Can delete proper nouns via UI
- [x] Search and filtering work
- [x] Component integrated into job detail page
- [ ] Upload documents → verify terms extracted
- [ ] Start transcription → check logs for keyword count
- [ ] Verify proper nouns appear correctly in transcript

---

## Files Modified/Created

| File | Action | Description |
|------|--------|-------------|
| `lib/transcription/buildKeywords.ts` | Modified | Enhanced to fetch from CSRProperNoun and CaseExtractedTerm |
| `lib/workers/transcription-worker.ts` | Modified | Updated logging to show all sources |
| `app/api/jobs/[id]/dictionary/route.ts` | Modified | Redirects to proper-nouns API |
| `app/api/jobs/[id]/proper-nouns/route.ts` | Modified | Added POST endpoint for creating nouns |
| `app/api/jobs/[id]/proper-nouns/[nounId]/route.ts` | Created | Update and delete endpoints |
| `components/jobs/live-notes-capture.tsx` | Created | Live capture UI component |
| `app/(dashboard)/jobs/[id]/page.tsx` | Modified | Integrated LiveNotesCapture component |

---

## Next Steps (Optional Enhancements)

1. **Bulk Import** - Allow pasting a list of terms at once
2. **Term Suggestions** - AI-suggest terms from case documents
3. **Firm Dictionary** - Shared terms across all jobs in a firm
4. **Export/Import** - Save terms to use across cases
5. **Usage Analytics** - Track which terms are most used
6. **Auto-complete** - Suggest terms based on partial input

---

## Notes

- Proper nouns are automatically included in Deepgram transcription
- Higher priority terms get higher boost values (15 + priority)
- Duplicates are prevented at the database level
- CSRRecord is auto-created when first proper noun is added
- All operations require Reporter or Admin role (except read for Scopists)

---

**Status:** ✅ Complete and ready for testing

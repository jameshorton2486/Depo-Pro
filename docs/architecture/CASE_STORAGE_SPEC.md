# Case Storage Specification
Version 1.0

---

## Purpose

This document defines the file-based storage layout for a DEPO-PRO case.
The MVP uses local filesystem storage. No database is required.
Every case is a self-contained directory.

---

## Directory Structure

```
cases/
└── {case_id}/
    ├── case.json                  ← Case metadata (Stage 1)
    ├── keyterms.json              ← Keyterm dictionary (Stage 1)
    ├── intake/
    │   ├── notice_of_deposition.pdf    ← Uploaded intake document
    │   └── intake_notes.txt            ← Any additional intake notes
    ├── audio/
    │   └── {original_filename}.{ext}  ← Uploaded audio/video file
    ├── transcripts/
    │   ├── deepgram_response.json ← Raw Deepgram API response (immutable)
    │   ├── raw_transcript.json    ← Normalized from Deepgram response (immutable)
    │   └── working_transcript.json ← Active working copy (mutable)
    ├── review/
    │   ├── review_state.json      ← Word review flags
    │   └── audit_log.json         ← Append-only edit history
    ├── exhibits/
    │   ├── exhibits.json          ← Exhibit metadata
    │   ├── exhibit_index.json     ← Ordered exhibit list for transcript insertion
    │   └── files/
    │       ├── ex_001.pdf
    │       └── ex_002.pdf
    ├── ufm/
    │   ├── ufm_payload.json       ← Assembled UFM sections
    │   ├── appearance_page.json
    │   └── certificate_page.json
    ├── certification/
    │   ├── certification_record.json
    │   └── validation_report.json
    └── export/
        ├── transcript.docx
        ├── transcript.pdf
        ├── transcript.txt
        └── transcript_package.zip
```

---

## case.json Schema

```json
{
  "version": "1.0",
  "case_id": "string",
  "created_at": "ISO-8601",
  "updated_at": "ISO-8601",
  "stage": "intake | creation | workspace | exhibits | ufm | certification | export",

  "case_caption": {
    "case_name": "string",
    "case_number": "string",
    "court_name": "string",
    "department": "string | null",
    "judge_name": "string | null"
  },

  "deponent": {
    "name": "string",
    "role": "WITNESS | PARTY | EXPERT | OTHER",
    "title": "string | null",
    "employer": "string | null"
  },

  "session": {
    "deposition_date": "YYYY-MM-DD",
    "start_time": "HH:MM | null",
    "end_time": "HH:MM | null",
    "location_address": "string",
    "location_city": "string",
    "location_state": "string",
    "location_zip": "string | null",
    "is_remote": false,
    "remote_platform": "string | null"
  },

  "attorneys": [
    {
      "name": "string",
      "firm": "string | null",
      "role": "EXAMINING | OPPOSING | CO_COUNSEL | OTHER",
      "representing": "string | null",
      "bar_number": "string | null",
      "email": "string | null"
    }
  ],

  "reporter": {
    "name": "string",
    "cert_number": "string",
    "cert_state": "string",
    "firm": "string | null",
    "email": "string | null",
    "phone": "string | null"
  },

  "format": {
    "lines_per_page": 25,
    "chars_per_line": 58,
    "first_page_number": 1,
    "include_line_numbers": true,
    "include_timestamps": false,
    "font_family": "Courier New",
    "font_size_pt": 12
  },

  "stage_completion": {
    "intake": false,
    "creation": false,
    "workspace": false,
    "exhibits": false,
    "ufm": false,
    "certification": false,
    "export": false
  }
}
```

---

## raw_transcript.json Schema

Normalized from Deepgram response. Immutable after creation.

```json
{
  "version": "1.0",
  "case_id": "string",
  "created_at": "ISO-8601",
  "deepgram_request_id": "string",
  "job_id": "string",
  "media_url": "string",
  "duration": 0.0,
  "speakers": [
    {
      "speaker_id": "spk_000",
      "display_name": "SPEAKER 1",
      "deepgram_speaker": 0,
      "role": null
    }
  ],
  "utterances": [
    {
      "utterance_id": "utt_0001",
      "speaker_id": "spk_000",
      "start_time": 0.0,
      "end_time": 4.2,
      "word_ids": ["w_00000001", "w_00000002"]
    }
  ],
  "words": [
    {
      "word_id": "w_00000001",
      "text": "Please",
      "raw_text": "Please",
      "speaker_id": "spk_000",
      "utterance_id": "utt_0001",
      "start_time": 0.0,
      "end_time": 0.35,
      "confidence": 0.97,
      "reviewed": false,
      "edited": false
    }
  ]
}
```

**Important:** `raw_text` on every word is immutable. Never overwrite it after initial creation.

---

## working_transcript.json Schema

Mutable copy. Diverges from `raw_transcript.json` as edits are applied.

Same shape as `raw_transcript.json` with these additions:

```json
{
  "version": "1.0",
  "based_on": "raw_transcript.json",
  "last_saved_at": "ISO-8601",
  "dirty": false
}
```

Text edits update the `text` field on individual words. `raw_text` is never touched.

---

## review_state.json Schema

```json
{
  "version": "1.0",
  "case_id": "string",
  "updated_at": "ISO-8601",
  "reviewed_word_ids": ["w_00000001", "w_00000002"],
  "unreviewed_word_ids": [],
  "review_complete": false,
  "review_pct": 0
}
```

---

## audit_log.json Schema

Append-only. Never delete entries.

```json
{
  "version": "1.0",
  "case_id": "string",
  "entries": [
    {
      "change_id": "string",
      "timestamp": "ISO-8601",
      "utterance_id": "string",
      "word_id": "string | null",
      "old_text": "string",
      "new_text": "string",
      "source": "editor | suggestion-accept | suggestion-edit",
      "suggestion_id": "string | null"
    }
  ]
}
```

---

## exhibits.json Schema

```json
{
  "version": "1.0",
  "case_id": "string",
  "exhibits": [
    {
      "exhibit_id": "ex_001",
      "label": "Exhibit 1",
      "description": "string",
      "filename": "ex_001.pdf",
      "marked_by": "PLAINTIFF | DEFENDANT | COURT | null",
      "admitted": false,
      "page_reference": null,
      "line_reference": null
    }
  ]
}
```

---

## certification_record.json Schema

```json
{
  "version": "1.0",
  "case_id": "string",
  "certified_at": "ISO-8601",
  "certified_by": "string",
  "cert_number": "string",
  "checklist": {
    "review_complete": false,
    "speaker_mapping_complete": false,
    "confidence_review_complete": false,
    "exhibits_complete": false,
    "ufm_complete": false
  },
  "certification_statement": "string",
  "signature_hash": "string | null"
}
```

---

## Case ID Convention

Case IDs are generated at creation time:

```
case_{YYYYMMDD}_{sequence}
```

Example: `case_20240314_001`

The sequence resets per day. Collisions are resolved by incrementing.

---

## File Write Rules

1. `raw_transcript.json` and `deepgram_response.json` are **write-once**. Never overwrite.
2. `working_transcript.json` is overwritten on each save.
3. `audit_log.json` is append-only. Never truncate or rewrite.
4. `case.json` is updated when stage metadata changes.
5. All writes use atomic temp-file-then-rename to prevent corruption on power loss.
6. No file in `export/` is source-of-truth — it can always be regenerated from upstream files.

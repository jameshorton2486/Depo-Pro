# Deepgram Keyterm Specification
Version 1.0

---

## Purpose

This document defines how DEPO-PRO constructs, submits, and applies keyterm (keyword boosting)
data to Deepgram transcription requests.

Keyterms are critical for legal transcription accuracy. Proper names, case-specific terminology,
company names, and technical vocabulary must be submitted to Deepgram at transcription time.

---

## What Are Keyterms

Deepgram supports "keyword boosting" — a list of words or phrases submitted with the transcription
request that increases the model's probability of recognizing those terms in the audio.

In DEPO-PRO:
- Keyterms are collected at Stage 1 (Intake) via the Keyterm Dictionary panel.
- Keyterms are injected into the Deepgram API request at Stage 2 (Transcript Creation).
- Keyterms are persisted in `keyterms.json` alongside `case.json`.

---

## Keyterm Data Structure

### keyterms.json

```json
{
  "version": "1.0",
  "case_id": "string",
  "terms": [
    {
      "term": "string",
      "boost": 0.5,
      "category": "proper_name | company | legal_term | technical | location | other",
      "notes": "string"
    }
  ]
}
```

### Field Definitions

| Field | Type | Required | Description |
|---|---|---|---|
| `term` | string | Yes | The word or phrase to boost. Case-insensitive. |
| `boost` | float | No | Boost intensity. Range: `0.0`–`1.0`. Default: `0.5`. Higher = stronger preference. |
| `category` | enum | No | Classification for display grouping in the UI. |
| `notes` | string | No | Reporter notes. Not sent to Deepgram. Internal only. |

---

## Deepgram API Integration

### Endpoint

```
POST https://api.deepgram.com/v1/listen
```

### Required Headers

```
Authorization: Token {DEEPGRAM_API_KEY}
Content-Type: audio/mpeg  (or appropriate MIME type)
```

### Query Parameters for Keyterm Boosting

Keyterms are passed as repeated `keywords` query parameters:

```
?keywords=Hargrove:0.5&keywords=Meridian%20Infrastructure:0.7&keywords=Riverside%20Bridge:0.6
```

Format: `{term}:{boost}` — term must be URL-encoded.

### Full Parameter Set (MVP)

| Parameter | Value | Notes |
|---|---|---|
| `model` | `nova-2-legal` | Use legal model for best accuracy |
| `language` | `en-US` | Default. Overridable per case. |
| `punctuate` | `true` | Required for transcript formatting |
| `paragraphs` | `false` | DEPO-PRO handles paragraph breaks |
| `utterances` | `true` | Required — DEPO-PRO is utterance-based |
| `diarize` | `true` | Required for speaker assignment |
| `diarize_version` | `latest` | |
| `speakers` | `{n}` | Set from case intake speaker count |
| `smart_format` | `false` | DEPO-PRO handles formatting |
| `numerals` | `false` | Legal transcripts spell out numbers |
| `keywords` | `{term}:{boost}` | Repeated for each keyterm |

---

## Keyterm Construction Rules

1. **Proper names** should be entered as they appear in official documents (e.g. `Hargrove`, `Jonathan Hargrove`).
2. **Multi-word terms** are passed as a single entry (e.g. `Meridian Infrastructure Partners`).
3. **Abbreviations** should be entered if spoken aloud (e.g. `CSR`, `ASCE`).
4. **Boost defaults:** `0.5` for general terms, `0.7` for critical proper names, `0.9` for terms confirmed difficult for the model.
5. **Maximum keyterms:** Deepgram supports up to 200 keyword entries per request. Warn the user if this limit is approached.
6. **Boost cap:** Never exceed `1.0`. Values above `1.0` are rejected by the API.

---

## Keyterm Sources

The Keyterm Dictionary is populated from:

| Source | How |
|---|---|
| Manual entry | Reporter types terms into the Keyterm Dictionary panel at Stage 1 |
| Notice of Deposition | Parsed from uploaded intake document (future — NLP extraction) |
| Prior cases | Imported from a previous `keyterms.json` for the same case or client |
| AI suggestion | Future feature — suggest keyterms from case name and attorney names |

---

## keyterms.json — Full Example

```json
{
  "version": "1.0",
  "case_id": "case_20240314_001",
  "terms": [
    {
      "term": "Jonathan Hargrove",
      "boost": 0.8,
      "category": "proper_name",
      "notes": "Deponent — verify spelling against ID"
    },
    {
      "term": "Meridian Infrastructure Partners",
      "boost": 0.7,
      "category": "company",
      "notes": "Employer of deponent"
    },
    {
      "term": "Riverside Bridge",
      "boost": 0.7,
      "category": "location",
      "notes": "Subject project"
    },
    {
      "term": "diarization",
      "boost": 0.5,
      "category": "technical",
      "notes": ""
    },
    {
      "term": "ASCE",
      "boost": 0.6,
      "category": "legal_term",
      "notes": "American Society of Civil Engineers — may appear in testimony"
    }
  ]
}
```

---

## Error Handling

| Error | Handling |
|---|---|
| Deepgram rejects a keyterm (invalid characters) | Strip and warn reporter before submission |
| Boost value out of range | Clamp to `0.0`–`1.0` silently, log warning |
| Keyterm count exceeds 200 | Block submission, show count indicator, ask reporter to trim |
| API key missing | Block Stage 2 entry, show configuration prompt |
| API timeout | Retry up to 3 times with exponential backoff, then show error |

---

## Notes

- The Deepgram API key is never stored in `case.json` or `keyterms.json`.
- In MVP (local execution), the API key is stored in a local `.env` file.
- The keyterm boost values are subjective starting points — reporters should tune based on results.

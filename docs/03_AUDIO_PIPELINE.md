# DEPO-PRO AUDIO PROCESSING PIPELINE SPECIFICATION
**Version:** 1.0 | **Date:** March 2026 | **Status:** Authoritative  
**Companion to:** `01_MASTER_ARCHITECTURE.md`

> This document defines the complete audio ingestion and enhancement pipeline.
> Every AI agent working on audio-related code must read this first.

---

## TABLE OF CONTENTS

1. [Pipeline Overview](#1-pipeline-overview)
2. [Accepted Formats & Constraints](#2-accepted-formats--constraints)
3. [Audio Quality Scoring](#3-audio-quality-scoring)
4. [Automated FFmpeg Enhancement](#4-automated-ffmpeg-enhancement)
5. [Deepgram Transcription](#5-deepgram-transcription)
6. [Post-Processing & Formatting](#6-post-processing--formatting)
7. [Video File Handling](#7-video-file-handling)
8. [Multiple Audio Files](#8-multiple-audio-files)
9. [Manual Enhancement (Poor Quality Audio)](#9-manual-enhancement-poor-quality-audio)
10. [RX Queue (Manual Review Routing)](#10-rx-queue-manual-review-routing)
11. [Pipeline Error Handling](#11-pipeline-error-handling)
12. [File Naming Conventions](#12-file-naming-conventions)

---

## 1. Pipeline Overview

```
User uploads audio/video file
         │
         ▼
┌─────────────────────────┐
│  1. VALIDATE            │  ffprobe analysis — format, duration, channels
│     lib/transcription/  │  MAX 2GB. Abort if no audio track.
│     validate.ts         │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  2. QUALITY SCORE       │  scoreAudioQuality() → 0–100 score + tier
│     lib/transcription/  │  Stored in transcriptions.metadata
│     preprocessor.ts     │  UNUSABLE → abort with user-facing error
└────────────┬────────────┘
             │
             │ POOR tier → AGGRESSIVE_NORMALIZATION_CONFIG
             │ Others   → DEFAULT_NORMALIZATION_CONFIG
             ▼
┌─────────────────────────┐
│  3. FFMPEG ENHANCEMENT  │  Neural denoising + normalization
│     lib/transcription/  │  Output: 16kHz mono 16-bit PCM WAV
│     preprocessor.ts     │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  4. CHUNK (if needed)   │  Files > 30 minutes split into chunks
│     lib/transcription/  │  Parallel processing with overlap dedup
│     chunking.ts         │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  5. DEEPGRAM NOVA-3     │  Word-level timestamps, confidence scores
│     lib/transcription/  │  Multi-speaker diarization
│     index.ts            │  Custom legal vocabulary hints
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  6. REASSEMBLE          │  Merge chunks, deduplicate overlaps
│     lib/transcription/  │  Align timestamps across chunks
│     reassemble.ts       │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  7. POST-PROCESS        │  Text cleanup rules, verbatim preservation
│     src/lib/            │  Q/A formatting, speaker normalization
│     transcription/      │
│     post-process.ts     │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  8. FLAG EXTRACTION     │  Words below 0.85 confidence flagged
│     pipeline.ts         │  Confidence analytics calculated and stored
│                         │  Risk score computed
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  9. HYDRATE + FORMAT    │  transcript_words table hydrated
│     lib/transcription/  │  Legal formatting applied (tabs, Q/A, labels)
│     formatter/          │  DOCX structure prepared
└────────────┬────────────┘
             │
             ▼
         COMPLETE
   Job status → READY_FOR_EDIT
   Notification sent to scopist or reporter
```

**Confidence threshold:** `LOW_CONFIDENCE_THRESHOLD=0.85` (env var)  
Words with confidence < 0.85 are automatically flagged for review.

---

## 2. Accepted Formats & Constraints

### Supported Audio Formats
| Format | Extension | Notes |
|---|---|---|
| MP3 | `.mp3` | Most common from court reporting agencies |
| WAV | `.wav` | Preferred — no conversion needed |
| M4A | `.m4a` | Common from iPhone recordings |
| MP4 (audio) | `.mp4` | Audio-only MP4 files |

### Supported Video Formats
| Format | Extension | Notes |
|---|---|---|
| MP4 | `.mp4` | Standard video format |
| MOV | `.mov` | Common from Mac/iPhone video |

### Constraints
| Constraint | Value |
|---|---|
| **Maximum file size** | 2GB per file |
| **Minimum duration** | No minimum (< 30s triggers warning) |
| **Maximum duration** | No limit (chunking handles long files) |
| **Chunk size** | 30-minute chunks with overlap |

---

## 3. Audio Quality Scoring

**Function:** `scoreAudioQuality(filePath)` in `lib/transcription/preprocessor.ts`  
**When called:** Before FFmpeg processing — Stage 2 of pipeline  
**Result stored:** `transcriptions.metadata.audio_quality_score` etc.

### Return Shape

```typescript
interface AudioQualityScore {
  score: number           // 0–100
  tier: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'UNUSABLE'
  issues: string[]        // specific problems detected
  requiresManualReview: boolean  // true when score < 40
  metadata: AudioAnalysisMetadata
}
```

### Tier Thresholds

| Score | Tier | Action |
|---|---|---|
| 85–100 | EXCELLENT | Standard processing |
| 70–84 | GOOD | Standard processing |
| 50–69 | FAIR | Standard processing |
| 25–49 | POOR | **Automatic aggressive processing** |
| 0–24 | UNUSABLE | **Pipeline abort** — user-facing error |

### Scoring Factors

| Factor | Penalty | Condition |
|---|---|---|
| Very low bitrate | −35 pts | < 32 kbps (likely phone voicemail) |
| Low bitrate | −20 pts | < 64 kbps |
| Slightly low bitrate | −8 pts | < 128 kbps |
| Very low sample rate | −40 pts | < 8 kHz (speech unintelligible) |
| Low sample rate | −15 pts | < 16 kHz |
| No audio track | −100 pts | File may be video-only or corrupt |
| Phone codec | −30 pts | gsm, amr_nb, amr_wb, g726, g711 |
| Unknown codec | −10 pts | Cannot determine quality |
| Files scoring < 40 | — | `requiresManualReview = true` |

### Example Metadata Stored

```json
{
  "audio_quality_score": 62,
  "audio_quality_tier": "FAIR",
  "audio_quality_issues": [
    "Low bitrate (64kbps) — quality may be reduced"
  ]
}
```

---

## 4. Automated FFmpeg Enhancement

**Source:** `lib/transcription/preprocessor.ts`  
**Function:** `normalizeAudioForTranscription(inputPath, config?)`  
**Output:** 16kHz mono 16-bit PCM WAV

### DEFAULT Filter Chain

Applied in this exact order to every audio file (EXCELLENT, GOOD, FAIR tiers):

```bash
highpass=f=80
arnndn=m=cb
afftdn=nr=15:nf=-25
acompressor=threshold=-25dB:ratio=4:attack=5:release=50:makeup=2
loudnorm=I=-16:TP=-1.5:LRA=11
```

| Filter | Purpose | Why It Matters |
|---|---|---|
| `highpass=f=80` | Remove sub-80Hz rumble, handling noise, AC hum | Court reporting rooms often have HVAC noise; Zoom adds low-frequency compression artifacts |
| `arnndn=m=cb` | RNN neural network noise suppression, 'cb' model | Best available speech-specific denoiser; trained to separate voice from noise; dramatically improves Zoom recordings and phone audio |
| `afftdn=nr=15:nf=-25` | FFT spectral denoising, stationary noise removal | Targets constant background noise (AC hum, electrical hiss, fan noise) that arnndn misses |
| `acompressor=threshold=-25dB:ratio=4:attack=5:release=50:makeup=2` | Dynamic range compression | Court reporters typically speak at lower volume than witnesses/attorneys; this evens out all speakers for consistent Deepgram input |
| `loudnorm=I=-16:TP=-1.5:LRA=11` | EBU R128 loudness normalization | Ensures consistent input volume to Deepgram regardless of original recording level; -16 LUFS is the speech standard |

**Output codec:** `pcm_s16le` (16-bit PCM)  
**Sample rate:** 16000 Hz (optimal for Deepgram Nova-3)  
**Channels:** 1 (mono)

### AGGRESSIVE Filter Chain (POOR tier — auto-selected)

Applied automatically when quality score < 50:

```bash
highpass=f=100          # Higher cutoff — removes more rumble
arnndn=m=cb             # Same neural suppression
afftdn=nr=20:nf=-25     # Stronger FFT denoising (nr=20 vs 15)
acompressor=threshold=-25dB:ratio=4:attack=5:release=50:makeup=2
anequalizer=c0 f=6000 w=3000 g=-6 t=0   # De-esser (reduces harsh sibilance)
loudnorm=I=-16:TP=-1.5:LRA=11
```

### Config Objects

```typescript
// Exported from lib/transcription/preprocessor.ts

DEFAULT_NORMALIZATION_CONFIG: NormalizationConfig = {
  sampleRate: 16000,
  channels: 1,
  outputFormat: 'wav',
  loudnorm: true,
  highpassFilter: true,
  highpassFrequency: 80,
  arnndn: true,
  afftdn: true,
  afftdnStrength: 0.15,
  compress: true,
  deess: false,
}

AGGRESSIVE_NORMALIZATION_CONFIG: NormalizationConfig = {
  ...DEFAULT_NORMALIZATION_CONFIG,
  highpassFrequency: 100,
  afftdnStrength: 0.35,
  deess: true,
}
```

### When Normalization is Skipped

`needsNormalization(filePath)` returns `false` only when:
- Format is already WAV
- Sample rate is already 16000 Hz
- Channels is already 1 (mono)

Even then, POOR tier files are still processed through the AGGRESSIVE config.

---

## 5. Deepgram Transcription

**Source:** `lib/transcription/index.ts`, `lib/deepgram/`  
**Model:** Nova-3 (default) or `nova-2-medical` (ENHANCED tier)

### Deepgram Configuration

```typescript
{
  model: 'nova-3',          // or 'nova-2-medical' for ENHANCED tier
  smart_format: true,
  diarize: true,            // multi-speaker
  punctuate: true,
  utterances: true,
  language: 'en-US',
  keywords: [/* built by buildKeywordsForJob() */]
}
```

### Custom Vocabulary (Legal Keywords)

`buildKeywordsForJob(jobId)` in `lib/transcription/buildKeywords.ts` constructs a
keyword list from:
- Deponent name
- Attorney names (from `case_attorneys`)
- Case-specific proper nouns
- Location names (from `deposition_sessions`)
- Custom vocabulary (`custom_vocabularies` table)
- Firm vocabulary (`firm_vocabularies` table)

This is how we prevent Deepgram from misrecognizing names like "Miah Bardot"
as "Miyamardeau."

### Deepgram Word Object

```typescript
{
  word: string,
  start: number,      // seconds from audio start
  end: number,        // seconds from audio start
  confidence: number, // 0.0–1.0
  speaker: number,    // 0-indexed speaker ID (diarization)
  punctuated_word: string
}
```

### Storage of Results

Raw Deepgram JSON stored in `transcriptions.deepgram_json` (JSONB).  
Path: `result.results.channels[0].alternatives[0].words[]`

---

## 6. Post-Processing & Formatting

After Deepgram completes, the pipeline runs several cleanup passes:

### Stage 4.5: Text Post-Processing
`src/lib/transcription/post-process.ts`
- Text cleanup rules applied
- Verbatim integrity preserved
- Double-word AI artifacts removed
- Speaker normalization

### Stage 5: Flag Extraction
- Words with `confidence < 0.85` → inserted into `flagged_words` table
- Confidence analytics calculated → stored in `transcriptions.metadata`
- Risk score computed → stored in `transcriptions.metadata`

### Stage 5.5: Hydration & Formatting
- `hydrateWords()` → populates `transcript_words` table with word-level data
- `formatTranscriptWithAdmin()` → applies legal formatting:
  - Q/A structure for examination lines
  - Speaker labels (`THE REPORTER:`, `THE WITNESS:`, etc.)
  - Tab formatting per legal spec
  - Em dashes → `--`
  - Reporter label: `THE REPORTER:` (NOT `THE COURT REPORTER:`)
  - Numbers 1–10 spelled out for count nouns

**See `DEPO_PRO_FORMATTER_SPEC.md` for complete formatting rules.**

---

## 7. Video File Handling

### Upload Behavior
1. Video file (MP4/MOV) accepted and stored **as-is** in Supabase Storage at
   `cases/{cause_number}/jobs/{job_id}/video/`
2. FFmpeg extracts audio track **in a single pass** (not extract then normalize)
   using `extractAndNormalizeFromVideo()` from `lib/transcription/preprocessor.ts`
3. Extracted+normalized WAV is used for Deepgram transcription
4. Original video remains stored for proofing reference

### Proofing with Video
- Video streamed in-browser via Supabase signed URLs
- Allows scopists/reporters to observe non-verbal cues during corrections
- Signed URL generation handled by Supabase Storage API (no custom server)

### Priority Rule (When Both Audio and Video Exist)
```
If audio file uploaded → use audio track for Deepgram
If only video uploaded → extract audio from video
If both exist → PREFER AUDIO (higher quality from dedicated recorder)
User can override via "Use Video Audio" toggle on job page
```

---

## 8. Multiple Audio Files

A single deposition job can have multiple audio files:
- Primary recorder
- Backup recorder
- Videographer's audio track
- Court's recording system

### is_primary_audio Flag
Each file upload sets `is_primary_audio` on the job file record.
Only one file can be `is_primary_audio = true` at a time.

### Selection UI
On the job detail page, when multiple audio files are present:
- Dropdown: "Select audio for transcription"
- Files listed by name and upload date
- Current primary clearly indicated
- Reporter can change selection before triggering transcription

### Transcription
Only the `is_primary_audio = true` file is sent to Deepgram.
Other files remain stored for reference.

---

## 9. Manual Enhancement (Poor Quality Audio)

For recordings that score POOR or UNUSABLE, or where the automated transcript
has an unacceptably high flagged word rate, the manual Python script should be
used before re-uploading.

**When to use:**
- Audio quality score below 40 (POOR or UNUSABLE tier)
- Transcript flagged word rate > 30%
- Obvious background noise, hum, or distortion audible to the ear
- Phone recordings, laptop microphone recordings, courtroom echo

### Script Location
```
scripts/audio/enhance.py
scripts/audio/README.md
```

### Installation (One-Time)
```bash
# Python dependencies
pip install pydub noisereduce scipy numpy

# FFmpeg (must be installed on local machine)
# Windows:
winget install ffmpeg

# Mac:
brew install ffmpeg
```

### Usage

```bash
# Basic — standard enhancement
python scripts/audio/enhance.py input.mp3 output.wav

# Aggressive — for very poor quality recordings
python scripts/audio/enhance.py input.mp3 output.wav --aggressive

# With noise profile — best results
# Record 1–3 seconds of background noise with no speech, save as noise.wav
python scripts/audio/enhance.py input.mp3 output.wav --profile noise.wav

# Analyze only — report quality without processing
python scripts/audio/enhance.py input.mp3 output.wav --analyze

# Video input → WAV output
python scripts/audio/enhance.py deposition.mp4 output.wav
```

### What the Script Does

```
Input (any format)
  ↓
FFmpeg → Convert to 44.1kHz mono WAV
  ↓
noisereduce → Spectral noise reduction
              (with optional noise profile for best results)
  ↓
FFmpeg → highpass + acompressor + loudnorm
  ↓
FFmpeg → Resample to 16kHz mono WAV
  ↓
Output WAV (upload to Depo-Pro instead of original)
```

### After Running the Script
Upload the output `.wav` file to Depo-Pro instead of the original.
The server-side FFmpeg pipeline will still run — but it will have much
cleaner input.

### Getting a Noise Profile
Find a 1–3 second segment of the recording where no one is speaking
(before the reporter opens the record, during a long pause, etc.).
Trim it to a separate file and use `--profile`. This produces the best
noise reduction results because the algorithm knows exactly what to remove.

---

## 10. RX Queue (Manual Review Routing)

The RX queue allows admins to route jobs to a manual processing queue
instead of the automated pipeline. This is used for recordings that need
special handling (e.g., complex multi-channel recordings, unusual formats).

### Processing Mode

Set via `internal_notes` JSON on the job:
```json
{ "processingMode": { "mode": "MANUAL_RX", "modelTier": "STANDARD" } }
```

### Current Status (Beta)

- `addToRxQueue()`, `getRxQueue()`, `processRxItem()` are stubs
- Routes poor audio to a dummy queue
- Admin UI exists at `/admin/rx-queue`
- **Upstash Redis + BullMQ needed for real implementation (post-beta)**
- `USE_QUEUE=false` in environment (in-memory acceptable at beta scale)

### Post-Beta RX Queue Implementation

1. Set `REDIS_URL` to Upstash Redis URL
2. Set `USE_QUEUE=true`
3. `lib/queue/` contains BullMQ worker scaffolding ready to activate

---

## 11. Pipeline Error Handling

### FAILED Status

If the pipeline fails at any stage, the job is set to `FAILED` status.

```typescript
// In pipeline.ts catch block:
await updateJobStatus(jobId, 'FAILED');
await logAuditEvent(jobId, 'TRANSCRIPTION_FAILED');
// Error message stored in processing_errors table
```

### Retry Behavior

Jobs in `FAILED` status can be retried by:
1. Reporter/admin navigates to job page
2. Clicks "Retry Transcription"
3. Pipeline resets job to `PENDING` and restarts from Stage 1

### Resumable Pipeline

The pipeline is **resumable**: if it fails mid-chunk, completed chunks are not
re-transcribed on restart. Progress is tracked in `transcription_chunks` table.

### Common Failure Modes

| Failure | Cause | Resolution |
|---|---|---|
| `Audio validation failed` | Corrupt file, no audio track | Re-upload correct file |
| `Audio quality is too low` | UNUSABLE tier score | Run manual enhancement script |
| `Deepgram timeout` | Large file, network issue | Retry — chunking handles retries |
| `Deepgram API error` | API key, rate limit | Check `DEEPGRAM_API_KEY` env var |
| `Formatter failed` | Non-fatal — logged, not fatal | Transcript may lack formatting |

---

## 12. File Naming Conventions

Court reporting agencies typically deliver audio files named:
```
{date}-{DeponentName}_audio.{ext}

Examples:
  3-11-2026-Bianca Perez_audio.mp3
  3-11-2026-SIMON UGALDE_audio.mp3
  2026-03-11_PerezBianca.wav
```

Depo-Pro normalizes uploaded filenames on storage. The original filename
is preserved in `jobs.audio_file_name` for reference.

**Storage naming after normalization:**
```
cases/2025CI12281/
  jobs/{job_id}/
    audio/
      original_3-11-2026-Bianca Perez_audio.mp3   ← original preserved
      primary_audio.wav                             ← normalized for Deepgram
```

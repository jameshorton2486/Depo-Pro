# High-Accuracy Transcription Module — Implementation Summary

## What Was Built

### 7 Files Modified/Created

| File | Action | Purpose |
|------|--------|---------|
| `lib/transcription/preprocessor.ts` | **Replaced** (was stubs) | Audio normalization engine — converts any audio/video to 16kHz mono WAV using FFmpeg |
| `lib/transcription/pipeline.ts` | **Modified** | Added normalization stage between validation and chunking |
| `app/transcription-tool/page.tsx` | **Created** | New dedicated page at `/transcription-tool` |
| `app/api/transcription-tool/start/route.ts` | **Created** | API endpoint for file upload + pipeline trigger |
| `app/(dashboard)/reporter/page.tsx` | **Modified** | Added "High-Accuracy Transcription" button in Quick Actions |
| `app/(dashboard)/scopist/page.tsx` | **Modified** | Added "High-Accuracy Transcription" button above Quick Tips |
| `app/(dashboard)/admin/page.tsx` | **Modified** | Added "High-Accuracy Transcription" button in header |

---

## Architecture

### Audio Normalization Flow

```
User uploads file (audio or video)
        ↓
Upload to Supabase Storage (depo-audio bucket)
        ↓
Pipeline starts → VALIDATING
  - Download from storage
  - ffprobe validates format, duration, channels
        ↓
NEW STAGE → NORMALIZING
  - needsNormalization() checks if already 16kHz mono WAV
  - If not: normalizeAudioForTranscription()
    - FFmpeg: -vn (strip video) -ac 1 (mono) -ar 16000 (16kHz)
    - highpass=f=80 (remove rumble)
    - loudnorm=I=-16:TP=-1.5:LRA=11 (EBU R128 normalization)
    - Output: 16-bit PCM WAV
        ↓
CHUNKING (if > 30 min) → TRANSCRIBING → REASSEMBLING
        ↓
EXTRACTING_FLAGS → COMPLETE
```

### What the Normalizer Does

| Parameter | Before | After |
|-----------|--------|-------|
| Sample rate | Variable (8kHz–96kHz) | 16,000 Hz |
| Channels | Variable (mono/stereo/5.1) | 1 (mono) |
| Format | MP3/M4A/MP4/MOV/etc. | WAV (PCM 16-bit) |
| Volume | Variable | EBU R128 normalized |
| Low-frequency noise | Present | Filtered (80Hz highpass) |

**Expected improvement:** 3–8% confidence uplift, fewer false flagged words, better speaker separation, cleaner medical term recognition.

---

## Role Permissions

| Role | Access Tool? | Create New Job? | Attach to Existing? |
|------|-------------|----------------|-------------------|
| Court Reporter | ✅ | ✅ | ✅ (own firm's jobs) |
| Scopist | ✅ | ❌ | ✅ (assigned jobs only) |
| Admin | ✅ | ✅ | ✅ (all jobs) |

---

## Page Features (`/transcription-tool`)

- **Drag & drop** file upload with click-to-browse fallback
- **File validation** — type, size (2GB max), empty file check
- **Video badge** — shows "Video — audio will be extracted" for video files
- **Job mode toggle** — "Create New Job" or "Attach to Existing Job"
- **Job dropdown** — loads existing jobs from `/api/jobs`
- **Progress tracking** — upload percentage with step indicators
- **Success state** — links to Status page and Review page
- **Error handling** — clear error messages with retry option

---

## Deployment Notes

### No New Dependencies Required
- `fluent-ffmpeg` and `@ffmpeg-installer/ffmpeg` already in `package.json`
- Already listed in `next.config.ts` → `serverExternalPackages`

### Vercel Considerations
- API route has `maxDuration = 300` (5 min, Vercel Pro limit)
- Pipeline runs async after upload response — no timeout on initial request
- For files > ~30 minutes, the polling/resume pattern from the existing pipeline handles timeouts

### No Database Schema Changes
- Uses existing `jobs`, `files`, `transcriptions`, `flagged_words` tables
- No new tables or columns needed

---

## Testing Checklist

### Test 1: Small Audio File (5-min WAV)
- [ ] Upload via `/transcription-tool`
- [ ] Normalization completes (check server logs for `[Preprocessor]`)
- [ ] Transcript saved with words array
- [ ] Flagged words extracted
- [ ] Review page loads

### Test 2: Video File (MP4)
- [ ] Upload MP4 via the tool
- [ ] Audio extraction + normalization in single pass
- [ ] "Video — audio will be extracted" badge shows
- [ ] Transcript completes successfully

### Test 3: Already-Optimal File (16kHz mono WAV)
- [ ] Upload pre-normalized WAV
- [ ] Logs show "Audio already in optimal format, skipping normalization"
- [ ] No unnecessary FFmpeg processing

### Test 4: Role Access
- [ ] Reporter sees button on dashboard, can create new jobs
- [ ] Scopist sees button, can only attach to assigned jobs
- [ ] Admin sees button in header, full access

### Test 5: Dashboard Buttons
- [ ] Reporter dashboard → Quick Actions → "High-Accuracy Transcription"
- [ ] Scopist dashboard → sidebar → "High-Accuracy Transcription"
- [ ] Admin dashboard → header → "High-Accuracy Transcription"
- [ ] All three link to `/transcription-tool`

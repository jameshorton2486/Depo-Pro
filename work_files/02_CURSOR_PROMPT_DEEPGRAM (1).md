# CURSOR PROMPT: Deepgram Integration (ENHANCED)

**Document 2 of 5** | **Copy this entire file into Cursor**  
**Updated with Nova-3 model and webhook pattern from your research**

---

## PROMPT FOR CURSOR AI

```
@workspace I need to implement real Deepgram transcription in this Next.js project. Currently, `lib/transcription.ts` returns mock data. Replace it with actual Deepgram API calls using the Nova-3 model.

## CONTEXT

This is a legal transcription SaaS (Depo-Pro) for court reporters and scopists. The project uses:
- Next.js 15 with App Router
- @deepgram/sdk (already installed)
- Prisma with PostgreSQL (Supabase)
- TypeScript
- Vercel deployment (10-60s function timeout)

## CURRENT FILE TO MODIFY

File: `lib/transcription.ts`

The current `transcribeWithDeepgram()` function returns mock data:
```typescript
async function transcribeWithDeepgram(audioBuffer: Buffer, options: TranscriptionOptions) {
  console.log('Deepgram requested but not configured - using mock');
  return transcribeLocal(audioBuffer, options);
}
```

## REQUIREMENTS

### 1. Replace mock with real Deepgram SDK v4 calls

Use this configuration optimized for legal/deposition audio (from Depo-Pro research):
```typescript
{
  model: 'nova-3',           // NOVA-3: Highest accuracy for multi-speaker depositions
  language: 'en-US',
  smart_format: true,        // Handles punctuation/capitalization
  diarize: true,             // CRITICAL for speaker identification
  utterances: true,          // Groups words into logical sentences
  filler_words: true,        // IMPORTANT: Required for "verbatim" legal transcripts
  punctuate: true,
  paragraphs: true,
}
```

**Why Nova-3?** Your research shows the 85% confidence threshold is much more reliable on Nova-3, reducing workload for Scopists.

**Why filler_words: true?** Legal transcripts often require verbatim accuracy including "um", "uh".

### 2. Return this data structure

```typescript
interface DeepgramResult {
  text: string;              // Full transcript
  confidence: number;        // Overall confidence 0-1
  duration: number;          // Audio duration in seconds
  words: Array<{
    word: string;
    start: number;           // Start time in seconds
    end: number;             // End time in seconds
    confidence: number;      // Word confidence 0-1
    speaker?: number;        // Speaker ID (0, 1, 2...)
    punctuated_word?: string; // Word with punctuation
  }>;
  utterances?: Array<{
    speaker: number;
    start: number;
    end: number;
    transcript: string;
    confidence: number;
  }>;
  speakerCount: number;
}
```

### 3. Extract flagged segments (low-confidence words)

After transcription, identify words with confidence < 0.85:
```typescript
const flaggedSegments = words
  .map((word, index) => ({ ...word, wordIndex: index }))
  .filter(word => word.confidence < 0.85)
  .map(word => ({
    wordIndex: word.wordIndex,
    word: word.word,
    confidence: word.confidence,
    start: word.start,
    end: word.end,
    context: getWordContext(words, word.wordIndex, 5), // 5 words before/after
    alternatives: [], // Deepgram alternatives if available
  }));
```

### 4. Error handling

Handle these Deepgram errors:
- Rate limiting (429) → Implement exponential backoff
- Invalid API key (401) → Throw clear error
- Audio format issues → Throw with helpful message
- Timeout → Retry up to 3 times

### 5. Also update the API route

File: `app/api/jobs/[id]/transcribe/route.ts`

This route should:
1. Get the job and its audio file
2. Download audio from storage
3. Call the transcription service
4. Create/update Transcription record in database
5. Store flaggedSegments in the Transcription.flaggedSegments JSON field
6. Update job status to AI_COMPLETE
7. Return progress updates (for future real-time status)

### 6. Database update

After transcription, update the Transcription model:
```typescript
await prisma.transcription.upsert({
  where: { jobId },
  create: {
    jobId,
    status: 'COMPLETED',
    fullTranscript: result.text,
    confidence: result.confidence,
    words: result.words,              // JSON field
    utterances: result.utterances,    // JSON field
    speakerCount: result.speakerCount,
    flaggedSegments: flaggedSegments, // JSON field - critical for review UI
    modelUsed: 'nova-2-general',
    modelVersion: 'nova-2',
    audioDuration: result.duration,
  },
  update: {
    status: 'COMPLETED',
    fullTranscript: result.text,
    confidence: result.confidence,
    words: result.words,
    utterances: result.utterances,
    speakerCount: result.speakerCount,
    flaggedSegments: flaggedSegments,
    completedAt: new Date(),
  },
});
```

## FILES TO MODIFY

1. `lib/transcription.ts` - Main transcription service
2. `app/api/jobs/[id]/transcribe/route.ts` - API route
3. `types/deepgram.ts` - Type definitions (if needed)

## TESTING

After implementation, I should be able to:
1. Upload an audio file to a job
2. Trigger transcription via POST /api/jobs/[id]/transcribe
3. See the transcript with word timestamps in the database
4. See flaggedSegments populated with low-confidence words

Please implement this step by step, showing me each file change.
```

---

## EXPECTED OUTPUT FILES

After Cursor completes this prompt, you should have:

### lib/transcription.ts (Updated)

```typescript
// ═══════════════════════════════════════════════════════════════
// TRANSCRIPTION SERVICE - Real Deepgram Implementation
// ═══════════════════════════════════════════════════════════════

import { createClient, PrerecordedTranscriptionResponse } from '@deepgram/sdk';

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

// Types
export interface TranscriptionWord {
  word: string;
  start: number;
  end: number;
  confidence: number;
  speaker?: number;
  punctuated_word?: string;
}

export interface TranscriptionResult {
  text: string;
  confidence: number;
  duration: number;
  words: TranscriptionWord[];
  utterances?: Array<{
    speaker: number;
    start: number;
    end: number;
    transcript: string;
    confidence: number;
  }>;
  speakerCount: number;
  flaggedSegments: FlaggedSegment[];
}

export interface FlaggedSegment {
  wordIndex: number;
  word: string;
  confidence: number;
  start: number;
  end: number;
  context: string;
  alternatives: string[];
}

export interface TranscriptionOptions {
  language?: string;
  model?: string;
  diarize?: boolean;
  customVocabulary?: string[];
}

// ═══════════════════════════════════════════════════════════════
// MAIN TRANSCRIPTION FUNCTION
// ═══════════════════════════════════════════════════════════════

export async function transcribeAudio(
  audioBuffer: Buffer,
  options: TranscriptionOptions = {}
): Promise<TranscriptionResult> {
  if (!DEEPGRAM_API_KEY) {
    throw new Error('DEEPGRAM_API_KEY is not configured');
  }

  const deepgram = createClient(DEEPGRAM_API_KEY);

  try {
    const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
      audioBuffer,
      {
        model: options.model || 'nova-2',
        language: options.language || 'en-US',
        punctuate: true,
        diarize: options.diarize !== false,
        smart_format: true,
        utterances: true,
        paragraphs: true,
        filler_words: false,
        keywords: options.customVocabulary || [],
      }
    );

    if (error) {
      throw new Error(`Deepgram error: ${error.message}`);
    }

    return processDeepgramResponse(result);
  } catch (err) {
    console.error('Transcription failed:', err);
    throw err;
  }
}

// ═══════════════════════════════════════════════════════════════
// PROCESS DEEPGRAM RESPONSE
// ═══════════════════════════════════════════════════════════════

function processDeepgramResponse(
  response: PrerecordedTranscriptionResponse
): TranscriptionResult {
  const channel = response.results?.channels?.[0];
  const alternative = channel?.alternatives?.[0];

  if (!alternative) {
    throw new Error('No transcription results returned');
  }

  const words: TranscriptionWord[] = (alternative.words || []).map((w) => ({
    word: w.word,
    start: w.start,
    end: w.end,
    confidence: w.confidence,
    speaker: w.speaker,
    punctuated_word: w.punctuated_word,
  }));

  const utterances = response.results?.utterances?.map((u) => ({
    speaker: u.speaker,
    start: u.start,
    end: u.end,
    transcript: u.transcript,
    confidence: u.confidence,
  }));

  // Count unique speakers
  const speakers = new Set(words.map((w) => w.speaker).filter((s) => s !== undefined));

  // Extract low-confidence words
  const flaggedSegments = extractFlaggedSegments(words, 0.85);

  return {
    text: alternative.transcript,
    confidence: alternative.confidence,
    duration: response.metadata?.duration || 0,
    words,
    utterances,
    speakerCount: speakers.size,
    flaggedSegments,
  };
}

// ═══════════════════════════════════════════════════════════════
// EXTRACT LOW-CONFIDENCE WORDS
// ═══════════════════════════════════════════════════════════════

function extractFlaggedSegments(
  words: TranscriptionWord[],
  threshold: number
): FlaggedSegment[] {
  return words
    .map((word, index) => ({ ...word, wordIndex: index }))
    .filter((word) => word.confidence < threshold)
    .map((word) => ({
      wordIndex: word.wordIndex,
      word: word.word,
      confidence: word.confidence,
      start: word.start,
      end: word.end,
      context: getWordContext(words, word.wordIndex, 5),
      alternatives: [], // Could be populated from Deepgram alternatives
    }));
}

function getWordContext(
  words: TranscriptionWord[],
  index: number,
  contextSize: number
): string {
  const start = Math.max(0, index - contextSize);
  const end = Math.min(words.length, index + contextSize + 1);
  
  return words
    .slice(start, end)
    .map((w, i) => {
      const actualIndex = start + i;
      if (actualIndex === index) {
        return `[${w.punctuated_word || w.word}]`;
      }
      return w.punctuated_word || w.word;
    })
    .join(' ');
}

// ═══════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export function isAudioFile(mimeType: string): boolean {
  return mimeType.startsWith('audio/') || mimeType.startsWith('video/');
}
```

---

## VERIFICATION CHECKLIST

After implementation, verify:

- [ ] `npm run typecheck` passes
- [ ] Environment variable `DEEPGRAM_API_KEY` is set
- [ ] Environment variable `USE_DEEPGRAM=true` is set
- [ ] Upload audio file to a job
- [ ] POST to `/api/jobs/[id]/transcribe` returns 200
- [ ] Transcription record created in database
- [ ] `fullTranscript` field populated
- [ ] `words` JSON field has array with timestamps
- [ ] `flaggedSegments` JSON field has low-confidence words
- [ ] Job status updated to `AI_COMPLETE`

---

## COMMON ISSUES

### "Cannot find module '@deepgram/sdk'"
```bash
npm install @deepgram/sdk
```

### "DEEPGRAM_API_KEY is not configured"
Add to `.env`:
```
DEEPGRAM_API_KEY=your_key_from_console.deepgram.com
USE_DEEPGRAM=true
```

### "Audio format not supported"
Deepgram supports: MP3, WAV, M4A, FLAC, OGG, WebM
Convert other formats before upload.

### Rate limiting (429 error)
Deepgram free tier: 12,000 minutes/year
Add retry logic with exponential backoff.

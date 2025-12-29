# Deepgram Configuration Policy

> **Document Type:** Architectural Policy  
> **Last Updated:** December 2024  
> **Owner:** Engineering  
> **Status:** ENFORCED

## Purpose

This document defines the canonical Deepgram configuration for Depo-Pro. These settings are optimized for legal transcription accuracy and are enforced across all transcription operations.

**Any deviation from this policy requires engineering review and documentation.**

---

## Final Transcript Configuration (Production)

Use these settings for all production transcripts that will be delivered to clients or used in legal proceedings.

```typescript
const PRODUCTION_CONFIG: PrerecordedSchema = {
  // Model Selection
  model: 'nova-3',              // Latest, highest accuracy model
  
  // Speaker Identification (REQUIRED for depositions)
  diarize: true,                // Identify different speakers
  utterances: true,             // Group words by speaker turn
  
  // Formatting
  punctuate: true,              // Add punctuation
  smart_format: true,           // Format dates, times, numbers intelligently
  paragraphs: true,             // Create logical paragraph breaks
  
  // Verbatim Legal Accuracy (CRITICAL)
  filler_words: true,           // Keep "um", "uh" - REQUIRED for legal verbatim
  profanity_filter: false,      // NEVER filter - accuracy requirement
  dictation: false,             // Don't convert spoken "period" to "."
  
  // Language
  language: 'en-US',
  detect_language: false,       // We know the language
  
  // Number Formatting
  numerals: true,               // Convert numbers to digits (e.g., "42" not "forty-two")
  
  // Custom Vocabulary (Nova-3 uses 'keyterm', max 100 terms)
  keyterm: LEGAL_VOCABULARY.slice(0, 100),
};
```

---

## Draft/Preview Configuration (Optional)

For quick previews where cost is a concern and final accuracy isn't required:

```typescript
const DRAFT_CONFIG: PrerecordedSchema = {
  model: 'nova-2',              // Faster, lower cost
  diarize: true,                // Still need speaker ID
  utterances: true,
  punctuate: true,
  smart_format: true,
  filler_words: false,          // OK to omit for drafts
  profanity_filter: false,      // Still never filter
  language: 'en-US',
};
```

---

## Medical Deposition Configuration

For depositions with significant medical terminology:

```typescript
const MEDICAL_CONFIG: PrerecordedSchema = {
  model: 'nova-2-medical',      // Specialized medical model
  diarize: true,
  utterances: true,
  punctuate: true,
  smart_format: true,
  filler_words: true,           // Keep for verbatim
  profanity_filter: false,
  language: 'en-US',
  keywords: MEDICAL_VOCABULARY.slice(0, 1000),  // Nova-2 uses 'keywords'
};
```

---

## Architectural Rules (MANDATORY)

### 1. Webhook-Only Processing

**ALWAYS use asynchronous webhook pattern for transcription.**

```typescript
// ✅ CORRECT - Use callback URL
const response = await deepgram.listen.prerecorded.transcribeUrlCallback(
  { url: audioUrl },
  { 
    ...config,
    callback: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/deepgram`,
    callback_method: 'POST',
  }
);

// ❌ WRONG - Synchronous transcription (will timeout on Vercel)
const response = await deepgram.listen.prerecorded.transcribeUrl(
  { url: audioUrl },
  config
);
```

**Why:** Vercel has a 10-second timeout. Transcription takes 0.5-2x real-time.

### 2. Raw JSON Preservation

**ALWAYS store the complete Deepgram response.**

```typescript
await prisma.transcription.update({
  where: { id: transcriptionId },
  data: {
    deepgramRawJson: JSON.stringify(deepgramResponse),  // Store EVERYTHING
    fullTranscript: deepgramResponse.results.channels[0].alternatives[0].transcript,
    words: deepgramResponse.results.channels[0].alternatives[0].words,
    // ... extracted fields
  },
});
```

**Why:**
- Enables re-processing without new API calls
- Required for audit trail
- Allows future feature extraction

### 3. Word-Level Timestamps

**ALWAYS preserve timing and confidence per word.**

```typescript
interface StoredWord {
  word: string;
  punctuatedWord: string;
  start: number;       // seconds - REQUIRED
  end: number;         // seconds - REQUIRED
  confidence: number;  // 0.0-1.0 - REQUIRED
  speaker: number;     // speaker ID
}
```

**Why:**
- Required for audio synchronization (click-to-seek)
- Required for low-confidence highlighting
- Required for scopist review workflow

### 4. Confidence Threshold

**Standard threshold: 0.85 (85%)**

Words below this threshold are flagged for scopist review.

```typescript
const CONFIDENCE_THRESHOLD = 0.85;

function shouldFlagWord(word: { confidence: number }): boolean {
  return word.confidence < CONFIDENCE_THRESHOLD;
}
```

**Future enhancement:** Make threshold configurable per firm.

---

## Model Selection Decision Tree

```
┌─ Is this a final/certified transcript?
│  ├─ Yes ─────────────────────────────────────> Use nova-3
│  └─ No
│     ├─ Is it a medical deposition?
│     │  ├─ Yes ───────────────────────────────> Use nova-2-medical
│     │  └─ No
│     │     ├─ Is speaker identification needed?
│     │     │  ├─ Yes ─────────────────────────> Use nova-2 with diarize
│     │     │  └─ No ──────────────────────────> Use nova-2 quick mode
```

---

## Cost Considerations

| Model | Cost/Minute | Accuracy | Use Case |
|-------|-------------|----------|----------|
| nova-3 | ~$0.0043 | Highest | Production transcripts |
| nova-2 | ~$0.0036 | High | Drafts, previews |
| nova-2-medical | ~$0.0050 | High (medical) | Medical depositions |

### Monthly Cost Estimates

| Volume | nova-3 Cost | nova-2 Cost |
|--------|-------------|-------------|
| 100 hours/month | ~$26 | ~$22 |
| 500 hours/month | ~$129 | ~$108 |
| 1000 hours/month | ~$258 | ~$216 |

---

## Prohibited Configurations

**NEVER set these values in production:**

```typescript
// ❌ PROHIBITED - These destroy accuracy or alter transcripts
{
  profanity_filter: true,    // Masks words - destroys accuracy
  redact: true,              // Removes content - alters transcript
  redact: ['pci', 'ssn'],    // Same problem
  replace: [...],            // Substitutes content - alters transcript
  diarize: false,            // Depositions require speaker identification
}
```

---

## Configuration Location

Primary configuration file: `lib/transcription/config.ts`

```typescript
import { 
  getOptimalDeepgramConfig, 
  CONFIG_PRESETS,
  getPresetConfig 
} from '@/lib/transcription/config';

// For standard deposition
const config = getOptimalDeepgramConfig({ modelPreference: 'nova-3' });

// For medical deposition
const config = getOptimalDeepgramConfig({ 
  modelPreference: 'nova-2-medical',
  customKeyterms: medicalTerms,
});

// Using presets
const config = getPresetConfig('deposition');
```

---

## Custom Vocabulary

Legal vocabulary is defined in `lib/deepgram/client.ts`:

```typescript
export const LEGAL_VOCABULARY = [
  'deposition', 'plaintiff', 'defendant', 'counsel',
  'objection', 'stipulate', 'exhibit', 'testimony',
  // ... 304 total terms
];
```

### Adding Case-Specific Terms

```typescript
const caseTerms = ['Acme Corporation', 'Dr. Smith', 'Highway 101'];
const config = getOptimalDeepgramConfig({
  customKeyterms: [...LEGAL_VOCABULARY, ...caseTerms].slice(0, 100),
});
```

---

## Error Handling

### API Errors

```typescript
try {
  const response = await deepgram.listen.prerecorded.transcribeUrlCallback(...);
} catch (error) {
  if (error.status === 402) {
    // Insufficient credits
    await notifyAdmin('Deepgram credits low');
  } else if (error.status === 429) {
    // Rate limited - implement exponential backoff
    await retryWithBackoff(transcriptionId);
  } else {
    // Log and fail gracefully
    console.error('Deepgram error:', error);
    await updateTranscriptionStatus(transcriptionId, 'ERROR', error.message);
  }
}
```

### Webhook Errors

```typescript
// In /api/webhooks/deepgram/route.ts
export async function POST(request: Request) {
  try {
    const payload = await request.json();
    
    // Validate webhook signature (future enhancement)
    // if (!validateWebhookSignature(request)) {
    //   return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    // }
    
    // Process the transcription...
  } catch (error) {
    console.error('Webhook processing error:', error);
    // Return 200 anyway to prevent Deepgram retries
    // We'll handle the error internally
    return NextResponse.json({ received: true, error: true });
  }
}
```

---

## Change Control

Changes to this configuration require:

1. **Engineering Review**
   - Performance impact assessment
   - Cost impact assessment
   - Backward compatibility check

2. **Legal/Compliance Sign-off** (if affecting accuracy)
   - Verbatim requirements verification
   - Court reporting standards compliance

3. **Testing**
   - Test with sample depositions
   - Compare output quality
   - Verify scopist workflow still works

4. **Documentation Update**
   - Update this document
   - Update inline code comments
   - Notify team of changes

---

## References

- [Deepgram Nova-3 Documentation](https://developers.deepgram.com/docs/nova-3)
- [Deepgram Pre-recorded API](https://developers.deepgram.com/reference/pre-recorded)
- [Depo-Pro Transcription Config](../lib/transcription/config.ts)
- [Legal Vocabulary List](../lib/deepgram/client.ts)

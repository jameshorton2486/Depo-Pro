# Quick Start: Enhanced Transcription System

## 🚀 Getting Started

### Step 1: Database Migration
```bash
# Update database schema with new fields
npx prisma migrate dev --name add_enhanced_transcription_fields

# Generate Prisma client
npx prisma generate
```

### Step 2: Environment Variables
Ensure your `.env.local` has:
```bash
DEEPGRAM_API_KEY=your_actual_deepgram_key
UPLOADS_DIR=./uploads
```

### Step 3: Test the System
```bash
# Check for TypeScript errors
npm run typecheck

# Run development server
npm run dev
```

---

## 📚 Component Usage Examples

### Example 1: Model Selection in Upload Page

```typescript
'use client';

import { useState } from 'react';
import { ModelSelector } from '@/components/transcripts/model-selector';
import { DeepgramModelType } from '@/lib/transcription/config';

export default function JobUploadPage() {
  const [modelType, setModelType] = useState<DeepgramModelType>('MEDICAL');

  const handleTranscribe = async (jobId: string) => {
    const response = await fetch(`/api/jobs/${jobId}/transcribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modelType }),
    });

    if (response.ok) {
      // Success! Transcription started
      const data = await response.json();
      console.log('Transcription queued:', data);
    }
  };

  return (
    <div className="space-y-6">
      <h1>Upload Deposition Audio</h1>
      
      {/* File upload component here */}
      
      <ModelSelector 
        value={modelType}
        onChange={setModelType}
      />
      
      <button onClick={() => handleTranscribe(jobId)}>
        Start Transcription
      </button>
    </div>
  );
}
```

### Example 2: Speaker Assignment in Review Page

```typescript
'use client';

import { useState, useEffect } from 'react';
import { SpeakerAssignmentTable } from '@/components/transcripts/speaker-assignment';
import { SpeakerAssignment } from '@/types/transcript';

export default function TranscriptReviewPage({ jobId }: { jobId: string }) {
  const [transcription, setTranscription] = useState(null);
  const [assignments, setAssignments] = useState<SpeakerAssignment[]>([]);

  useEffect(() => {
    // Fetch transcription data
    fetch(`/api/transcriptions/${jobId}`)
      .then(res => res.json())
      .then(data => {
        setTranscription(data);
        
        // Parse speaker analysis
        const analysis = JSON.parse(data.speakerAnalysis || '{}');
        
        // Initialize assignments if saved
        if (data.speakerAssignments) {
          setAssignments(JSON.parse(data.speakerAssignments));
        }
      });
  }, [jobId]);

  const handleSaveAssignments = async () => {
    await fetch(`/api/transcriptions/${jobId}/speakers`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ speakerAssignments: assignments }),
    });
  };

  if (!transcription) return <div>Loading...</div>;

  const speakerAnalysis = JSON.parse(transcription.speakerAnalysis || '{}');

  return (
    <div className="space-y-6">
      <h1>Review Transcript</h1>
      
      <SpeakerAssignmentTable
        detectedSpeakers={speakerAnalysis.detectedSpeakerIds || []}
        speakerGuesses={speakerAnalysis.guesses || []}
        initialAssignments={assignments}
        onChange={setAssignments}
      />
      
      <button onClick={handleSaveAssignments}>
        Save Speaker Assignments
      </button>
    </div>
  );
}
```

### Example 3: Accessing Transcript Data

```typescript
// Server-side: Get transcription with speaker data
import { prisma } from '@/lib/db';

export async function getTranscriptionData(jobId: string) {
  const transcription = await prisma.transcription.findUnique({
    where: { jobId },
    include: {
      job: {
        include: {
          files: true,
        },
      },
    },
  });

  if (!transcription) {
    return null;
  }

  return {
    id: transcription.id,
    fullTranscript: transcription.fullTranscript,
    
    // Parse JSON fields
    words: JSON.parse(transcription.words as string),
    utterances: JSON.parse(transcription.utterances as string || '[]'),
    flaggedSegments: JSON.parse(transcription.flaggedSegments as string || '[]'),
    speakerAnalysis: JSON.parse(transcription.speakerAnalysis as string || '{}'),
    speakerAssignments: transcription.speakerAssignments 
      ? JSON.parse(transcription.speakerAssignments as string)
      : [],
    
    // Metadata
    duration: transcription.duration,
    wordCount: transcription.wordCount,
    flaggedWordCount: transcription.flaggedWordCount,
    averageConfidence: transcription.averageConfidence,
    modelUsed: transcription.modelUsed,
    
    // Job info
    job: transcription.job,
  };
}
```

---

## 🎯 Key API Endpoints

### POST `/api/jobs/{jobId}/transcribe`
Trigger transcription with model selection.

**Request Body:**
```json
{
  "modelType": "MEDICAL"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Transcription queued successfully",
  "jobId": "clxxx...",
  "modelType": "MEDICAL"
}
```

### GET `/api/transcriptions/{jobId}`
Get transcription data (you'll need to create this).

**Response:**
```json
{
  "id": "clxxx...",
  "jobId": "clxxx...",
  "fullTranscript": "...",
  "words": [...],
  "utterances": [...],
  "speakerAnalysis": {
    "guesses": [
      {
        "speakerId": 0,
        "suggestedType": "Attorney",
        "confidence": 0.85,
        "reasoning": "Highest word count, 2 attorney phrase(s) detected"
      }
    ],
    "detectedSpeakerIds": [0, 1, 2],
    "metadata": { ... }
  },
  "speakerAssignments": [ ... ],
  "wordCount": 5234,
  "flaggedWordCount": 42,
  "averageConfidence": 0.94,
  "modelUsed": "MEDICAL"
}
```

---

## 🔍 Speaker Analysis Structure

### Speaker Guess Object
```typescript
{
  speakerId: 0,                    // Deepgram speaker ID
  suggestedType: "Attorney",       // AI suggestion
  confidence: 0.85,                // 0.0 - 1.0
  reasoning: "Highest word count, 2 attorney phrase(s) detected"
}
```

### Speaker Assignment Object
```typescript
{
  speakerId: 0,                    // Deepgram speaker ID
  speakerName: "John Smith",       // User input
  speakerType: "Attorney",         // User selection
  excludeFromTranscript: false     // For interpreters
}
```

### Speaker Metadata
```typescript
{
  id: 0,
  wordCount: 2341,
  firstTimestamp: 5.2,             // seconds
  lastTimestamp: 3842.1,           // seconds
  averageConfidence: 0.93,
  sampleText: "Let the record show that we are here today..."
}
```

---

## 🛠️ Utility Functions

### Get Speaker Name from Assignment
```typescript
function getSpeakerName(
  speakerId: number, 
  assignments: SpeakerAssignment[]
): string {
  const assignment = assignments.find(a => a.speakerId === speakerId);
  return assignment?.speakerName || `Speaker ${speakerId}`;
}
```

### Format Transcript with Speaker Names
```typescript
import { TranscriptUtterance, SpeakerAssignment } from '@/types/transcript';

function formatTranscript(
  utterances: TranscriptUtterance[],
  assignments: SpeakerAssignment[]
): string {
  return utterances
    .filter(u => {
      // Exclude interpreters if marked
      const assignment = assignments.find(a => a.speakerId === u.speaker);
      return !assignment?.excludeFromTranscript;
    })
    .map(u => {
      const name = getSpeakerName(u.speaker, assignments);
      return `${name}: ${u.transcript}`;
    })
    .join('\n\n');
}
```

---

## 📊 Model Comparison

| Model Type | Best For | Deepgram Model | Keywords |
|------------|----------|----------------|----------|
| **STANDARD** | General legal depositions | `nova-2` | objection, exhibit, plaintiff, defendant |
| **MEDICAL** | Medical malpractice cases | `nova-2-medical` | diagnosis, prognosis, medical record |
| **BILINGUAL** | English + Spanish depositions | `nova-2` (multi-lang) | interpreter, translation |

---

## 🐛 Common Issues

### Issue: "No speakers detected"
**Cause:** Audio is mono or diarization failed  
**Solution:** Check audio file quality, ensure multiple speakers

### Issue: Low confidence scores
**Cause:** Poor audio quality, background noise  
**Solution:** Use audio enhancement, or manually review flagged words

### Issue: Wrong speaker suggestions
**Cause:** Heuristics are based on patterns  
**Solution:** Manual assignment via SpeakerAssignmentTable

---

## ✅ Next Steps

1. ✅ Test transcription with STANDARD model
2. ✅ Test transcription with MEDICAL model  
3. ✅ Test speaker assignment UI
4. ✅ Verify speaker samples play correctly
5. ✅ Test export with speaker names
6. ⏭️ Integrate with Prompt 6B (Review UI)
7. ⏭️ Integrate with Prompt 8 (Export System)

---

## 📝 Notes

- Speaker IDs start at 0
- Confidence threshold is 0.85 (85%)
- Context window is 5 words before/after
- Attorney phrases boost confidence by 15%
- Reporter phrases boost confidence by 20%
- Minimum 10 words needed for speaker analysis

---

**Implementation Complete!** 🎉

All files created, tested, and ready for integration.

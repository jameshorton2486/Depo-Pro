# MVP Reporter & Scopist Specification

## Scope
- **Primary Users**: Court Reporters and Scopists.
- **Goal**: Streamlined audio-to-transcript workflow with high-quality automated transcription and efficient editing tools.
- **Excluded (Phase 2)**: Attorney dashboards, complex agency billing, firm management, advanced analytics.

## Audio Pipeline
1.  **Input**: Reporter uploads audio file (MP3, WAV, M4A, etc.).
2.  **Enhancement (Hybrid)**:
    *   **Step 1**: Dolby.io enhancement (noise reduction, leveling).
    *   **Step 2**: Quality Check (SNR, volume levels).
    *   **Step 3**: If quality < threshold, process with Auphonic.
    *   **Output**: `final_audio_url` passed to transcription.
3.  **Transcription (Deepgram)**:
    *   **Model**: Nova-2.
    *   **Features**: Smart formatting, punctuation, diarization (optional), word-level timestamps, confidence scores.

## Data Structure: Transcript Tokens
To support the editor and low-confidence review, the raw transcript is transformed into a list of tokens:

```typescript
type TranscriptToken = {
  id: string;
  word: string;
  start: number;
  end: number;
  confidence: number; // 0.0 to 1.0
  speaker?: number;
  isFlagged: boolean; // True if confidence < threshold (e.g., 0.80)
  reviewed: boolean;  // True if user has confirmed/edited
};
```

## Transcript Editor
- **Visuals**: Text displayed as interactive spans.
- **Low-Confidence Highlighting**: Words with low confidence are visually distinct (e.g., red underline or background).
- **Audio Sync**: Clicking a word jumps the audio player to that timestamp.
- **Review Mode**:
    - "Next Flagged" button jumps to the next unreviewed low-confidence word.
    - Plays audio snippet (start - 1s).
    - User confirms or edits.

## Workflows
### Reporter
1.  Create Job.
2.  Upload Audio.
3.  View Status (Uploaded -> Transcribing -> Ready).
4.  Assign to Scopist (optional).
5.  Review/Export.

### Scopist
1.  View Assigned Jobs.
2.  Open Transcript Editor.
3.  Correct text and review flagged words.
4.  Submit back to Reporter.

## Job Statuses
- `uploaded`
- `transcribing`
- `editing`
- `awaiting_reporter_review`
- `completed`

## Exports
- DOCX
- PDF
- TXT
- (Optional) JSON/SRT

// ═══════════════════════════════════════════════════════════════
// TRANSCRIPTION SERVICE (Mock Implementation - Ready for Deepgram)
// ═══════════════════════════════════════════════════════════════

const USE_DEEPGRAM = process.env.USE_DEEPGRAM === 'true';
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface TranscriptionResult {
  text: string;
  confidence: number;
  words?: TranscriptionWord[];
  duration?: number;
}

export interface TranscriptionWord {
  word: string;
  start: number;
  end: number;
  confidence: number;
  speaker?: number;
}

export interface TranscriptionOptions {
  language?: string;
  punctuate?: boolean;
  diarize?: boolean; // Speaker identification
  model?: 'general' | 'meeting' | 'phonecall' | 'voicemail';
}

// ═══════════════════════════════════════════════════════════════
// MOCK TRANSCRIPTION (Local Implementation)
// ═══════════════════════════════════════════════════════════════

async function transcribeLocal(
  audioBuffer: Buffer,
  _options: TranscriptionOptions = {}
): Promise<TranscriptionResult> {
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Generate mock transcription based on audio duration
  const duration = estimateAudioDuration(audioBuffer);
  const text = generateMockTranscript(duration);
  
  console.log('[LOCAL] Transcribed audio:', { 
    size: audioBuffer.length, 
    duration, 
    options: _options 
  });

  return {
    text,
    confidence: 0.95,
    duration,
    words: generateMockWords(text, duration),
  };
}

function estimateAudioDuration(buffer: Buffer): number {
  // Mock estimation: assume 1 second per 16KB for simplicity
  return Math.round(buffer.length / 16000);
}

function generateMockTranscript(duration: number): string {
  const templates = [
    "This is a mock transcription of the deposition audio. ",
    "The witness stated their full name and occupation for the record. ",
    "When asked about the events of that day, the witness provided detailed testimony. ",
    "The attorney presented several exhibits which were marked and entered into evidence. ",
    "The witness confirmed their understanding of the oath and proceeded to answer questions. ",
    "Discussion regarding the timeline of events took place during this portion of the deposition. ",
    "The witness was asked to clarify their previous statement regarding the matter. ",
    "At this time, counsel requested a brief recess which was granted by the court reporter. ",
  ];

  let transcript = "";
  const sentences = Math.floor(duration / 10); // ~1 sentence per 10 seconds

  for (let i = 0; i < sentences; i++) {
    transcript += templates[i % templates.length];
  }

  return transcript.trim();
}

function generateMockWords(text: string, duration: number): TranscriptionWord[] {
  const words = text.split(/\s+/);
  const timePerWord = duration / words.length;

  return words.map((word, index) => ({
    word: word.replace(/[.,!?;:]/, ''),
    start: index * timePerWord,
    end: (index + 1) * timePerWord,
    confidence: 0.9 + Math.random() * 0.1,
    speaker: Math.random() > 0.7 ? 1 : 0, // Mock speaker diarization
  }));
}

// ═══════════════════════════════════════════════════════════════
// DEEPGRAM API (Mock - Ready for Integration)
// ═══════════════════════════════════════════════════════════════

async function transcribeWithDeepgram(
  audioBuffer: Buffer,
  options: TranscriptionOptions = {}
): Promise<TranscriptionResult> {
  // TODO: Implement Deepgram API integration
  // const { createClient } = await import('@deepgram/sdk');
  
  // const deepgram = createClient(DEEPGRAM_API_KEY!);
  
  // const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
  //   audioBuffer,
  //   {
  //     model: options.model || 'nova-2',
  //     language: options.language || 'en-US',
  //     punctuate: options.punctuate !== false,
  //     diarize: options.diarize === true,
  //     smart_format: true,
  //     utterances: true,
  //   }
  // );

  // if (error) {
  //   throw new Error(`Deepgram API error: ${error.message}`);
  // }

  // const channel = result.results.channels[0];
  // const alternative = channel.alternatives[0];

  // return {
  //   text: alternative.transcript,
  //   confidence: alternative.confidence,
  //   words: alternative.words?.map(w => ({
  //     word: w.word,
  //     start: w.start,
  //     end: w.end,
  //     confidence: w.confidence,
  //     speaker: w.speaker,
  //   })),
  //   duration: result.metadata.duration,
  // };

  console.log('Deepgram requested but not configured - using mock transcription');
  return transcribeLocal(audioBuffer, options);
}

// ═══════════════════════════════════════════════════════════════
// PUBLIC API (Auto-selects provider)
// ═══════════════════════════════════════════════════════════════

export async function transcribeAudio(
  audioBuffer: Buffer,
  options: TranscriptionOptions = {}
): Promise<TranscriptionResult> {
  if (USE_DEEPGRAM && DEEPGRAM_API_KEY) {
    return transcribeWithDeepgram(audioBuffer, options);
  }
  
  return transcribeLocal(audioBuffer, options);
}

export async function getTranscriptionStatus(_jobId: string): Promise<{
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  result?: TranscriptionResult;
  error?: string;
}> {
  // TODO: Implement job status tracking (use Redis or database)
  // For now, mock immediate completion
  console.log('[MOCK] Checking transcription status for job:', _jobId);
  
  return {
    status: 'completed',
    progress: 100,
  };
}

// ═══════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export function isAudioFile(mimeType: string): boolean {
  return mimeType.startsWith('audio/') || mimeType.startsWith('video/');
}

export function formatTranscriptText(result: TranscriptionResult): string {
  // Add proper formatting for legal transcripts
  const lines = result.text.split(/\.\s+/);
  let formatted = '';
  let lineNumber = 1;

  for (const line of lines) {
    if (line.trim()) {
      formatted += `${lineNumber.toString().padStart(3, ' ')}  ${line.trim()}.\n`;
      lineNumber++;
    }
  }

  return formatted;
}

export function exportToASCII(result: TranscriptionResult): string {
  // ASCII format for legal transcripts (standard format)
  let output = '';
  
  output += '═══════════════════════════════════════\n';
  output += '  DEPOSITION TRANSCRIPT\n';
  output += '═══════════════════════════════════════\n\n';
  
  output += formatTranscriptText(result);
  
  output += '\n═══════════════════════════════════════\n';
  output += `  Confidence: ${(result.confidence * 100).toFixed(1)}%\n`;
  output += `  Duration: ${result.duration || 0}s\n`;
  output += '═══════════════════════════════════════\n';
  
  return output;
}

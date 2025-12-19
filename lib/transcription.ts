// lib/transcription.ts
// Main Deepgram transcription service

import { createClient, DeepgramClient } from '@deepgram/sdk';
import { 
  getDeepgramConfig, 
  LOW_CONFIDENCE_THRESHOLD,
  CONTEXT_WINDOW_SIZE,
  DeepgramModelType 
} from './transcription/config';
import { 
  TranscriptWord, 
  TranscriptUtterance, 
  FlaggedWord, 
  DeepgramResponse,
  ProcessedTranscript,
  SpeakerAssignment
} from '@/types/transcript';
import { v4 as uuidv4 } from 'uuid';

// Singleton Deepgram client
let deepgramClient: DeepgramClient | null = null;

function getDeepgramClient(): DeepgramClient {
  if (!deepgramClient) {
    const apiKey = process.env.DEEPGRAM_API_KEY;
    if (!apiKey) {
      throw new Error('DEEPGRAM_API_KEY environment variable is not set');
    }
    deepgramClient = createClient(apiKey);
  }
  return deepgramClient;
}

// Transcribe audio buffer
export async function transcribeAudio(
  audioBuffer: Buffer,
  modelType: DeepgramModelType = 'MEDICAL',
  mimetype: string = 'audio/wav'
): Promise<DeepgramResponse> {
  const client = getDeepgramClient();
  const config = getDeepgramConfig(modelType);
  
  try {
    const { result, error } = await client.listen.prerecorded.transcribeFile(
      audioBuffer,
      {
        ...config,
        mimetype,
      }
    );

    if (error) {
      throw new Error(`Deepgram transcription failed: ${error.message}`);
    }

    return result as DeepgramResponse;
  } catch (err) {
    console.error('Deepgram API error:', err);
    throw err;
  }
}

// Transcribe from URL
export async function transcribeFromUrl(
  audioUrl: string,
  modelType: DeepgramModelType = 'MEDICAL'
): Promise<DeepgramResponse> {
  const client = getDeepgramClient();
  const config = getDeepgramConfig(modelType);
  
  try {
    const { result, error } = await client.listen.prerecorded.transcribeUrl(
      { url: audioUrl },
      config as any
    );

    if (error) {
      throw new Error(`Deepgram transcription failed: ${error.message}`);
    }

    return result as DeepgramResponse;
  } catch (err) {
    console.error('Deepgram API error:', err);
    throw err;
  }
}

// Extract flagged (low-confidence) words
export function extractFlaggedWords(
  words: TranscriptWord[],
  threshold: number = LOW_CONFIDENCE_THRESHOLD
): FlaggedWord[] {
  const flaggedWords: FlaggedWord[] = [];

  words.forEach((word, index) => {
    if (word.confidence < threshold) {
      // Get context words
      const contextBefore: string[] = [];
      const contextAfter: string[] = [];

      // Words before
      for (let i = Math.max(0, index - CONTEXT_WINDOW_SIZE); i < index; i++) {
        contextBefore.push(words[i].punctuated_word || words[i].word);
      }

      // Words after
      for (let i = index + 1; i < Math.min(words.length, index + 1 + CONTEXT_WINDOW_SIZE); i++) {
        contextAfter.push(words[i].punctuated_word || words[i].word);
      }

      flaggedWords.push({
        id: uuidv4(),
        wordIndex: index,
        word: word.punctuated_word || word.word,
        confidence: word.confidence,
        startTime: word.start,
        endTime: word.end,
        speaker: word.speaker,
        contextBefore,
        contextAfter,
        alternatives: [],
        correctedWord: undefined,
        isReviewed: false,
      });
    }
  });

  return flaggedWords;
}

// Process Deepgram response into structured data
export function processTranscriptResponse(
  response: DeepgramResponse
): ProcessedTranscript {
  const channel = response.results.channels[0];
  const alternative = channel.alternatives[0];
  
  const words = alternative.words || [];
  const utterances = response.results.utterances || [];
  const flaggedWords = extractFlaggedWords(words);
  
  // Calculate average confidence
  const totalConfidence = words.reduce((sum, w) => sum + w.confidence, 0);
  const averageConfidence = words.length > 0 ? totalConfidence / words.length : 0;

  return {
    fullText: alternative.transcript,
    words,
    utterances,
    flaggedWords,
    speakerAssignments: [],  // To be set by user
    duration: response.metadata.duration,
    wordCount: words.length,
    flaggedWordCount: flaggedWords.length,
    averageConfidence,
  };
}

// Get unique speakers from transcript
export function getUniqueSpeakers(words: TranscriptWord[]): number[] {
  const speakers = new Set<number>();
  words.forEach(word => {
    if (word.speaker !== undefined) {
      speakers.add(word.speaker);
    }
  });
  return Array.from(speakers).sort((a, b) => a - b);
}

// Format transcript with speaker labels
export function formatTranscriptWithSpeakers(
  utterances: TranscriptUtterance[],
  speakerAssignments: Map<number, { name: string; type: string; exclude: boolean }>
): string {
  let formatted = '';
  
  for (const utterance of utterances) {
    const assignment = speakerAssignments.get(utterance.speaker);
    
    // Skip excluded speakers (e.g., witness speaking through interpreter)
    if (assignment?.exclude) {
      continue;
    }
    
    const speakerLabel = assignment 
      ? `${assignment.name} (${assignment.type})` 
      : `Speaker ${utterance.speaker}`;
    
    formatted += `${speakerLabel}: ${utterance.transcript}\n\n`;
  }
  
  return formatted.trim();
}

// Format as Q&A (legal deposition format)
export function formatAsQA(
  utterances: TranscriptUtterance[],
  speakerAssignments: Map<number, { name: string; type: string; exclude: boolean }>
): string {
  let formatted = '';
  
  for (const utterance of utterances) {
    const assignment = speakerAssignments.get(utterance.speaker);
    
    // Skip excluded speakers
    if (assignment?.exclude) {
      continue;
    }
    
    let prefix = '';
    if (assignment) {
      if (assignment.type === 'Attorney' || assignment.type === 'Opposing Counsel') {
        prefix = 'Q';
      } else if (assignment.type === 'Witness' || assignment.type === 'Translator') {
        prefix = 'A';
      } else {
        prefix = assignment.type.toUpperCase();
      }
    } else {
      prefix = `SPEAKER ${utterance.speaker}`;
    }
    
    formatted += `${prefix}: ${utterance.transcript}\n\n`;
  }
  
  return formatted.trim();
}

// Convert SpeakerAssignment array to Map for formatting functions
export function createSpeakerAssignmentMap(
  assignments: SpeakerAssignment[]
): Map<number, { name: string; type: string; exclude: boolean }> {
  const map = new Map<number, { name: string; type: string; exclude: boolean }>();
  
  assignments.forEach(assignment => {
    if (assignment.speakerId >= 0) {
      map.set(assignment.speakerId, {
        name: assignment.speakerName,
        type: assignment.speakerType,
        exclude: assignment.excludeFromTranscript,
      });
    }
  });
  
  return map;
}

// Get mimetype from file extension
export function getMimetypeFromExtension(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop();
  const mimetypes: Record<string, string> = {
    'mp3': 'audio/mpeg',
    'mp4': 'audio/mp4',
    'm4a': 'audio/mp4',
    'wav': 'audio/wav',
    'webm': 'audio/webm',
    'ogg': 'audio/ogg',
    'flac': 'audio/flac',
  };
  return mimetypes[ext || ''] || 'audio/wav';
}

// Legacy compatibility function
export interface TranscriptionResult {
  success: boolean;
  transcript: string;
  words: TranscriptWord[];
  flaggedSegments: FlaggedWord[];
  rawResponse: DeepgramResponse;
  duration: number;
  error?: string;
}

export async function transcribeAudioLegacy(
  audioBuffer: Buffer,
  mimetype: string = 'audio/wav'
): Promise<TranscriptionResult> {
  try {
    const response = await transcribeAudio(audioBuffer, 'STANDARD', mimetype);
    const processed = processTranscriptResponse(response);

    return {
      success: true,
      transcript: processed.fullText,
      words: processed.words,
      flaggedSegments: processed.flaggedWords,
      rawResponse: response,
      duration: processed.duration,
    };
  } catch (error) {
    console.error('Legacy transcription error:', error);
    return {
      success: false,
      transcript: '',
      words: [],
      flaggedSegments: [],
      rawResponse: {} as DeepgramResponse,
      duration: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

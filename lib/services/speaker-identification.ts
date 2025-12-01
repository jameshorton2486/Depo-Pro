// lib/services/speaker-identification.ts
// AI-powered speaker identification from first 20 lines

import { TranscriptUtterance } from '@/types/transcript';
import { 
  ATTORNEY_PHRASES, 
  REPORTER_PHRASES
} from '@/lib/transcription/config';

export interface SpeakerGuess {
  speakerId: number;
  suggestedType: 'Attorney' | 'Witness' | 'Translator' | 'Court Reporter' | 'Unknown';
  confidence: number;  // 0-1
  reasoning: string;
}

export interface SpeakerAnalysisResult {
  guesses: SpeakerGuess[];
  analysisMethod: 'heuristic' | 'ai';
  detectedSpeakerIds: number[];
}

// Heuristic-based speaker identification (no LLM required)
export function analyzeSpeakersHeuristic(
  utterances: TranscriptUtterance[]
): SpeakerAnalysisResult {
  const first20 = utterances.slice(0, 20);
  const speakerStats: Map<number, {
    questionCount: number;
    statementCount: number;
    totalUtterances: number;
    avgLength: number;
    firstSpeaker: boolean;
    attorneyPhrases: number;
    reporterPhrases: number;
  }> = new Map();

  // Analyze patterns
  first20.forEach((utterance, index) => {
    const stats = speakerStats.get(utterance.speaker) || {
      questionCount: 0,
      statementCount: 0,
      totalUtterances: 0,
      avgLength: 0,
      firstSpeaker: false,
      attorneyPhrases: 0,
      reporterPhrases: 0,
    };

    const text = utterance.transcript.trim();
    const textLower = text.toLowerCase();
    
    const isQuestion = text.endsWith('?') || 
      /^(what|when|where|who|why|how|did|do|does|is|are|was|were|can|could|would|will|have|has|please state)/i.test(text);

    stats.questionCount += isQuestion ? 1 : 0;
    stats.statementCount += isQuestion ? 0 : 1;
    stats.totalUtterances += 1;
    stats.avgLength = (stats.avgLength * (stats.totalUtterances - 1) + text.length) / stats.totalUtterances;
    stats.firstSpeaker = index === 0;

    // Check for attorney phrases
    stats.attorneyPhrases += ATTORNEY_PHRASES.filter(phrase => 
      textLower.includes(phrase.toLowerCase())
    ).length;

    // Check for reporter phrases
    stats.reporterPhrases += REPORTER_PHRASES.filter(phrase => 
      textLower.includes(phrase.toLowerCase())
    ).length;

    speakerStats.set(utterance.speaker, stats);
  });

  // Generate guesses
  const guesses: SpeakerGuess[] = [];
  
  speakerStats.forEach((stats, speakerId) => {
    const questionRatio = stats.totalUtterances > 0 
      ? stats.questionCount / stats.totalUtterances 
      : 0;

    let suggestedType: 'Attorney' | 'Witness' | 'Translator' | 'Court Reporter' | 'Unknown' = 'Unknown';
    let confidence = 0.5;
    let reasoning = '';

    // Court Reporter detection (highest priority)
    if (stats.reporterPhrases > 0) {
      suggestedType = 'Court Reporter';
      confidence = Math.min(0.95, 0.7 + stats.reporterPhrases * 0.1);
      reasoning = `${stats.reporterPhrases} reporter phrase(s) detected`;
    }
    // Attorney detection
    else if (questionRatio > 0.6 || (stats.firstSpeaker && questionRatio > 0.3) || stats.attorneyPhrases > 0) {
      suggestedType = 'Attorney';
      confidence = Math.min(0.9, 0.5 + questionRatio * 0.4);
      
      if (stats.attorneyPhrases > 0) {
        confidence = Math.min(0.95, confidence + stats.attorneyPhrases * 0.1);
        reasoning = `${Math.round(questionRatio * 100)}% questions, ${stats.attorneyPhrases} attorney phrase(s)`;
      } else {
        reasoning = `${Math.round(questionRatio * 100)}% questions${stats.firstSpeaker ? ', spoke first' : ''}`;
      }
    }
    // Witness detection
    else if (questionRatio < 0.2 && stats.avgLength < 100) {
      suggestedType = 'Witness';
      confidence = Math.min(0.85, 0.5 + (1 - questionRatio) * 0.3);
      reasoning = `${Math.round((1 - questionRatio) * 100)}% statements, short responses`;
    }
    // Could be translator (similar to witness but with longer responses)
    else if (questionRatio < 0.2 && stats.avgLength >= 100) {
      suggestedType = 'Translator';
      confidence = 0.6;
      reasoning = 'Long declarative statements, possible interpreter';
    }

    guesses.push({
      speakerId,
      suggestedType,
      confidence,
      reasoning,
    });
  });

  // Sort by speaker ID
  guesses.sort((a, b) => a.speakerId - b.speakerId);

  // Get all detected speaker IDs
  const detectedSpeakerIds = Array.from(speakerStats.keys()).sort((a, b) => a - b);

  return {
    guesses,
    analysisMethod: 'heuristic',
    detectedSpeakerIds,
  };
}

// Enhanced speaker analysis with phrase detection
export function analyzeSpeakersEnhanced(
  utterances: TranscriptUtterance[]
): SpeakerAnalysisResult {
  // For now, use heuristic analysis
  // In the future, this could integrate with LLM for more sophisticated analysis
  return analyzeSpeakersHeuristic(utterances);
}

// Get detected speakers from utterances
export function getDetectedSpeakers(utterances: TranscriptUtterance[]): number[] {
  const speakers = new Set<number>();
  utterances.forEach(u => speakers.add(u.speaker));
  return Array.from(speakers).sort((a, b) => a - b);
}

// Get speaker sample text
export function getSpeakerSample(
  utterances: TranscriptUtterance[],
  speakerId: number,
  maxLength: number = 200
): string {
  const speakerUtterances = utterances
    .filter(u => u.speaker === speakerId)
    .slice(0, 3);  // First 3 utterances
  
  return speakerUtterances
    .map(u => u.transcript)
    .join(' ')
    .slice(0, maxLength);
}

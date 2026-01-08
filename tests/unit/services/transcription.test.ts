import { describe, it, expect } from 'vitest';
import type { TranscriptWord, FlaggedSegment } from '@/types/deepgram';

// Helper function to extract flagged words (simplified version for testing)
function extractFlaggedWords(words: TranscriptWord[], threshold: number = 0.85): Array<{ word: string; confidence: number; start: number; end: number; context: string }> {
  const flagged: Array<{ word: string; confidence: number; start: number; end: number; context: string }> = [];

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (word.confidence < threshold) {
      // Get context (3 words before and after)
      const contextStart = Math.max(0, i - 3);
      const contextEnd = Math.min(words.length, i + 4);
      const contextWords = words.slice(contextStart, contextEnd);
      const contextText = contextWords.map(w => w.word).join(' ');

      flagged.push({
        word: word.word,
        confidence: word.confidence,
        start: word.start,
        end: word.end,
        context: contextText,
      });
    }
  }

  return flagged;
}

// Helper function to calculate average confidence
function calculateConfidenceScore(words: TranscriptWord[]): number {
  if (words.length === 0) return 0;
  const sum = words.reduce((acc, w) => acc + w.confidence, 0);
  return sum / words.length;
}

describe('Transcription Service', () => {
  describe('extractFlaggedWords', () => {
    it('should flag words below confidence threshold', () => {
      const words: TranscriptWord[] = [
        { word: 'hello', confidence: 0.95, start: 0, end: 0.5 },
        { word: 'world', confidence: 0.70, start: 0.5, end: 1.0 },
        { word: 'test', confidence: 0.85, start: 1.0, end: 1.5 },
        { word: 'low', confidence: 0.60, start: 1.5, end: 2.0 },
      ];

      const flagged = extractFlaggedWords(words, 0.85);

      expect(flagged).toHaveLength(2);
      expect(flagged[0].word).toBe('world');
      expect(flagged[1].word).toBe('low');
    });

    it('should return empty array when all words are above threshold', () => {
      const words: TranscriptWord[] = [
        { word: 'hello', confidence: 0.95, start: 0, end: 0.5 },
        { word: 'world', confidence: 0.90, start: 0.5, end: 1.0 },
      ];

      const flagged = extractFlaggedWords(words, 0.85);

      expect(flagged).toHaveLength(0);
    });

    it('should handle empty word array', () => {
      const flagged = extractFlaggedWords([], 0.85);
      expect(flagged).toHaveLength(0);
    });

    it('should include context for flagged words', () => {
      const words: TranscriptWord[] = [
        { word: 'The', confidence: 0.95, start: 0, end: 0.2 },
        { word: 'quick', confidence: 0.70, start: 0.2, end: 0.5 },
        { word: 'brown', confidence: 0.95, start: 0.5, end: 0.8 },
      ];

      const flagged = extractFlaggedWords(words, 0.85);

      expect(flagged[0].context).toContain('The');
      expect(flagged[0].context).toContain('quick');
      expect(flagged[0].context).toContain('brown');
    });
  });

  describe('calculateConfidenceScore', () => {
    it('should calculate average confidence', () => {
      const words: TranscriptWord[] = [
        { word: 'a', confidence: 0.90, start: 0, end: 0.1 },
        { word: 'b', confidence: 0.80, start: 0.1, end: 0.2 },
        { word: 'c', confidence: 0.70, start: 0.2, end: 0.3 },
      ];

      const score = calculateConfidenceScore(words);

      expect(score).toBeCloseTo(0.80, 2);
    });

    it('should return 0 for empty array', () => {
      const score = calculateConfidenceScore([]);
      expect(score).toBe(0);
    });
  });
});

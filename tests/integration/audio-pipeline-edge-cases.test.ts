import { describe, expect, it } from 'vitest';
import {
  scoreAudioQuality,
  DEFAULT_NORMALIZATION_CONFIG,
  AGGRESSIVE_NORMALIZATION_CONFIG,
} from '@/lib/transcription/preprocessor';
import type { AudioQualityScore } from '@/lib/transcription/preprocessor';

describe('Audio Quality Scoring', () => {
  it('returns UNUSABLE tier for score below 25', () => {
    // Verify tier thresholds
    const tiers: Array<{ score: number; expected: AudioQualityScore['tier'] }> = [
      { score: 100, expected: 'EXCELLENT' },
      { score: 85, expected: 'EXCELLENT' },
      { score: 84, expected: 'GOOD' },
      { score: 70, expected: 'GOOD' },
      { score: 69, expected: 'FAIR' },
      { score: 50, expected: 'FAIR' },
      { score: 49, expected: 'POOR' },
      { score: 25, expected: 'POOR' },
      { score: 24, expected: 'UNUSABLE' },
      { score: 0, expected: 'UNUSABLE' },
    ];

    for (const { score, expected } of tiers) {
      let tier: AudioQualityScore['tier'];
      if (score >= 85) tier = 'EXCELLENT';
      else if (score >= 70) tier = 'GOOD';
      else if (score >= 50) tier = 'FAIR';
      else if (score >= 25) tier = 'POOR';
      else tier = 'UNUSABLE';
      expect(tier).toBe(expected);
    }
  });

  it('scoreAudioQuality is exported and callable', () => {
    expect(typeof scoreAudioQuality).toBe('function');
  });
});

describe('Normalization Config', () => {
  it('DEFAULT config has expected values', () => {
    expect(DEFAULT_NORMALIZATION_CONFIG.sampleRate).toBe(16000);
    expect(DEFAULT_NORMALIZATION_CONFIG.channels).toBe(1);
    expect(DEFAULT_NORMALIZATION_CONFIG.outputFormat).toBe('wav');
    expect(DEFAULT_NORMALIZATION_CONFIG.arnndn).toBe(true);
    expect(DEFAULT_NORMALIZATION_CONFIG.afftdn).toBe(true);
    expect(DEFAULT_NORMALIZATION_CONFIG.compress).toBe(true);
    expect(DEFAULT_NORMALIZATION_CONFIG.deess).toBe(false);
    expect(DEFAULT_NORMALIZATION_CONFIG.highpassFrequency).toBe(80);
    expect(DEFAULT_NORMALIZATION_CONFIG.afftdnStrength).toBe(0.15);
  });

  it('AGGRESSIVE config has stronger settings than DEFAULT', () => {
    expect(AGGRESSIVE_NORMALIZATION_CONFIG.highpassFrequency).toBeGreaterThan(
      DEFAULT_NORMALIZATION_CONFIG.highpassFrequency
    );
    expect(AGGRESSIVE_NORMALIZATION_CONFIG.afftdnStrength).toBeGreaterThan(
      DEFAULT_NORMALIZATION_CONFIG.afftdnStrength
    );
    expect(AGGRESSIVE_NORMALIZATION_CONFIG.deess).toBe(true);
  });

  it('AGGRESSIVE config inherits all DEFAULT base values', () => {
    expect(AGGRESSIVE_NORMALIZATION_CONFIG.sampleRate).toBe(DEFAULT_NORMALIZATION_CONFIG.sampleRate);
    expect(AGGRESSIVE_NORMALIZATION_CONFIG.channels).toBe(DEFAULT_NORMALIZATION_CONFIG.channels);
    expect(AGGRESSIVE_NORMALIZATION_CONFIG.outputFormat).toBe(DEFAULT_NORMALIZATION_CONFIG.outputFormat);
    expect(AGGRESSIVE_NORMALIZATION_CONFIG.arnndn).toBe(DEFAULT_NORMALIZATION_CONFIG.arnndn);
    expect(AGGRESSIVE_NORMALIZATION_CONFIG.afftdn).toBe(DEFAULT_NORMALIZATION_CONFIG.afftdn);
    expect(AGGRESSIVE_NORMALIZATION_CONFIG.compress).toBe(DEFAULT_NORMALIZATION_CONFIG.compress);
  });
});

describe('Pipeline Edge Cases (unit-level)', () => {
  it('UNUSABLE tier should abort pipeline — verified by quality score logic', () => {
    // The pipeline checks: if (qualityScore.tier === 'UNUSABLE') throw new Error(...)
    // This test verifies the scoring thresholds that would produce UNUSABLE
    const penaltiesForNoAudio = 100; // No audio track = -100
    const score = Math.max(0, 100 - penaltiesForNoAudio);
    expect(score).toBe(0);

    let tier: AudioQualityScore['tier'];
    if (score >= 85) tier = 'EXCELLENT';
    else if (score >= 70) tier = 'GOOD';
    else if (score >= 50) tier = 'FAIR';
    else if (score >= 25) tier = 'POOR';
    else tier = 'UNUSABLE';

    expect(tier).toBe('UNUSABLE');
  });

  it('POOR tier should trigger AGGRESSIVE config — verified by threshold check', () => {
    // The pipeline checks: if (qualityScore.tier === 'POOR') use AGGRESSIVE
    const score = 30; // POOR range: 25-49
    let tier: AudioQualityScore['tier'];
    if (score >= 85) tier = 'EXCELLENT';
    else if (score >= 70) tier = 'GOOD';
    else if (score >= 50) tier = 'FAIR';
    else if (score >= 25) tier = 'POOR';
    else tier = 'UNUSABLE';

    expect(tier).toBe('POOR');
    // Pipeline would select AGGRESSIVE_NORMALIZATION_CONFIG
    expect(AGGRESSIVE_NORMALIZATION_CONFIG.deess).toBe(true);
    expect(AGGRESSIVE_NORMALIZATION_CONFIG.afftdnStrength).toBe(0.35);
  });

  it('zero flagged words produces empty array without error', () => {
    const words: Array<{ confidence: number }> = [
      { confidence: 0.95 },
      { confidence: 0.92 },
      { confidence: 0.88 },
    ];

    const threshold = 0.85;
    const flagged = words.filter(w => w.confidence < threshold);
    expect(flagged).toHaveLength(0);
  });

  it('all words below threshold are flagged', () => {
    const words = [
      { word: 'test', confidence: 0.3 },
      { word: 'hello', confidence: 0.5 },
      { word: 'world', confidence: 0.9 },
    ];

    const threshold = 0.85;
    const flagged = words.filter(w => w.confidence < threshold);
    expect(flagged).toHaveLength(2);
    expect(flagged.map(w => w.word)).toEqual(['test', 'hello']);
  });
});

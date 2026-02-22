import { beforeEach, describe, expect, it, vi } from 'vitest';
import { transcribeAudio } from '@/lib/transcription/deepgram';
import { reassembleChunks } from '@/lib/transcription/reassemble';
import type { ProcessedChunk } from '@/types/transcription';

const { transcribeFileMock, createClientMock } = vi.hoisted(() => {
  const transcribeFileMock = vi.fn();
  const createClientMock = vi.fn(() => ({
    listen: {
      prerecorded: {
        transcribeFile: transcribeFileMock,
      },
    },
  }));
  return { transcribeFileMock, createClientMock };
});

vi.mock('@deepgram/sdk', () => ({
  createClient: createClientMock,
}));

describe('Transcription Pipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DEEPGRAM_API_KEY = 'test-key';
  });

  it('should extract words and transcript from Deepgram response', async () => {
    transcribeFileMock.mockResolvedValueOnce({
      result: {
        results: {
          channels: [
            {
              alternatives: [
                {
                  transcript: 'Please state your name.',
                  words: [
                    { word: 'Please', punctuated_word: 'Please', start: 0, end: 0.5, confidence: 0.99, speaker: 0 },
                    { word: 'name', punctuated_word: 'name.', start: 1.0, end: 1.4, confidence: 0.45, speaker: 0 },
                  ],
                },
              ],
            },
          ],
          utterances: [
            { transcript: 'Please state your name.', speaker: 0, start: 0, end: 1.4, channel: 0 },
          ],
        },
      },
      error: null,
    });

    const result = await transcribeAudio(Buffer.from('fake-audio'));
    expect(result.words.length).toBe(2);
    expect(result.words[0].word).toBe('Please');
    expect(result.fullTranscript).toContain('SPEAKER_00');
  });

  it('should identify low-confidence words below 0.85 threshold', async () => {
    transcribeFileMock.mockResolvedValueOnce({
      result: {
        results: {
          channels: [
            {
              alternatives: [
                {
                  transcript: 'Please state your name.',
                  words: [
                    { word: 'Please', punctuated_word: 'Please', start: 0, end: 0.5, confidence: 0.99, speaker: 0 },
                    { word: 'name', punctuated_word: 'name.', start: 1.0, end: 1.4, confidence: 0.45, speaker: 0 },
                  ],
                },
              ],
            },
          ],
          utterances: [],
        },
      },
      error: null,
    });

    const result = await transcribeAudio(Buffer.from('fake-audio'));
    const flagged = result.words.filter((w) => w.confidence < 0.85);
    expect(flagged).toHaveLength(1);
    expect(flagged[0].word).toBe('name');
  });

  it('should reassemble chunks and deduplicate overlap', async () => {
    const chunkA: ProcessedChunk = {
      index: 0,
      audioStartSeconds: 0,
      overlapSeconds: 5,
      result: {
        words: [
          { word: 'Hello', punctuated_word: 'Hello', start: 0, end: 0.4, confidence: 0.9, speaker: 'SPEAKER_00', speaker_channel: 0, is_flagged: false },
          { word: 'world', punctuated_word: 'world', start: 10, end: 10.3, confidence: 0.9, speaker: 'SPEAKER_00', speaker_channel: 0, is_flagged: false },
        ],
        segments: [{ text: 'Hello world', speaker: 'SPEAKER_00', start: 0, end: 10.3, channel: 0, original_text: 'Hello world' }],
        speakers: [{ id: 'SPEAKER_00', label: 'SPEAKER_00', channel: 0, original_label: 'SPEAKER_00' }],
        fullTranscript: 'SPEAKER_00: Hello world',
        rawJson: {},
        confidence: 0.9,
      },
    };

    const chunkB: ProcessedChunk = {
      index: 1,
      audioStartSeconds: 10,
      overlapSeconds: 5,
      result: {
        words: [
          { word: 'world', punctuated_word: 'world', start: 0, end: 0.3, confidence: 0.95, speaker: 'SPEAKER_00', speaker_channel: 0, is_flagged: false },
          { word: 'again', punctuated_word: 'again', start: 1, end: 1.4, confidence: 0.95, speaker: 'SPEAKER_00', speaker_channel: 0, is_flagged: false },
        ],
        segments: [{ text: 'world again', speaker: 'SPEAKER_00', start: 0, end: 1.4, channel: 0, original_text: 'world again' }],
        speakers: [{ id: 'SPEAKER_00', label: 'SPEAKER_00', channel: 0, original_label: 'SPEAKER_00' }],
        fullTranscript: 'SPEAKER_00: world again',
        rawJson: {},
        confidence: 0.95,
      },
    };

    const merged = await reassembleChunks([chunkA, chunkB], 5);
    expect(merged.words.length).toBeGreaterThanOrEqual(2);
    expect(merged.fullTranscript.length).toBeGreaterThan(0);
  });

  it('should fail gracefully when no chunks are provided', async () => {
    await expect(reassembleChunks([], 5)).rejects.toThrow('No chunks to reassemble');
  });

  it('should preserve speaker labels through transformation', async () => {
    transcribeFileMock.mockResolvedValueOnce({
      result: {
        results: {
          channels: [
            {
              alternatives: [
                {
                  transcript: 'Q. Please state your name.',
                  words: [{ word: 'Please', punctuated_word: 'Please', start: 0, end: 0.5, confidence: 0.99, speaker: 1 }],
                },
              ],
            },
          ],
          utterances: [{ transcript: 'Please state your name.', speaker: 1, start: 0, end: 0.5, channel: 0 }],
        },
      },
      error: null,
    });

    const result = await transcribeAudio(Buffer.from('fake-audio'));
    expect(result.words[0].speaker).toBe('SPEAKER_01');
  });
});

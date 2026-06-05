import type { DeepgramResponse } from "./types";

function fixtureSha(seed: string): string {
  return seed.padEnd(64, "0").slice(0, 64);
}

export function createOfflineDeepgramFixture(caseId: string): DeepgramResponse {
  const created = "2026-06-05T17:30:00.000Z";

  return {
    metadata: {
      request_id: `offline_${caseId}`,
      sha256: fixtureSha(caseId.replace(/[^a-z0-9]/gi, "").toLowerCase()),
      created,
      duration: 12.4,
      channels: 1,
      transcription_source: "offline-fallback",
      model_info: {
        offline: {
          name: "offline-fixture",
          version: "1.0",
          arch: "deterministic",
        },
      },
    },
    results: {
      channels: [
        {
          alternatives: [
            {
              transcript:
                "Good morning. Um, please state your name for the record. My name is Maria Lopez.",
              confidence: 0.9734,
              words: [
                { word: "good", punctuated_word: "Good", start: 0.0, end: 0.26, confidence: 0.9932, speaker: 0, speaker_confidence: 0.99 },
                { word: "morning", punctuated_word: "morning.", start: 0.26, end: 0.74, confidence: 0.9911, speaker: 0, speaker_confidence: 0.99 },
                { word: "um", punctuated_word: "Um,", start: 1.1, end: 1.3, confidence: 0.7321, speaker: 0, speaker_confidence: 0.96 },
                { word: "please", punctuated_word: "please", start: 1.3, end: 1.6, confidence: 0.9654, speaker: 0, speaker_confidence: 0.96 },
                { word: "state", punctuated_word: "state", start: 1.6, end: 1.86, confidence: 0.9654, speaker: 0, speaker_confidence: 0.96 },
                { word: "your", punctuated_word: "your", start: 1.86, end: 2.02, confidence: 0.9654, speaker: 0, speaker_confidence: 0.96 },
                { word: "name", punctuated_word: "name", start: 2.02, end: 2.34, confidence: 0.9654, speaker: 0, speaker_confidence: 0.96 },
                { word: "for", punctuated_word: "for", start: 2.34, end: 2.48, confidence: 0.9654, speaker: 0, speaker_confidence: 0.96 },
                { word: "the", punctuated_word: "the", start: 2.48, end: 2.6, confidence: 0.9654, speaker: 0, speaker_confidence: 0.96 },
                { word: "record", punctuated_word: "record.", start: 2.6, end: 3.06, confidence: 0.9654, speaker: 0, speaker_confidence: 0.96 },
                { word: "my", punctuated_word: "My", start: 4.0, end: 4.22, confidence: 0.9732, speaker: 1, speaker_confidence: 0.98 },
                { word: "name", punctuated_word: "name", start: 4.22, end: 4.52, confidence: 0.9732, speaker: 1, speaker_confidence: 0.98 },
                { word: "is", punctuated_word: "is", start: 4.52, end: 4.68, confidence: 0.9732, speaker: 1, speaker_confidence: 0.98 },
                { word: "maria", punctuated_word: "Maria", start: 4.68, end: 5.1, confidence: 0.8421, speaker: 1, speaker_confidence: 0.98 },
                { word: "lopez", punctuated_word: "Lopez.", start: 5.1, end: 5.58, confidence: 0.8123, speaker: 1, speaker_confidence: 0.98 },
              ],
            },
          ],
        },
      ],
      utterances: [
        {
          speaker: 0,
          start: 0.0,
          end: 3.06,
          transcript: "Good morning. Um, please state your name for the record.",
          confidence: 0.9621,
          words: [
            { word: "good", punctuated_word: "Good", start: 0.0, end: 0.26, confidence: 0.9932, speaker: 0 },
            { word: "morning", punctuated_word: "morning.", start: 0.26, end: 0.74, confidence: 0.9911, speaker: 0 },
            { word: "um", punctuated_word: "Um,", start: 1.1, end: 1.3, confidence: 0.7321, speaker: 0 },
            { word: "please", punctuated_word: "please", start: 1.3, end: 1.6, confidence: 0.9654, speaker: 0 },
            { word: "state", punctuated_word: "state", start: 1.6, end: 1.86, confidence: 0.9654, speaker: 0 },
            { word: "your", punctuated_word: "your", start: 1.86, end: 2.02, confidence: 0.9654, speaker: 0 },
            { word: "name", punctuated_word: "name", start: 2.02, end: 2.34, confidence: 0.9654, speaker: 0 },
            { word: "for", punctuated_word: "for", start: 2.34, end: 2.48, confidence: 0.9654, speaker: 0 },
            { word: "the", punctuated_word: "the", start: 2.48, end: 2.6, confidence: 0.9654, speaker: 0 },
            { word: "record", punctuated_word: "record.", start: 2.6, end: 3.06, confidence: 0.9654, speaker: 0 },
          ],
        },
        {
          speaker: 1,
          start: 4.0,
          end: 5.58,
          transcript: "My name is Maria Lopez.",
          confidence: 0.9002,
          words: [
            { word: "my", punctuated_word: "My", start: 4.0, end: 4.22, confidence: 0.9732, speaker: 1 },
            { word: "name", punctuated_word: "name", start: 4.22, end: 4.52, confidence: 0.9732, speaker: 1 },
            { word: "is", punctuated_word: "is", start: 4.52, end: 4.68, confidence: 0.9732, speaker: 1 },
            { word: "maria", punctuated_word: "Maria", start: 4.68, end: 5.1, confidence: 0.8421, speaker: 1 },
            { word: "lopez", punctuated_word: "Lopez.", start: 5.1, end: 5.58, confidence: 0.8123, speaker: 1 },
          ],
        },
      ],
    },
  };
}

/**
 * lib/transcription/speakerCache.ts
 *
 * Cross-chunk speaker identity cache.
 *
 * PROBLEM IT SOLVES:
 *   When a deposition is split into 45-minute chunks, Deepgram assigns numeric
 *   speaker IDs (0, 1, 2…) independently per chunk. Speaker 0 in Chunk A may
 *   be labeled Speaker 1 in Chunk B — the "permutation problem." This causes
 *   speaker attribution errors in long depositions.
 *
 * APPROACH (lightweight, no GPU required):
 *   1. Build a "fingerprint" for each speaker from their first-seen words in Chunk 0.
 *      Fingerprint = sorted set of the 20 most distinctive words spoken.
 *   2. For each subsequent chunk, compare new speaker fingerprints against the cache
 *      using Jaccard similarity (word-set overlap).
 *   3. If similarity > MATCH_THRESHOLD, reuse the cached speaker label.
 *   4. If no match, assign the next available speaker slot.
 *
 * This resolves speaker drift across the entire recording without any external
 * embedding service or GPU microservice.
 */

export interface SpeakerFingerprint {
  /** Stable label used across all chunks: SPEAKER_00, SPEAKER_01, … */
  stableLabel: string;
  /** The 20-word vocabulary set used for matching */
  vocabulary: Set<string>;
  /** How many words have been seen for this speaker (used for confidence weighting) */
  wordCount: number;
}

export interface WordWithSpeaker {
  word: string;
  speaker: string | number;
  confidence: number;
  start: number;
  end: number;
  [key: string]: unknown;
}

// Minimum Jaccard similarity to consider two speakers the same identity
const MATCH_THRESHOLD = 0.20; // 20% word overlap is enough for legal speech

// Words to exclude from fingerprinting (too common to be distinctive)
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'is', 'was', 'are', 'were', 'be', 'been', 'have',
  'has', 'had', 'do', 'did', 'does', 'will', 'would', 'could', 'should',
  'may', 'might', 'shall', 'can', 'that', 'this', 'it', 'he', 'she',
  'they', 'we', 'you', 'i', 'my', 'your', 'his', 'her', 'their', 'our',
  'uh', 'um', 'yes', 'no', 'okay', 'right', 'so', 'just', 'like',
]);

export class SpeakerIdentityCache {
  private fingerprints: SpeakerFingerprint[] = [];
  private nextIndex = 0;

  /**
   * Registers speakers from Chunk 0. These become the ground truth identities.
   * Must be called before processChunk for chunks 1+.
   */
  seedFromChunk(words: WordWithSpeaker[]): void {
    const speakerWords = this.groupWordsBySpeaker(words);

    for (const [rawId, speakerWordList] of speakerWords.entries()) {
      const label = this.formatLabel(this.nextIndex++);
      const vocabulary = this.buildVocabulary(speakerWordList);

      this.fingerprints.push({
        stableLabel: label,
        vocabulary,
        wordCount: speakerWordList.length,
      });

      // Map the raw Deepgram ID to the stable label in this chunk
      this._chunkMapping.set(String(rawId), label);
    }
  }

  // Internal map: rebuilt fresh for each chunk
  private _chunkMapping = new Map<string, string>();

  /**
   * Processes a chunk's words, remapping all speaker IDs to stable labels.
   * Returns a new array with `speaker` fields replaced by stable labels.
   */
  processChunk(words: WordWithSpeaker[]): WordWithSpeaker[] {
    this._chunkMapping = new Map<string, string>();

    const speakerWords = this.groupWordsBySpeaker(words);

    // Resolve each speaker in this chunk against the cache
    for (const [rawId, speakerWordList] of speakerWords.entries()) {
      const vocabulary = this.buildVocabulary(speakerWordList);
      const match = this.findBestMatch(vocabulary);

      if (match && this.jaccardSimilarity(vocabulary, match.vocabulary) >= MATCH_THRESHOLD) {
        // Merge vocabulary to improve future matching
        for (const w of vocabulary) match.vocabulary.add(w);
        match.wordCount += speakerWordList.length;
        this._chunkMapping.set(String(rawId), match.stableLabel);
      } else {
        // New speaker not seen before
        const label = this.formatLabel(this.nextIndex++);
        this.fingerprints.push({
          stableLabel: label,
          vocabulary,
          wordCount: speakerWordList.length,
        });
        this._chunkMapping.set(String(rawId), label);
      }
    }

    // Remap all words
    return words.map((w) => ({
      ...w,
      speaker: this._chunkMapping.get(String(w.speaker)) ?? String(w.speaker),
    }));
  }

  /** Returns how many distinct speakers have been identified so far */
  get speakerCount(): number {
    return this.fingerprints.length;
  }

  /** Returns all stable speaker labels registered */
  get stableLabels(): string[] {
    return this.fingerprints.map((f) => f.stableLabel);
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private groupWordsBySpeaker(words: WordWithSpeaker[]): Map<string, string[]> {
    const groups = new Map<string, string[]>();
    for (const w of words) {
      const id = String(w.speaker);
      if (!groups.has(id)) groups.set(id, []);
      groups.get(id)!.push(w.word.toLowerCase());
    }
    return groups;
  }

  private buildVocabulary(wordList: string[]): Set<string> {
    const freq = new Map<string, number>();
    for (const w of wordList) {
      if (w.length < 3) continue;
      if (STOP_WORDS.has(w)) continue;
      freq.set(w, (freq.get(w) ?? 0) + 1);
    }
    // Keep the 20 most frequent distinctive words
    const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);
    return new Set(sorted.map(([word]) => word));
  }

  private findBestMatch(vocabulary: Set<string>): SpeakerFingerprint | null {
    let best: SpeakerFingerprint | null = null;
    let bestScore = 0;

    for (const fp of this.fingerprints) {
      const score = this.jaccardSimilarity(vocabulary, fp.vocabulary);
      if (score > bestScore) {
        bestScore = score;
        best = fp;
      }
    }

    return best;
  }

  private jaccardSimilarity(a: Set<string>, b: Set<string>): number {
    if (a.size === 0 && b.size === 0) return 1;
    if (a.size === 0 || b.size === 0) return 0;

    let intersection = 0;
    for (const w of a) {
      if (b.has(w)) intersection++;
    }
    const union = a.size + b.size - intersection;
    return union === 0 ? 0 : intersection / union;
  }

  private formatLabel(index: number): string {
    return `SPEAKER_${String(index).padStart(2, '0')}`;
  }
}

// lib/transcription/reassemble.ts

import type {
  ProcessedChunk,
  ReassembledTranscription,
  TranscriptionWord,
  TranscriptionSegment,
  SpeakerInfo,
} from '@/types/transcription';

/**
 * Reassemble multiple transcribed chunks into a single continuous transcription.
 * Handles:
 *  - Timestamp offset adjustment (each chunk's timestamps are relative to chunk start)
 *  - Overlap deduplication (keeps higher-confidence version of duplicate words)
 *  - Speaker label merging across chunk boundaries
 */
export async function reassembleChunks(
  chunks: ProcessedChunk[],
  overlapSeconds: number
): Promise<ReassembledTranscription> {
  if (chunks.length === 0) {
    throw new Error('No chunks to reassemble');
  }

  if (chunks.length === 1) {
    // Single chunk — no reassembly needed
    const { result } = chunks[0];
    return {
      words: result.words,
      segments: result.segments,
      speakers: result.speakers,
      fullTranscript: result.fullTranscript,
    };
  }

  console.log(`Reassembling ${chunks.length} chunks with ${overlapSeconds}s overlap...`);

  // Sort chunks by index
  const sorted = [...chunks].sort((a, b) => a.index - b.index);

  // Start with chunk 0's data as the base
  let mergedWords: TranscriptionWord[] = [...sorted[0].result.words];
  let mergedSegments: TranscriptionSegment[] = [...sorted[0].result.segments];
  const allSpeakers = new Map<string, SpeakerInfo>();

  // Add chunk 0's speakers
  sorted[0].result.speakers.forEach(speaker => {
    allSpeakers.set(speaker.id, speaker);
  });

  // Process each subsequent chunk
  for (let i = 1; i < sorted.length; i++) {
    const chunk = sorted[i];
    const _prevChunk = sorted[i - 1];

    console.log(`  Merging chunk ${chunk.index}...`);

    // Offset all timestamps in this chunk by its audioStartSeconds
    const offsetWords = offsetWordsTimestamps(chunk.result.words, chunk.audioStartSeconds);
    const offsetSegments = offsetSegmentsTimestamps(chunk.result.segments, chunk.audioStartSeconds);

    // Determine overlap zone boundaries
    const overlapStart = chunk.audioStartSeconds;
    const overlapEnd = chunk.audioStartSeconds + overlapSeconds;

    // Deduplicate words in the overlap zone
    const { merged: deduplicatedWords, duplicateCount } = deduplicateOverlap(
      mergedWords,
      offsetWords,
      overlapStart,
      overlapEnd
    );

    console.log(`    Deduplicated ${duplicateCount} words in overlap zone`);

    // Build speaker mapping for this boundary
    const speakerMapping = buildSpeakerMapping(
      mergedWords,
      offsetWords,
      overlapStart,
      overlapEnd
    );

    if (speakerMapping.size > 0) {
      console.log(`    Remapping ${speakerMapping.size} speaker labels`);
    }

    // Apply speaker mapping to this chunk's words and segments
    const remappedWords = applySpeakerMapping(deduplicatedWords, speakerMapping);
    const remappedSegments = applySpeakerMappingToSegments(
      [...mergedSegments, ...offsetSegments],
      speakerMapping
    );

    // Update merged data
    mergedWords = remappedWords;
    mergedSegments = remappedSegments;

    // Add new speakers (with remapping applied)
    chunk.result.speakers.forEach(speaker => {
      const mappedId = speakerMapping.get(speaker.id) || speaker.id;
      if (!allSpeakers.has(mappedId)) {
        allSpeakers.set(mappedId, {
          ...speaker,
          id: mappedId,
          label: mappedId,
        });
      }
    });
  }

  // Sort final words by timestamp
  mergedWords.sort((a, b) => a.start - b.start);
  mergedSegments.sort((a, b) => a.start - b.start);

  // Rebuild full transcript from merged segments
  const fullTranscript = buildTranscriptFromSegments(mergedSegments);

  console.log(`Reassembly complete: ${mergedWords.length} words, ${mergedSegments.length} segments`);

  return {
    words: mergedWords,
    segments: mergedSegments,
    speakers: Array.from(allSpeakers.values()),
    fullTranscript,
  };
}

/**
 * Offset timestamps in a word array by a given number of seconds.
 */
function offsetWordsTimestamps(words: TranscriptionWord[], offsetSeconds: number): TranscriptionWord[] {
  return words.map(w => ({
    ...w,
    start: w.start + offsetSeconds,
    end: w.end + offsetSeconds,
  }));
}

/**
 * Offset timestamps in a segment array by a given number of seconds.
 */
function offsetSegmentsTimestamps(segments: TranscriptionSegment[], offsetSeconds: number): TranscriptionSegment[] {
  return segments.map(s => ({
    ...s,
    start: s.start + offsetSeconds,
    end: s.end + offsetSeconds,
  }));
}

/**
 * Deduplicate words in the overlap zone between two chunks.
 * Keeps the higher-confidence version when words match by timestamp.
 */
function deduplicateOverlap(
  chunkAWords: TranscriptionWord[],
  chunkBWords: TranscriptionWord[],
  overlapStart: number,
  overlapEnd: number,
  proximityThreshold: number = 0.3
): { merged: TranscriptionWord[]; duplicateCount: number } {
  // Get words from chunk A that are NOT in the overlap zone
  const chunkANonOverlap = chunkAWords.filter(w => w.start < overlapStart);

  // Get words from chunk A that ARE in the overlap zone
  const chunkAOverlap = chunkAWords.filter(w => w.start >= overlapStart && w.start < overlapEnd);

  // Get words from chunk B that are in the overlap zone
  const chunkBOverlap = chunkBWords.filter(w => w.start >= overlapStart && w.start < overlapEnd);

  // Get words from chunk B that are AFTER the overlap zone
  const chunkBAfterOverlap = chunkBWords.filter(w => w.start >= overlapEnd);

  // Deduplicate the overlap zone
  const deduplicatedOverlap: TranscriptionWord[] = [];
  const matchedBIndices = new Set<number>();
  let duplicateCount = 0;

  // For each word in chunk A's overlap, try to find a match in chunk B's overlap
  for (const wordA of chunkAOverlap) {
    type MatchType = { word: TranscriptionWord; index: number };
    let bestMatch: MatchType | null = null;
    let bestDistance = Infinity;

    chunkBOverlap.forEach((wordB, idx) => {
      if (matchedBIndices.has(idx)) return;

      const timeDiff = Math.abs(wordA.start - wordB.start);
      if (timeDiff <= proximityThreshold && timeDiff < bestDistance) {
        bestDistance = timeDiff;
        bestMatch = { word: wordB, index: idx };
      }
    });

    if (bestMatch) {
      // Found a match — keep the higher confidence version
      const match: MatchType = bestMatch;
      matchedBIndices.add(match.index);
      duplicateCount++;

      if (match.word.confidence >= wordA.confidence) {
        deduplicatedOverlap.push(match.word);
      } else {
        deduplicatedOverlap.push(wordA);
      }
    } else {
      // No match — include wordA (might be at boundary)
      deduplicatedOverlap.push(wordA);
    }
  }

  // Add unmatched words from chunk B's overlap
  chunkBOverlap.forEach((wordB, idx) => {
    if (!matchedBIndices.has(idx)) {
      deduplicatedOverlap.push(wordB);
    }
  });

  // Merge all sections: chunkA before overlap + deduplicated overlap + chunkB after overlap
  const merged = [
    ...chunkANonOverlap,
    ...deduplicatedOverlap,
    ...chunkBAfterOverlap,
  ];

  return { merged, duplicateCount };
}

/**
 * Build speaker mapping between two chunks by analyzing overlap region.
 */
function buildSpeakerMapping(
  chunkAWords: TranscriptionWord[],
  chunkBWords: TranscriptionWord[],
  overlapStart: number,
  overlapEnd: number
): Map<string, string> {
  const mapping = new Map<string, string>();

  // Get words in the overlap zone
  const chunkAOverlap = chunkAWords.filter(w => w.start >= overlapStart && w.start < overlapEnd);
  const chunkBOverlap = chunkBWords.filter(w => w.start >= overlapStart && w.start < overlapEnd);

  // Count speaker co-occurrences in the overlap
  const coOccurrences = new Map<string, Map<string, number>>();

  for (const wordB of chunkBOverlap) {
    // Find matching word in chunk A by timestamp proximity
    const match = chunkAOverlap.find(wordA =>
      Math.abs(wordA.start - wordB.start) <= 0.3 &&
      wordA.word.toLowerCase() === wordB.word.toLowerCase()
    );

    if (match) {
      const speakerB = wordB.speaker;
      const speakerA = match.speaker;

      if (speakerB !== speakerA) {
        if (!coOccurrences.has(speakerB)) {
          coOccurrences.set(speakerB, new Map());
        }

        const counts = coOccurrences.get(speakerB)!;
        counts.set(speakerA, (counts.get(speakerA) || 0) + 1);
      }
    }
  }

  // Build mapping: for each chunk B speaker, map to the chunk A speaker with most co-occurrences
  for (const [speakerB, counts] of coOccurrences.entries()) {
    let maxCount = 0;
    let bestMatch = speakerB;

    for (const [speakerA, count] of counts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        bestMatch = speakerA;
      }
    }

    // Only create mapping if we have strong evidence (at least 3 matching words)
    if (maxCount >= 3) {
      mapping.set(speakerB, bestMatch);
    }
  }

  return mapping;
}

/**
 * Apply speaker mapping to words.
 */
function applySpeakerMapping(
  words: TranscriptionWord[],
  mapping: Map<string, string>
): TranscriptionWord[] {
  if (mapping.size === 0) {
    return words;
  }

  return words.map(w => {
    const mappedSpeaker = mapping.get(w.speaker);
    if (mappedSpeaker) {
      return {
        ...w,
        speaker: mappedSpeaker,
      };
    }
    return w;
  });
}

/**
 * Apply speaker mapping to segments.
 */
function applySpeakerMappingToSegments(
  segments: TranscriptionSegment[],
  mapping: Map<string, string>
): TranscriptionSegment[] {
  if (mapping.size === 0) {
    return segments;
  }

  return segments.map(s => {
    const mappedSpeaker = mapping.get(s.speaker);
    if (mappedSpeaker) {
      return {
        ...s,
        speaker: mappedSpeaker,
      };
    }
    return s;
  });
}

/**
 * Build full transcript text from segments with speaker labels.
 */
function buildTranscriptFromSegments(segments: TranscriptionSegment[]): string {
  if (segments.length === 0) {
    return '';
  }

  // Group consecutive segments by speaker
  const lines: string[] = [];
  let currentSpeaker: string | null = null;
  let currentText: string[] = [];

  for (const segment of segments) {
    if (segment.speaker !== currentSpeaker) {
      // Speaker changed — flush current line
      if (currentSpeaker !== null && currentText.length > 0) {
        lines.push(`${currentSpeaker}: ${currentText.join(' ')}`);
      }

      currentSpeaker = segment.speaker;
      currentText = [segment.text];
    } else {
      // Same speaker — append text
      currentText.push(segment.text);
    }
  }

  // Flush last line
  if (currentSpeaker !== null && currentText.length > 0) {
    lines.push(`${currentSpeaker}: ${currentText.join(' ')}`);
  }

  return lines.join('\n\n');
}

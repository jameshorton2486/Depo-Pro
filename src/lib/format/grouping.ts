import type { EditorDocument } from "../../api/types";

export const ENABLE_DISPLAY_TURN_SEGMENTATION = true;
const MIN_SEGMENT_WORDS = 2;

export type DisplaySegment = {
  utterance_id: string;
  segment_index: number;
  segment_count: number;
  speaker_id: string;
  word_ids: string[];
};

type RawSegment = {
  speaker_id: string;
  word_ids: string[];
};

function collapseShortRuns(runs: RawSegment[]): RawSegment[] {
  if (runs.length <= 1) {
    return runs;
  }

  const merged: RawSegment[] = [];
  for (let index = 0; index < runs.length; index += 1) {
    const run = runs[index];
    if (run.word_ids.length >= MIN_SEGMENT_WORDS) {
      merged.push({ ...run, word_ids: [...run.word_ids] });
      continue;
    }

    if (merged.length === 0) {
      const next = runs[index + 1];
      if (next) {
        next.word_ids = [...run.word_ids, ...next.word_ids];
        continue;
      }
      merged.push({ ...run, word_ids: [...run.word_ids] });
      continue;
    }

    const previous = merged[merged.length - 1];
    previous.word_ids.push(...run.word_ids);
  }

  return merged;
}

export function segmentUtterance(
  utterance: EditorDocument["utterances"][number],
  wordById: Map<string, EditorDocument["words"][number]>
): DisplaySegment[] {
  const runs: RawSegment[] = [];

  for (const wordId of utterance.word_ids) {
    const word = wordById.get(wordId);
    if (!word) {
      continue;
    }

    const speakerId = word.speaker_id;
    const previous = runs[runs.length - 1];
    if (!previous || previous.speaker_id !== speakerId) {
      runs.push({ speaker_id: speakerId, word_ids: [wordId] });
      continue;
    }

    previous.word_ids.push(wordId);
  }

  const mergedRuns = collapseShortRuns(runs);
  return mergedRuns.map((run, index) => ({
    utterance_id: utterance.utterance_id,
    segment_index: index,
    segment_count: mergedRuns.length,
    speaker_id: run.speaker_id,
    word_ids: run.word_ids,
  }));
}

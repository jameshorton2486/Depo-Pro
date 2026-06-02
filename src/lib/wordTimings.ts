import type { EditorDocument } from "../api/types";

export interface WordTiming {
  word_id: string;
  start: number;
  end: number;
}

export function buildWordTimings(doc: EditorDocument | null): WordTiming[] {
  if (!doc) return [];
  return doc.words
    .map((w) => ({ word_id: w.word_id, start: w.start_time, end: w.end_time }))
    .sort((a, b) => a.start - b.start);
}

// Binary search: returns the word_id whose [start, end] bracket contains t.
// Falls back to the nearest upcoming word within 300 ms of silence.
export function findWordAtTime(timings: WordTiming[], t: number): string | null {
  if (timings.length === 0 || t < 0) return null;

  let lo = 0;
  let hi = timings.length - 1;

  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const w = timings[mid];
    if (t < w.start) {
      hi = mid - 1;
    } else if (t > w.end) {
      lo = mid + 1;
    } else {
      return w.word_id;
    }
  }

  // Between words: snap forward to next word if within 300 ms gap
  if (lo < timings.length && timings[lo].start - t <= 0.3) {
    return timings[lo].word_id;
  }

  return null;
}

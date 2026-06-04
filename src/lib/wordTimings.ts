import type { EditorDocument } from "../api/types";

export interface WordTiming {
  word_id: string;
  start: number;
  end: number;
}

function pickBestContainingWord(
  timings: WordTiming[],
  candidateIndexes: number[],
  t: number
): string | null {
  let best: WordTiming | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const idx of candidateIndexes) {
    const word = timings[idx];
    if (!word || t < word.start || t > word.end) continue;

    const midpoint = (word.start + word.end) / 2;
    const distance = Math.abs(midpoint - t);

    if (
      !best ||
      distance < bestDistance ||
      (distance === bestDistance && word.start > best.start) ||
      (distance === bestDistance &&
        word.start === best.start &&
        word.end < best.end)
    ) {
      best = word;
      bestDistance = distance;
    }
  }

  return best?.word_id ?? null;
}

function findContainingNearby(
  timings: WordTiming[],
  pivot: number,
  t: number
): string | null {
  if (pivot < 0 || pivot >= timings.length) return null;

  const candidates = new Set<number>([pivot]);

  for (let i = pivot - 1; i >= 0; i--) {
    if (timings[i].end < t) break;
    candidates.add(i);
  }

  for (let i = pivot + 1; i < timings.length; i++) {
    if (timings[i].start > t) break;
    candidates.add(i);
  }

  return pickBestContainingWord(timings, Array.from(candidates), t);
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
      return findContainingNearby(timings, mid, t) ?? w.word_id;
    }
  }

  const nearby = pickBestContainingWord(
    timings,
    [hi, lo].filter((idx) => idx >= 0 && idx < timings.length),
    t
  );
  if (nearby) return nearby;

  // Between words: snap forward to next word if within 300 ms gap
  if (lo < timings.length && timings[lo].start - t <= 0.3) {
    return timings[lo].word_id;
  }

  return null;
}

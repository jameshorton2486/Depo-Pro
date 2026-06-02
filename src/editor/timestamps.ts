// Word-level timestamp interpolation for split and merge operations.
// All functions are deterministic: same inputs always produce the same output.

export interface WordTiming {
  word_id: string;
  text: string;
  start_time: number;
  end_time: number;
}

export interface SplitResult {
  left: WordTiming;
  right: WordTiming;
}

/**
 * Split a word token at a character boundary, interpolating timestamps by
 * character-length ratio.
 *
 * IDs: left gets `word_id + "_L"`, right gets `word_id + "_R"`.
 * Timestamps: the split point is proportional to leftText.length / totalChars.
 */
export function splitWordTimestamps(
  word: WordTiming,
  leftText: string,
  rightText: string
): SplitResult {
  if (leftText === "" && rightText === "") {
    throw new Error("splitWordTimestamps: both halves cannot be empty");
  }
  const totalChars = leftText.length + rightText.length;
  const ratio = totalChars > 0 ? leftText.length / totalChars : 0.5;
  const duration = word.end_time - word.start_time;
  const splitPoint = parseFloat(
    (word.start_time + duration * ratio).toFixed(3)
  );

  return {
    left: {
      word_id: `${word.word_id}_L`,
      text: leftText,
      start_time: word.start_time,
      end_time: splitPoint,
    },
    right: {
      word_id: `${word.word_id}_R`,
      text: rightText,
      start_time: splitPoint,
      end_time: word.end_time,
    },
  };
}

/**
 * Merge two or more word tokens into one compound token.
 * Result: start_time of the chronologically earliest word,
 *         end_time of the chronologically latest word.
 * Result word_id: constituent IDs joined with "+".
 */
export function mergeWordTimestamps(words: WordTiming[]): WordTiming {
  if (words.length === 0) {
    throw new Error("mergeWordTimestamps: requires at least one word");
  }
  const sorted = [...words].sort((a, b) => a.start_time - b.start_time);
  return {
    word_id: sorted.map((w) => w.word_id).join("+"),
    text: words.map((w) => w.text).join(" "),
    start_time: sorted[0].start_time,
    end_time: sorted[sorted.length - 1].end_time,
  };
}

export interface RecognitionBenchmarkInput {
  referenceWords: string[];
  hypothesisWords: string[];
  keyterms: string[];
  referenceSpeakers?: Array<string | number>;
  hypothesisSpeakers?: Array<string | number>;
  manualCorrectionCount?: number;
}

export interface RecognitionBenchmarkResult {
  wordErrorRate: number;
  keytermRecall: number;
  speakerConfusionRate: number | null;
  manualCorrectionsPerThousandWords: number;
  referenceWordCount: number;
}

function normalizeToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9'-]+/g, "");
}

function editDistance(left: string[], right: string[]): number {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitution = previous[rightIndex - 1] + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1);
      current[rightIndex] = Math.min(previous[rightIndex] + 1, current[rightIndex - 1] + 1, substitution);
    }
    previous.splice(0, previous.length, ...current);
  }
  return previous[right.length] ?? left.length;
}

function containsPhrase(words: string[], phrase: string[]): boolean {
  if (phrase.length === 0 || phrase.length > words.length) return false;
  return words.some((_, index) => phrase.every((token, offset) => words[index + offset] === token));
}

export function scoreRecognitionBenchmark(input: RecognitionBenchmarkInput): RecognitionBenchmarkResult {
  const reference = input.referenceWords.map(normalizeToken).filter(Boolean);
  const hypothesis = input.hypothesisWords.map(normalizeToken).filter(Boolean);
  const normalizedKeyterms = input.keyterms
    .map((keyterm) => keyterm.split(/\s+/).map(normalizeToken).filter(Boolean))
    .filter((keyterm) => keyterm.length > 0);
  const matchedKeyterms = normalizedKeyterms.filter((keyterm) => containsPhrase(hypothesis, keyterm)).length;
  const comparableSpeakerCount = Math.min(
    input.referenceSpeakers?.length ?? 0,
    input.hypothesisSpeakers?.length ?? 0,
  );
  const speakerMismatches = Array.from({ length: comparableSpeakerCount }, (_, index) => index)
    .filter((index) => input.referenceSpeakers?.[index] !== input.hypothesisSpeakers?.[index]).length;

  return {
    wordErrorRate: reference.length === 0 ? 0 : editDistance(reference, hypothesis) / reference.length,
    keytermRecall: normalizedKeyterms.length === 0 ? 1 : matchedKeyterms / normalizedKeyterms.length,
    speakerConfusionRate: comparableSpeakerCount === 0 ? null : speakerMismatches / comparableSpeakerCount,
    manualCorrectionsPerThousandWords:
      reference.length === 0 ? 0 : ((input.manualCorrectionCount ?? 0) / reference.length) * 1000,
    referenceWordCount: reference.length,
  };
}

import type {
  BenchmarkTranscript,
  EditDistanceMetrics,
  SpeakerMetrics,
} from "./BenchmarkMetrics";

const TOKEN_PATTERN = /[\p{L}\p{N}']+/gu;
const SPEAKER_LINE = /^(Q\.?|A\.?|[A-Z][A-Z .'-]{2,}):?\s+(.*)$/;

interface ParsedLine {
  label: string;
  text: string;
}

function normalize(value: string): string[] {
  return (value.toLocaleLowerCase().match(TOKEN_PATTERN) ?? []);
}

function editDistance(reference: readonly string[], hypothesis: readonly string[]): EditDistanceMetrics {
  const referenceLength = reference.length;
  const hypothesisLength = hypothesis.length;
  if (referenceLength === 0 || hypothesisLength === 0) {
    const insertions = hypothesisLength;
    const deletions = referenceLength;
    const distance = Math.max(insertions, deletions);
    return { insertions, deletions, substitutions: 0, distance, rate: referenceLength === 0 ? (hypothesisLength === 0 ? 0 : 1) : distance / referenceLength };
  }
  const maximum = referenceLength + hypothesisLength;
  const offset = maximum + 1;
  const frontier = new Int32Array(maximum * 2 + 3);
  frontier.fill(-1);
  frontier[offset + 1] = 0;
  let editCount = maximum;
  outer: for (let edits = 0; edits <= maximum; edits += 1) {
    for (let diagonal = -edits; diagonal <= edits; diagonal += 2) {
      const index = offset + diagonal;
      let x = diagonal === -edits || (diagonal !== edits && frontier[index - 1] < frontier[index + 1])
        ? frontier[index + 1]
        : frontier[index - 1] + 1;
      let y = x - diagonal;
      while (x < referenceLength && y < hypothesisLength && reference[x] === hypothesis[y]) {
        x += 1;
        y += 1;
      }
      frontier[index] = x;
      if (x >= referenceLength && y >= hypothesisLength) {
        editCount = edits;
        break outer;
      }
    }
  }
  const rawDeletions = (editCount + referenceLength - hypothesisLength) / 2;
  const rawInsertions = editCount - rawDeletions;
  const substitutions = Math.min(rawInsertions, rawDeletions);
  const insertions = rawInsertions - substitutions;
  const deletions = rawDeletions - substitutions;
  const distance = insertions + deletions + substitutions;
  return { insertions, deletions, substitutions, distance, rate: distance / referenceLength };
}
function parseLines(value: string): ParsedLine[] {
  return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
    const match = line.match(SPEAKER_LINE);
    return match ? { label: match[1].replace(/\.$/, ""), text: match[2] } : { label: "", text: line };
  });
}

function percentage(found: number, expected: number): number {
  return expected === 0 ? 100 : Math.min(100, (found / expected) * 100);
}

function countAccuracy(found: number, expected: number): number {
  if (expected === 0) return found === 0 ? 100 : 0;
  return Math.max(0, 100 - Math.abs(found - expected) / expected * 100);
}

function countMatching(lines: ParsedLine[], pattern: RegExp): number {
  return lines.filter((line) => pattern.test(`${line.label} ${line.text}`)).length;
}

export interface TranscriptComparison {
  words: EditDistanceMetrics;
  characters: EditDistanceMetrics;
  speaker: SpeakerMetrics;
  questionRecovery: number;
  answerAccuracy: number;
  objectionRecovery: number;
  colloquyRecovery: number;
  paragraphAccuracy: number;
  splitQuestionCount: number;
  splitAnswerCount: number;
  mergedQuestionAnswerCount: number;
}

export function compareTranscripts(certified: string, hypothesis: BenchmarkTranscript): TranscriptComparison {
  const truthLines = parseLines(certified);
  const hypothesisLines = hypothesis.utterances.map((utterance) => ({ label: utterance.speaker, text: utterance.text }));
  const wordMetrics = editDistance(normalize(certified), normalize(hypothesis.text));
  const characterMetrics = editDistance(
    [...certified.toLocaleLowerCase().replace(/\s/g, "")],
    [...hypothesis.text.toLocaleLowerCase().replace(/\s/g, "")],
  );
  const comparable = Math.min(truthLines.length, hypothesisLines.length);
  const votes = new Map<string, Map<string, number>>();
  for (let index = 0; index < comparable; index += 1) {
    const truthLabel = truthLines[index].label;
    const hypothesisLabel = hypothesisLines[index].label;
    if (!truthLabel || !hypothesisLabel) continue;
    const speakerVotes = votes.get(hypothesisLabel) ?? new Map<string, number>();
    speakerVotes.set(truthLabel, (speakerVotes.get(truthLabel) ?? 0) + 1);
    votes.set(hypothesisLabel, speakerVotes);
  }
  const speakerMap = new Map<string, string>();
  for (const [hypothesisLabel, speakerVotes] of votes) {
    const mappedLabel = [...speakerVotes]
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0]?.[0];
    if (mappedLabel) speakerMap.set(hypothesisLabel, mappedLabel);
  }
  let correct = 0;
  for (let index = 0; index < comparable; index += 1) {
    const hypothesisLabel = hypothesisLines[index].label;
    if (truthLines[index].label && truthLines[index].label === (speakerMap.get(hypothesisLabel) ?? hypothesisLabel)) correct += 1;
  }
  const labeledTruth = truthLines.filter((line) => line.label).length;
  const labeledHypothesis = hypothesisLines.filter((line) => line.label).length;
  const speaker: SpeakerMetrics = {
    correct,
    incorrect: Math.max(0, comparable - correct),
    missed: Math.max(0, labeledTruth - comparable),
    accuracy: percentage(correct, labeledTruth),
    precision: percentage(correct, labeledHypothesis),
    recall: percentage(correct, labeledTruth),
  };
  const truthQuestions = countMatching(truthLines, /^Q\b|\?$/);
  const foundQuestions = hypothesisLines.filter((line) => /\?$/.test(line.text)).length;
  const truthAnswers = truthLines.filter((line) => line.label === "A").length;
  const foundAnswers = hypothesisLines.filter((line) => !/\?$/.test(line.text)).length;
  const truthObjections = countMatching(truthLines, /\bobjection\b/i);
  const foundObjections = countMatching(hypothesisLines, /\bobjection\b/i);
  const colloquyPattern = /\b(THE REPORTER|THE VIDEOGRAPHER|THE INTERPRETER|THE CLERK|EXAMINATION|CROSS EXAMINATION|REDIRECT|RECROSS|EXHIBIT|RECESS)\b/i;
  const truthColloquy = countMatching(truthLines, colloquyPattern);
  const foundColloquy = countMatching(hypothesisLines, colloquyPattern);

  return {
    words: wordMetrics,
    characters: characterMetrics,
    speaker,
    questionRecovery: countAccuracy(foundQuestions, truthQuestions),
    answerAccuracy: countAccuracy(foundAnswers, truthAnswers),
    objectionRecovery: percentage(foundObjections, truthObjections),
    colloquyRecovery: percentage(foundColloquy, truthColloquy),
    paragraphAccuracy: percentage(Math.min(truthLines.length, hypothesisLines.length), truthLines.length),
    splitQuestionCount: Math.max(0, foundQuestions - truthQuestions),
    splitAnswerCount: Math.max(0, hypothesisLines.length - truthLines.length - Math.max(0, foundQuestions - truthQuestions)),
    mergedQuestionAnswerCount: Math.max(0, truthLines.length - hypothesisLines.length),
  };
}

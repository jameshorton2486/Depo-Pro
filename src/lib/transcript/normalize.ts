import type { DeepgramResponse, DeepgramUtterance, DeepgramWord } from "./types";

const FILLER_TOKENS = new Set(["um", "uh", "uh-huh", "huh-uh", "mm-hmm", "er", "ah"]);

// Speaker-flip smoothing. Deepgram's diarizer occasionally attributes a short
// span of words (often a single word) to the wrong speaker in the middle of an
// otherwise homogeneous turn. Those flips fragment Q/A pairs into spurious
// utterances downstream. We only correct a flip when the diarizer itself was
// unsure — i.e. its per-word speaker_confidence is low — so that legitimate
// one-word turns ("Yes."/"No."), which are extremely common in depositions and
// carry high speaker_confidence, are never rewritten.
const SPEAKER_SMOOTHING_MAX_RUN = 2;
const SPEAKER_SMOOTHING_CONFIDENCE_CEILING = 0.5;

interface SpeakerFlipUnit {
  speaker: number;
  speakerConfidence: number | null;
}

export interface CanonicalSpeakerRow {
  speaker_id: string;
  speaker_index: number;
  speaker_label: string;
  assigned_name: string | null;
  speaker_role: string | null;
  word_count: number;
}

export interface CanonicalUtteranceRow {
  utterance_id: string;
  utterance_index: number;
  speaker_id: string;
  speaker_index: number;
  speaker_label: string;
  start_time: number;
  end_time: number;
  text: string;
  avg_confidence: number;
}

export interface CanonicalWordRow {
  word_id: string;
  utterance_id: string;
  word_index: number;
  raw_text: string;
  working_text: string | null;
  speaker_id: string;
  speaker_index: number;
  start_time: number;
  end_time: number;
  confidence: number;
  is_filler: boolean;
  reviewed: boolean;
  edited: boolean;
}

export interface NormalizedTranscriptData {
  durationSeconds: number;
  avgConfidence: number | null;
  speakers: CanonicalSpeakerRow[];
  utterances: CanonicalUtteranceRow[];
  words: CanonicalWordRow[];
}

function roundConfidence(value: number | undefined): number {
  const safe = Number.isFinite(value) ? Number(value) : 0;
  return Number(safe.toFixed(4));
}

function speakerIdForIndex(speakerIndex: number): string {
  return `spk_${String(speakerIndex).padStart(3, "0")}`;
}

function utteranceIdForIndex(index: number): string {
  return `utt_${String(index).padStart(6, "0")}`;
}

function wordIdForIndex(index: number): string {
  return `w_${String(index).padStart(8, "0")}`;
}

function getRawText(word: DeepgramWord): string {
  return word.punctuated_word || word.word;
}

function normalizeFillerToken(word: string): string {
  return word.toLowerCase().replace(/^[^a-z]+|[^a-z-]+$/g, "");
}

function isFillerWord(word: DeepgramWord): boolean {
  return FILLER_TOKENS.has(normalizeFillerToken(getRawText(word)));
}

function buildFallbackUtterances(words: DeepgramWord[]): DeepgramUtterance[] {
  if (words.length === 0) {
    return [];
  }

  const utterances: DeepgramUtterance[] = [];
  let current: DeepgramUtterance = {
    speaker: words[0]?.speaker ?? 0,
    start: words[0]?.start ?? 0,
    end: words[0]?.end ?? 0,
    transcript: "",
    confidence: words[0]?.confidence ?? 0,
    words: [],
  };

  for (const word of words) {
    const speaker = word.speaker ?? current.speaker ?? 0;
    if (current.words.length > 0 && speaker !== (current.speaker ?? 0)) {
      current.transcript = current.words.map((item) => getRawText(item)).join(" ");
      current.confidence = roundConfidence(
        current.words.reduce((sum, item) => sum + (item.confidence ?? 0), 0) / current.words.length,
      );
      utterances.push(current);
      current = {
        speaker,
        start: word.start,
        end: word.end,
        transcript: "",
        confidence: word.confidence ?? 0,
        words: [],
      };
    }

    current.words.push(word);
    current.end = word.end;
  }

  current.transcript = current.words.map((item) => getRawText(item)).join(" ");
  current.confidence = roundConfidence(
    current.words.reduce((sum, item) => sum + (item.confidence ?? 0), 0) / current.words.length,
  );
  utterances.push(current);

  return utterances;
}

export function splitUtterancesBySpeakerForDisplay(utterances: DeepgramUtterance[]): DeepgramUtterance[] {
  const split: DeepgramUtterance[] = [];

  for (const utterance of utterances) {
    if (utterance.words.length === 0) {
      split.push(utterance);
      continue;
    }

    let currentWords: DeepgramWord[] = [];
    let currentSpeaker = utterance.words[0]?.speaker ?? utterance.speaker ?? 0;

    for (const word of utterance.words) {
      const wordSpeaker = word.speaker ?? currentSpeaker;
      if (currentWords.length > 0 && wordSpeaker !== currentSpeaker) {
        split.push({
          speaker: currentSpeaker,
          start: currentWords[0]?.start ?? utterance.start,
          end: currentWords[currentWords.length - 1]?.end ?? utterance.end,
          transcript: currentWords.map((item) => getRawText(item)).join(" "),
          confidence: roundConfidence(
            currentWords.reduce((sum, item) => sum + (item.confidence ?? 0), 0) / currentWords.length,
          ),
          words: currentWords,
        });
        currentWords = [];
      }

      currentSpeaker = wordSpeaker;
      currentWords.push(word);
    }

    if (currentWords.length > 0) {
      split.push({
        speaker: currentSpeaker,
        start: currentWords[0]?.start ?? utterance.start,
        end: currentWords[currentWords.length - 1]?.end ?? utterance.end,
        transcript: currentWords.map((item) => getRawText(item)).join(" "),
        confidence: roundConfidence(
          currentWords.reduce((sum, item) => sum + (item.confidence ?? 0), 0) / currentWords.length,
        ),
        words: currentWords,
      });
    }
  }

  return split;
}

function speakerConfidenceKey(start: number, end: number): string {
  return `${start.toFixed(3)}:${end.toFixed(3)}`;
}

// Deepgram reports speaker_confidence on the top-level alternative words, but the
// per-utterance word objects it echoes back frequently omit it. Build a lookup so
// smoothing can recover the diarizer's confidence for each display word.
function buildSpeakerConfidenceLookup(words: DeepgramWord[]): Map<string, number> {
  const lookup = new Map<string, number>();
  for (const word of words) {
    if (typeof word.speaker_confidence === "number") {
      lookup.set(speakerConfidenceKey(word.start, word.end), word.speaker_confidence);
    }
  }
  return lookup;
}

// Reassign isolated, low-confidence speaker runs to a shared neighbouring speaker.
// Returns a speaker index per input unit; identical to the input unless a flip is
// corrected. Boundary runs (first/last) are never touched because they lack a
// neighbour on one side to corroborate the reassignment.
export function smoothSpeakerFlips(units: SpeakerFlipUnit[]): number[] {
  const speakers = units.map((unit) => unit.speaker);
  if (units.length < 3) {
    return speakers;
  }

  const runs: Array<{ start: number; end: number; speaker: number }> = [];
  for (let index = 0; index < speakers.length; index += 1) {
    const last = runs[runs.length - 1];
    if (last && last.speaker === speakers[index]) {
      last.end = index;
    } else {
      runs.push({ start: index, end: index, speaker: speakers[index] });
    }
  }

  for (let runIndex = 1; runIndex < runs.length - 1; runIndex += 1) {
    const run = runs[runIndex];
    const previous = runs[runIndex - 1];
    const next = runs[runIndex + 1];
    const runLength = run.end - run.start + 1;

    if (runLength > SPEAKER_SMOOTHING_MAX_RUN) {
      continue;
    }
    if (previous.speaker !== next.speaker || previous.speaker === run.speaker) {
      continue;
    }

    const confidences: number[] = [];
    for (let index = run.start; index <= run.end; index += 1) {
      const confidence = units[index].speakerConfidence;
      if (typeof confidence === "number") {
        confidences.push(confidence);
      }
    }
    // Require real confidence evidence that the diarizer was unsure. When Deepgram
    // supplies no speaker_confidence at all we leave the assignment untouched.
    if (confidences.length === 0) {
      continue;
    }
    const averageConfidence = confidences.reduce((sum, value) => sum + value, 0) / confidences.length;
    if (averageConfidence >= SPEAKER_SMOOTHING_CONFIDENCE_CEILING) {
      continue;
    }

    for (let index = run.start; index <= run.end; index += 1) {
      speakers[index] = previous.speaker;
    }
    run.speaker = previous.speaker;
  }

  return speakers;
}

function majoritySpeakerIndex(candidates: number[], fallback: number): number {
  if (candidates.length === 0) {
    return fallback;
  }
  const counts = new Map<number, number>();
  for (const speaker of candidates) {
    counts.set(speaker, (counts.get(speaker) ?? 0) + 1);
  }
  let bestSpeaker = candidates[0];
  let bestCount = -1;
  for (const [speaker, count] of counts) {
    if (count > bestCount) {
      bestCount = count;
      bestSpeaker = speaker;
    }
  }
  return bestSpeaker;
}

export function normalizeTranscriptResponse(response: DeepgramResponse): NormalizedTranscriptData {
  const alternative = response.results.channels[0]?.alternatives[0];
  const sourceWords = alternative?.words ?? [];
  const sourceUtterances = response.results.utterances?.length
    ? response.results.utterances
    : buildFallbackUtterances(sourceWords);

  const words: CanonicalWordRow[] = [];
  const utterances: CanonicalUtteranceRow[] = [];
  const speakerCounts = new Map<number, number>();
  let globalWordIndex = 0;

  // Correct isolated low-confidence speaker flips before deriving utterances so
  // that speaker attribution, utterance headers, and speaker word-counts all use
  // the smoothed assignment. The flat unit order mirrors the per-utterance,
  // per-word iteration below exactly, so a single running index keeps them aligned.
  const speakerConfidenceLookup = buildSpeakerConfidenceLookup(sourceWords);
  const flipUnits: SpeakerFlipUnit[] = [];
  for (const utterance of sourceUtterances) {
    const utteranceSpeaker = utterance.speaker ?? utterance.words[0]?.speaker ?? 0;
    for (const sourceWord of utterance.words) {
      const speaker = sourceWord.speaker ?? utteranceSpeaker;
      const speakerConfidence = typeof sourceWord.speaker_confidence === "number"
        ? sourceWord.speaker_confidence
        : speakerConfidenceLookup.get(speakerConfidenceKey(sourceWord.start, sourceWord.end)) ?? null;
      flipUnits.push({ speaker, speakerConfidence });
    }
  }
  const smoothedSpeakers = smoothSpeakerFlips(flipUnits);
  let flatUnitIndex = 0;

  sourceUtterances.forEach((utterance, utteranceIndex) => {
    const fallbackSpeakerIndex = utterance.speaker ?? utterance.words[0]?.speaker ?? 0;
    const utteranceId = utteranceIdForIndex(utteranceIndex);
    const utteranceWordStart = globalWordIndex;
    const utteranceUnitStart = flatUnitIndex;

    for (const sourceWord of utterance.words) {
      const wordSpeakerIndex = smoothedSpeakers[flatUnitIndex] ?? sourceWord.speaker ?? fallbackSpeakerIndex;
      flatUnitIndex += 1;
      const wordSpeakerId = speakerIdForIndex(wordSpeakerIndex);
      const rawText = getRawText(sourceWord);

      words.push({
        word_id: wordIdForIndex(globalWordIndex),
        utterance_id: utteranceId,
        word_index: globalWordIndex,
        raw_text: rawText,
        working_text: null,
        speaker_id: wordSpeakerId,
        speaker_index: wordSpeakerIndex,
        start_time: sourceWord.start,
        end_time: sourceWord.end,
        confidence: roundConfidence(sourceWord.confidence),
        is_filler: isFillerWord(sourceWord),
        reviewed: false,
        edited: false,
      });

      speakerCounts.set(wordSpeakerIndex, (speakerCounts.get(wordSpeakerIndex) ?? 0) + 1);
      globalWordIndex += 1;
    }

    const utteranceWords = words.slice(utteranceWordStart, globalWordIndex);
    const avgConfidence = utteranceWords.length > 0
      ? roundConfidence(
          utteranceWords.reduce((sum, word) => sum + word.confidence, 0) / utteranceWords.length,
        )
      : roundConfidence(utterance.confidence);

    const speakerIndex = majoritySpeakerIndex(
      smoothedSpeakers.slice(utteranceUnitStart, flatUnitIndex),
      fallbackSpeakerIndex,
    );
    const speakerId = speakerIdForIndex(speakerIndex);

    utterances.push({
      utterance_id: utteranceId,
      utterance_index: utteranceIndex,
      speaker_id: speakerId,
      speaker_index: speakerIndex,
      speaker_label: `Speaker ${speakerIndex}`,
      start_time: utterance.start,
      end_time: utterance.end,
      text: utteranceWords.map((word) => word.raw_text).join(" "),
      avg_confidence: avgConfidence,
    });
  });

  const speakers = Array.from(speakerCounts.entries())
    .sort((left, right) => left[0] - right[0])
    .map(([speakerIndex, wordCount]) => ({
      speaker_id: speakerIdForIndex(speakerIndex),
      speaker_index: speakerIndex,
      speaker_label: `Speaker ${speakerIndex}`,
      assigned_name: null,
      speaker_role: null,
      word_count: wordCount,
    }));

  const avgConfidence = words.length > 0
    ? roundConfidence(words.reduce((sum, word) => sum + word.confidence, 0) / words.length)
    : null;

  return {
    durationSeconds: response.metadata.duration,
    avgConfidence,
    speakers,
    utterances,
    words,
  };
}

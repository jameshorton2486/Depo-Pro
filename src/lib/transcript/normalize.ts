import type { DeepgramResponse, DeepgramUtterance, DeepgramWord } from "./types";

const FILLER_TOKENS = new Set(["um", "uh", "uh-huh", "huh-uh", "mm-hmm", "er", "ah"]);

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

function utteranceSegmentIdForIndex(index: number, segmentIndex: number): string {
  const baseId = utteranceIdForIndex(index);
  return segmentIndex === 0 ? baseId : `${baseId}_s${String(segmentIndex).padStart(3, "0")}`;
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

function splitUtteranceBySpeakerTransitions(
  utterance: DeepgramUtterance,
  utteranceIndex: number,
): Array<DeepgramUtterance & { canonical_utterance_id: string }> {
  if (utterance.words.length === 0) {
    return [{
      ...utterance,
      canonical_utterance_id: utteranceIdForIndex(utteranceIndex),
    }];
  }

  const segments: Array<DeepgramUtterance & { canonical_utterance_id: string }> = [];
  let currentWords: DeepgramWord[] = [];
  let currentSpeaker = utterance.words[0]?.speaker ?? utterance.speaker ?? 0;

  const pushSegment = () => {
    if (currentWords.length === 0) {
      return;
    }

    const start = currentWords[0]?.start ?? utterance.start;
    const end = currentWords[currentWords.length - 1]?.end ?? utterance.end;
    const confidence = roundConfidence(
      currentWords.reduce((sum, word) => sum + (word.confidence ?? 0), 0) / currentWords.length,
    );

    segments.push({
      speaker: currentSpeaker,
      start,
      end,
      transcript: currentWords.map((word) => getRawText(word)).join(" "),
      confidence,
      words: currentWords,
      canonical_utterance_id: utteranceSegmentIdForIndex(utteranceIndex, segments.length),
    });
  };

  for (const word of utterance.words) {
    const wordSpeaker = word.speaker ?? currentSpeaker;
    if (currentWords.length > 0 && wordSpeaker !== currentSpeaker) {
      pushSegment();
      currentWords = [];
      currentSpeaker = wordSpeaker;
    }

    currentWords.push(word);
  }

  pushSegment();

  return segments;
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
  let globalUtteranceIndex = 0;

  sourceUtterances.forEach((utterance, sourceUtteranceIndex) => {
    const canonicalUtterances = splitUtteranceBySpeakerTransitions(utterance, sourceUtteranceIndex);

    canonicalUtterances.forEach((canonicalUtterance) => {
      const speakerIndex = canonicalUtterance.speaker ?? canonicalUtterance.words[0]?.speaker ?? 0;
      const speakerId = speakerIdForIndex(speakerIndex);
      const utteranceWordStart = globalWordIndex;

      for (const sourceWord of canonicalUtterance.words) {
        const wordSpeakerIndex = sourceWord.speaker ?? speakerIndex;
        const wordSpeakerId = speakerIdForIndex(wordSpeakerIndex);
        const rawText = getRawText(sourceWord);

        words.push({
          word_id: wordIdForIndex(globalWordIndex),
          utterance_id: canonicalUtterance.canonical_utterance_id,
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
        : roundConfidence(canonicalUtterance.confidence);

      utterances.push({
        utterance_id: canonicalUtterance.canonical_utterance_id,
        utterance_index: globalUtteranceIndex,
        speaker_id: speakerId,
        speaker_index: speakerIndex,
        speaker_label: `Speaker ${speakerIndex}`,
        start_time: canonicalUtterance.start,
        end_time: canonicalUtterance.end,
        text: canonicalUtterance.transcript?.trim() || utteranceWords.map((word) => word.raw_text).join(" "),
        avg_confidence: avgConfidence,
      });

      globalUtteranceIndex += 1;
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

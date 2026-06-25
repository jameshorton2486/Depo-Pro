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

function splitUtterancesBySpeaker(utterances: DeepgramUtterance[]): DeepgramUtterance[] {
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

export function normalizeTranscriptResponse(response: DeepgramResponse): NormalizedTranscriptData {
  const alternative = response.results.channels[0]?.alternatives[0];
  const sourceWords = alternative?.words ?? [];
  const sourceUtterances = response.results.utterances?.length
    ? response.results.utterances
    : buildFallbackUtterances(sourceWords);
  const canonicalSourceUtterances = splitUtterancesBySpeaker(sourceUtterances);

  const words: CanonicalWordRow[] = [];
  const utterances: CanonicalUtteranceRow[] = [];
  const speakerCounts = new Map<number, number>();
  let globalWordIndex = 0;

  canonicalSourceUtterances.forEach((utterance, utteranceIndex) => {
    const speakerIndex = utterance.speaker ?? utterance.words[0]?.speaker ?? 0;
    const speakerId = speakerIdForIndex(speakerIndex);
    const utteranceId = utteranceIdForIndex(utteranceIndex);
    const utteranceWordStart = globalWordIndex;

    for (const sourceWord of utterance.words) {
      const wordSpeakerIndex = sourceWord.speaker ?? speakerIndex;
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

    utterances.push({
      utterance_id: utteranceId,
      utterance_index: utteranceIndex,
      speaker_id: speakerId,
      speaker_index: speakerIndex,
      speaker_label: `Speaker ${speakerIndex}`,
      start_time: utterance.start,
      end_time: utterance.end,
      text: utterance.transcript?.trim() || utteranceWords.map((word) => word.raw_text).join(" "),
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

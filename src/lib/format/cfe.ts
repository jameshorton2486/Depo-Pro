import type { EditorDocument } from "../../api/types";
import { buildPages, getBlockRole } from "../../editor/pagination";
import type {
  AbbreviationRegistry,
  FormattedDocument,
  FormattedLine,
  GeometryProfile,
} from "./types";

type DisplaySegment = {
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

const MIN_SEGMENT_WORDS = 2;

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

export function classifyUtteranceParagraphs(
  utterance: EditorDocument["utterances"][number],
  wordById: Map<string, EditorDocument["words"][number]>
): DisplaySegment[] {
  const runs: RawSegment[] = [];

  for (const wordId of utterance.word_ids) {
    const word = wordById.get(wordId);
    if (!word) {
      continue;
    }

    const previous = runs[runs.length - 1];
    if (!previous || previous.speaker_id !== word.speaker_id) {
      runs.push({ speaker_id: word.speaker_id, word_ids: [wordId] });
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

function toLineRole(role: EditorDocument["speakers"][number]["role"] | null | undefined): FormattedLine["role"] {
  const blockRole = getBlockRole(role);
  if (blockRole === "Q") {
    return "q";
  }
  if (blockRole === "A") {
    return "a";
  }
  return "speaker_label";
}

export function cfe(
  doc: EditorDocument,
  geometry: GeometryProfile,
  _registry: AbbreviationRegistry
): FormattedDocument {
  const wordById = new Map(doc.words.map((word) => [word.word_id, word]));
  const speakerById = new Map(doc.speakers.map((speaker) => [speaker.speaker_id, speaker]));
  const speakerRoles = new Map(doc.speakers.map((speaker) => [speaker.speaker_id, speaker.role]));
  const segments = doc.utterances.flatMap((utterance) => classifyUtteranceParagraphs(utterance, wordById));
  const pageInfoMap = buildPages(
    segments.map((segment) => ({
      utterance_id: `${segment.utterance_id}#${segment.segment_index}`,
      speaker_id: segment.speaker_id,
      wordCount: segment.word_ids.length,
    })),
    speakerRoles,
    geometry
  );

  const lines: FormattedLine[] = [];
  let paragraphIndex = 0;

  doc.utterances.forEach((utterance) => {
    const utteranceSegments = classifyUtteranceParagraphs(utterance, wordById);
    utteranceSegments.forEach((segment) => {
      paragraphIndex += 1;

      const sourceWords = segment.word_ids
        .map((wordId) => wordById.get(wordId))
        .filter((word): word is EditorDocument["words"][number] => Boolean(word));
      const firstWord = sourceWords[0];
      const lastWord = sourceWords[sourceWords.length - 1];
      const speaker = speakerById.get(segment.speaker_id);
      const pageInfo = pageInfoMap.get(`${segment.utterance_id}#${segment.segment_index}`);
      const role = toLineRole(speaker?.role ?? null);

      lines.push({
        role,
        indent_intent: role === "q" || role === "a" ? "qa" : "speaker",
        paragraph_index: paragraphIndex - 1,
        utterance_id: segment.utterance_id,
        speaker_id: segment.speaker_id,
        speaker_label: speaker?.display_name ?? segment.speaker_id,
        prefix_text: "",
        source_word_ids: segment.word_ids,
        words: sourceWords.map((word, index) => ({
          word_id: word.word_id,
          utterance_id: word.utterance_id,
          speaker_id: word.speaker_id,
          text: word.text,
          raw_text: word.raw_text,
          start_time: word.start_time,
          end_time: word.end_time,
          confidence: word.confidence,
          reviewed: word.reviewed,
          edited: word.edited,
          trailing_space: index < sourceWords.length - 1 ? " " : "",
        })),
        page_number: pageInfo?.pageNumber ?? 1,
        page_line_number: pageInfo?.lineInPage ?? paragraphIndex,
        line_number: paragraphIndex,
        start_time: firstWord?.start_time ?? utterance.start_time,
        end_time: lastWord?.end_time ?? utterance.end_time,
        segment_index: segment.segment_index,
        segment_count: segment.segment_count,
        language: null,
        flags: [],
      });
    });
  });

  return {
    job_id: doc.job_id,
    lines,
  };
}

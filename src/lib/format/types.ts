import type { EditorDocument, SpeakerId, UtteranceId, WordId } from "../../api/types";

export type FormattedLineRole =
  | "q"
  | "a"
  | "by_line"
  | "speaker_label"
  | "parenthetical"
  | "section_header"
  | "continuation";

export type IndentIntent =
  | "qa"
  | "speaker"
  | "by_line"
  | "section_header"
  | "continuation";

export interface GeometryProfile {
  linesPerPage: number;
  charsPerLine: number;
  averageCharsPerWord: number;
}

export interface AbbreviationPattern {
  name: string;
  regex: string;
  desc: string;
}

export interface AbbreviationRegistry {
  registry: string;
  version: string;
  authority: string;
  purpose: string;
  rule: {
    two_space_boundaries: string[];
    two_space_boundaries_note: string;
    one_space_tokens_note: string;
    precedence: string;
  };
  one_space_tokens: Record<string, string[]>;
  one_space_patterns: AbbreviationPattern[];
  context_sensitive: Record<string, string>;
  notes: string[];
}

export interface FormattedWord {
  word_id: WordId;
  utterance_id: UtteranceId;
  speaker_id: SpeakerId;
  text: string;
  raw_text: string;
  start_time: number;
  end_time: number;
  confidence: number;
  reviewed: boolean;
  edited: boolean;
  trailing_space: string;
}

export interface FormattedLine {
  role: FormattedLineRole;
  indent_intent: IndentIntent;
  paragraph_index: number;
  utterance_id: UtteranceId;
  speaker_id: SpeakerId;
  speaker_label: string;
  prefix_text: string;
  source_word_ids: WordId[];
  words: FormattedWord[];
  page_number: number;
  page_line_number: number;
  line_number: number;
  start_time: number;
  end_time: number;
  segment_index: number;
  segment_count: number;
  language: string | null;
  flags: string[];
}

export interface FormattedDocument {
  job_id: EditorDocument["job_id"];
  lines: FormattedLine[];
}

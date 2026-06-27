import type { JSONContent } from "@tiptap/core";
import type { EditorDocument } from "../api/types";
import type { CaseRecord } from "../types/case";
import { buildPages } from "../editor/pagination";
import { abbreviationRegistry } from "./format/abbreviationRegistry";
import { cfe } from "./format/cfe";
import { DEFAULT_GEOMETRY_PROFILE } from "./format/geometryProfile";
import { ENABLE_DISPLAY_TURN_SEGMENTATION } from "./format/grouping";
import { buildDisplayDocument } from "./transcript/workspacePresentation";

function buildLegacyEditorContent(
  doc: EditorDocument,
  languageMap?: Map<string, string>
): JSONContent {
  const wordById = new Map(doc.words.map((w) => [w.word_id, w]));
  const speakerById = new Map(doc.speakers.map((s) => [s.speaker_id, s]));

  const speakerRoles = new Map(doc.speakers.map((s) => [s.speaker_id, s.role]));
  const wordCountByUtt = new Map<string, number>(
    doc.utterances.map((u) => [u.utterance_id, u.word_ids.length])
  );

  const pageInfoMap = buildPages(
    doc.utterances.map((u) => ({
      utterance_id: u.utterance_id,
      speaker_id: u.speaker_id,
      wordCount: wordCountByUtt.get(u.utterance_id) ?? 0,
    })),
    speakerRoles
  );

  const blocks: JSONContent[] = [];
  let currentPage = 0;

  doc.utterances.forEach((utt, idx) => {
    const speaker = speakerById.get(utt.speaker_id);
    const info = pageInfoMap.get(utt.utterance_id);
    const uttPage = info?.pageNumber ?? 1;

    if (uttPage > currentPage) {
      if (currentPage > 0) {
        blocks.push({
          type: "pageBreak",
          attrs: { pageNumber: uttPage },
        });
      }
      currentPage = uttPage;
    }

    const inlineNodes: JSONContent[] = [];
    utt.word_ids.forEach((wid, i) => {
      const word = wordById.get(wid);
      if (!word) return;
      if (!word.text || word.text.length === 0) return;

      inlineNodes.push({
        type: "text",
        text: word.text,
        marks: [
          {
            type: "wordMark",
            attrs: {
              word_id: word.word_id,
              utterance_id: word.utterance_id,
              speaker_id: word.speaker_id,
              start_time: word.start_time,
              end_time: word.end_time,
              confidence: word.confidence,
              reviewed: word.reviewed,
            },
          },
        ],
      });

      if (i < utt.word_ids.length - 1) {
        inlineNodes.push({ type: "text", text: " " });
      }
    });

    if (inlineNodes.length === 0) {
      inlineNodes.push({ type: "text", text: " " });
    }

    blocks.push({
      type: "utterance",
      attrs: {
        utterance_id: utt.utterance_id,
        speaker_id: utt.speaker_id,
        speaker_label: speaker?.display_name ?? utt.speaker_id,
        line_number: idx + 1,
        page_line_number: info?.lineInPage ?? idx + 1,
        start_time: utt.start_time,
        role: speaker?.role ?? null,
        language: languageMap?.get(utt.utterance_id) ?? null,
      },
      content: inlineNodes,
    });
  });

  return { type: "doc", content: blocks };
}

function buildInlineNodes(
  words: Array<{
    word_id: string;
    utterance_id: string;
    speaker_id: string;
    start_time: number;
    end_time: number;
    confidence: number;
    reviewed: boolean;
    text: string;
    inline_flag: string | null;
    trailing_space: string;
  }>
): JSONContent[] {
  const inlineNodes: JSONContent[] = [];

  words.forEach((word) => {
    if (!word.text || word.text.length === 0) return;

    inlineNodes.push({
      type: "text",
      text: word.text,
      marks: [
        {
          type: "wordMark",
          attrs: {
            word_id: word.word_id,
            utterance_id: word.utterance_id,
            speaker_id: word.speaker_id,
            start_time: word.start_time,
            end_time: word.end_time,
            confidence: word.confidence,
            reviewed: word.reviewed,
          },
        },
      ],
    });

    if (word.inline_flag) {
      inlineNodes.push({ type: "text", text: ` ${word.inline_flag}` });
    }

    if (word.trailing_space.length > 0) {
      inlineNodes.push({ type: "text", text: word.trailing_space });
    }
  });

  if (inlineNodes.length === 0) {
    inlineNodes.push({ type: "text", text: " " });
  }

  return inlineNodes;
}

export function buildEditorContent(
  doc: EditorDocument,
  options?: {
    languageMap?: Map<string, string>;
    structureConfirmed?: boolean;
    keepRawLabels?: boolean;
    record?: CaseRecord | null;
  }
): JSONContent {
  const languageMap = options?.languageMap;
  const shouldInferStructure = options?.structureConfirmed && !options?.keepRawLabels;
  const displayDoc = shouldInferStructure ? buildDisplayDocument(doc, options.record) : doc;

  if (!ENABLE_DISPLAY_TURN_SEGMENTATION) {
    return buildLegacyEditorContent(displayDoc, languageMap);
  }

  const formatted = cfe(displayDoc, DEFAULT_GEOMETRY_PROFILE, abbreviationRegistry);

  const blocks: JSONContent[] = [];
  let currentPage = 0;

  formatted.lines.forEach((line) => {
    const blockPage = line.page_number;

    if (blockPage > currentPage) {
      if (currentPage > 0) {
        blocks.push({
          type: "pageBreak",
          attrs: { pageNumber: blockPage },
        });
      }
      currentPage = blockPage;
    }

    const speaker = displayDoc.speakers.find((candidate) => candidate.speaker_id === line.speaker_id);
    const role = speaker?.role === "INTERPRETER" ? "INTERPRETER" : null;

    blocks.push({
      type: "utterance",
      attrs: {
        utterance_id: line.utterance_id,
        speaker_id: line.speaker_id,
        speaker_label: speaker?.display_name ?? line.speaker_label,
        prefix_text: speaker?.display_name ?? line.speaker_label,
        line_number: line.line_number,
        page_line_number: line.page_line_number,
        start_time: line.start_time,
        role,
        language: languageMap?.get(line.utterance_id) ?? null,
        segment_index: line.segment_index,
        segment_count: line.segment_count,
        indent_intent: line.indent_intent,
        continuation_mode: line.continuation_mode,
        format_box_width_inches: line.geometry.formatBoxWidthInches,
        left_margin_inches: line.geometry.leftMarginInches,
        right_margin_inches: line.geometry.rightMarginInches,
        line_spacing_points: line.geometry.lineSpacingPoints,
        tab_qa_label_inches: line.geometry.tabs.qaLabelInches,
        tab_qa_text_inches: line.geometry.tabs.qaTextInches,
        tab_speaker_inches: line.geometry.tabs.speakerInches,
        tab_parenthetical_inches: line.geometry.tabs.parentheticalInches,
        tab_center_inches: line.geometry.tabs.centerInches,
        tab_continuation_inches: line.geometry.tabs.continuationInches,
      },
      content: buildInlineNodes(line.words),
    });
  });

  return { type: "doc", content: blocks };
}

import type { JSONContent } from "@tiptap/core";
import type { EditorDocument } from "../api/types";
import { buildPages } from "../editor/pagination";
import { ENABLE_DISPLAY_TURN_SEGMENTATION, segmentUtterance } from "./format/grouping";

function buildLegacyEditorContent(
  doc: EditorDocument,
  languageMap?: Map<string, string>
): JSONContent {
  const wordById = new Map(doc.words.map((w) => [w.word_id, w]));
  const speakerById = new Map(doc.speakers.map((s) => [s.speaker_id, s]));

  // Build speaker role map for pagination
  const speakerRoles = new Map(doc.speakers.map((s) => [s.speaker_id, s.role]));

  // Word count per utterance (used for line estimation)
  const wordCountByUtt = new Map<string, number>(
    doc.utterances.map((u) => [u.utterance_id, u.word_ids.length])
  );

  // Compute UFM page layout
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

    // Insert page break node at each page transition (not before page 1)
    if (uttPage > currentPage) {
      if (currentPage > 0) {
        blocks.push({
          type: "pageBreak",
          attrs: { pageNumber: uttPage },
        });
      }
      currentPage = uttPage;
    }

    // Build inline word nodes with wordMark marks
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

      // Space between words — intentionally unmarked (not click-seekable)
      if (i < utt.word_ids.length - 1) {
        inlineNodes.push({ type: "text", text: " " });
      }
    });

    // ProseMirror requires at least one non-empty inline node per block.
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
  wordIds: string[],
  wordById: Map<string, EditorDocument["words"][number]>
): JSONContent[] {
  const inlineNodes: JSONContent[] = [];

  wordIds.forEach((wid, index) => {
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

    if (index < wordIds.length - 1) {
      inlineNodes.push({ type: "text", text: " " });
    }
  });

  if (inlineNodes.length === 0) {
    inlineNodes.push({ type: "text", text: " " });
  }

  return inlineNodes;
}

// Converts the flat EditorDocument into TipTap JSON content.
// Each utterance → one 'utterance' block node with UFM page/line attrs.
// Each word → text node with a 'wordMark' mark carrying ASR metadata.
// PageBreak nodes are inserted between pages.
// languageMap: optional utterance_id → ISO 639-1 language tag for the
// interpreter layer (UI-only attr on utterance node, not part of contract).
export function buildEditorContent(
  doc: EditorDocument,
  languageMap?: Map<string, string>
): JSONContent {
  if (!ENABLE_DISPLAY_TURN_SEGMENTATION) {
    return buildLegacyEditorContent(doc, languageMap);
  }

  const wordById = new Map(doc.words.map((w) => [w.word_id, w]));
  const speakerById = new Map(doc.speakers.map((s) => [s.speaker_id, s]));
  const speakerRoles = new Map(doc.speakers.map((s) => [s.speaker_id, s.role]));
  const segmentedUtterances = doc.utterances.flatMap((utt) => segmentUtterance(utt, wordById));
  const pageInfoMap = buildPages(
    segmentedUtterances.map((segment) => ({
      utterance_id: `${segment.utterance_id}#${segment.segment_index}`,
      speaker_id: segment.speaker_id,
      wordCount: segment.word_ids.length,
    })),
    speakerRoles
  );

  const blocks: JSONContent[] = [];
  let currentPage = 0;
  let lineNumber = 0;

  doc.utterances.forEach((utt) => {
    const segments = segmentUtterance(utt, wordById);
    segments.forEach((segment) => {
      lineNumber += 1;
      const compositeKey = `${segment.utterance_id}#${segment.segment_index}`;
      const speaker = speakerById.get(segment.speaker_id);
      const info = pageInfoMap.get(compositeKey);
      const blockPage = info?.pageNumber ?? 1;

      if (blockPage > currentPage) {
        if (currentPage > 0) {
          blocks.push({
            type: "pageBreak",
            attrs: { pageNumber: blockPage },
          });
        }
        currentPage = blockPage;
      }

      blocks.push({
        type: "utterance",
        attrs: {
          utterance_id: segment.utterance_id,
          speaker_id: segment.speaker_id,
          speaker_label: speaker?.display_name ?? segment.speaker_id,
          line_number: lineNumber,
          page_line_number: info?.lineInPage ?? lineNumber,
          start_time: utt.start_time,
          role: speaker?.role ?? null,
          language: languageMap?.get(utt.utterance_id) ?? null,
          segment_index: segment.segment_index,
          segment_count: segment.segment_count,
        },
        content: buildInlineNodes(segment.word_ids, wordById),
      });
    });
  });

  return { type: "doc", content: blocks };
}

import type { EditorDocument } from "../../api/types";

export interface ExportSegmentDocument {
  transcriptId: string;
  sequenceIndex: number;
  sourceFilename: string | null;
  document: EditorDocument;
}

function sourceLabel(segment: ExportSegmentDocument, position: number): string {
  return segment.sourceFilename?.trim() || `Source ${position + 1}`;
}

export function formatEditorDocumentText(document: EditorDocument): string {
  const wordsById = Object.fromEntries(document.words.map((word) => [word.word_id, word]));
  return document.utterances
    .map((utterance) => {
      const words = utterance.word_ids
        .map((wordId) => wordsById[wordId]?.text ?? "")
        .join(" ");
      return `${utterance.utterance_id} [${utterance.speaker_id}]: ${words}`;
    })
    .join("\n");
}

export function buildExportTranscriptText(segments: ExportSegmentDocument[]): string {
  const ordered = segments
    .slice()
    .sort((left, right) => left.sequenceIndex - right.sequenceIndex);

  if (ordered.length === 0) {
    return "";
  }

  if (ordered.length === 1) {
    return formatEditorDocumentText(ordered[0].document);
  }

  return ordered
    .map((segment, index) => [
      `=== Segment ${index + 1}: ${sourceLabel(segment, index)} ===`,
      formatEditorDocumentText(segment.document),
    ].join("\n"))
    .join("\n\n");
}

export function countExportWords(segments: ExportSegmentDocument[]): number {
  return segments.reduce((total, segment) => total + segment.document.words.length, 0);
}

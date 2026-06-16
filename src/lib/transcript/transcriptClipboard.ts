import type { EditorDocument } from "../../api/types";
import type { CaseRecord } from "../../types/case";
import { colloquyInlineText, COLON_GAP } from "../../editor/stageS/colloquy";
import type { ResolvedSpeakerView } from "./resolvedSpeakers";
import { buildTranscriptParagraphs } from "./workspaceParagraphs";

export function buildTranscriptClipboardText(
  document: EditorDocument,
  resolvedSpeakers: ResolvedSpeakerView[],
  record?: CaseRecord | null,
): string {
  return buildTranscriptParagraphs(document, resolvedSpeakers, record)
    .map((paragraph) => {
      switch (paragraph.kind) {
        case "COLLOQUY":
          return colloquyInlineText(paragraph.label, paragraph.text);
        case "Q":
        case "A":
          return `${paragraph.label}${COLON_GAP}${paragraph.text}`;
        case "BY_LINE":
        case "EXAMINATION":
        case "PARENTHETICAL":
        default:
          return paragraph.text;
      }
    })
    .join("\n\n");
}

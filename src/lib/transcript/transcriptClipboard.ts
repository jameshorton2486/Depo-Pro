import type { EditorDocument } from "../../api/types";
import type { CaseRecord } from "../../types/case";
import { colloquyInlineText } from "../../editor/stageS/colloquy";
import type { ResolvedSpeakerView } from "./resolvedSpeakers";
import { buildTranscriptParagraphs } from "./workspaceParagraphs";

const TAB = "\t";
const COLLOQUY_TABS = `${TAB}${TAB}${TAB}`;

export function buildTranscriptClipboardText(
  document: EditorDocument,
  resolvedSpeakers: ResolvedSpeakerView[],
  record?: CaseRecord | null,
): string {
  return buildTranscriptParagraphs(document, resolvedSpeakers, record)
    .map((paragraph) => {
      switch (paragraph.kind) {
        case "COLLOQUY":
          return `${COLLOQUY_TABS}${colloquyInlineText(paragraph.label, paragraph.text)}`;
        case "Q":
        case "A":
          return `${TAB}${paragraph.label}${TAB}${paragraph.text}`;
        case "EXAMINATION":
        case "PARENTHETICAL":
          return `${COLLOQUY_TABS}${paragraph.text}`;
        case "BY_LINE":
          return paragraph.text;
        default:
          return paragraph.text;
      }
    })
    .join("\n\n");
}

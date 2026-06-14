import type { RenderLine } from "../../editor/stageS/models";
import {
  LINE_A,
  LINE_BY,
  LINE_COLLOQUY,
  LINE_EXAMINATION,
  LINE_FLAGGED,
  LINE_PARENTHETICAL,
  LINE_Q,
} from "../../editor/stageS/models";
import {
  buildAttributionParagraphSpec,
  buildColloquyParagraphSpec,
  buildParentheticalParagraphSpec,
  buildQaParagraphSpec,
  type TranscriptDocxParagraphSpec,
} from "./docxFormatter";

export function buildParagraphSpecsFromStageSLines(lines: RenderLine[]): TranscriptDocxParagraphSpec[] {
  return lines.flatMap((line) => {
    switch (line.lineType) {
      case LINE_Q:
        return [buildQaParagraphSpec("Q.", line.text)];
      case LINE_A:
        return [buildQaParagraphSpec("A.", line.text)];
      case LINE_BY:
        return [buildAttributionParagraphSpec(line.text)];
      case LINE_PARENTHETICAL:
        return [buildParentheticalParagraphSpec(line.text)];
      case LINE_COLLOQUY:
      case LINE_FLAGGED:
        return [buildColloquyParagraphSpec(stageSColloquyLabel(line), stageSColloquyText(line))];
      case LINE_EXAMINATION:
        return [buildAttributionParagraphSpec(line.text)];
      default:
        return [];
    }
  });
}

function stageSColloquyLabel(line: RenderLine): string {
  const rawLabel = line.speakerLabel.trim().replace(/:+$/, "");
  return rawLabel || "UNMAPPED";
}

function stageSColloquyText(line: RenderLine): string {
  if (line.lineType === LINE_FLAGGED) {
    return line.text;
  }

  const withoutLabel = line.text.replace(/^[^:]+:\s{2}/, "").trim();
  return withoutLabel || line.text;
}

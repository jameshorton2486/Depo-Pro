import type { EditorDocument } from "../../api/types";
import { classifyUtteranceParagraphs } from "./cfe";

export const ENABLE_DISPLAY_TURN_SEGMENTATION = true;

export type DisplaySegment = {
  utterance_id: string;
  segment_index: number;
  segment_count: number;
  speaker_id: string;
  word_ids: string[];
};

export function segmentUtterance(
  utterance: EditorDocument["utterances"][number],
  wordById: Map<string, EditorDocument["words"][number]>
): DisplaySegment[] {
  return classifyUtteranceParagraphs(utterance, wordById);
}

import type { EditorDocument } from "../../api/types";

export type PersistedLineType = "Q" | "A" | "SP" | "PN" | "HEADER";

export type StructuredUtterance = EditorDocument["utterances"][number] & {
  line_type?: string | null;
  speaker_label?: string | null;
  speaker_role?: string | null;
};

const LINE_TYPES = new Set<PersistedLineType>(["Q", "A", "SP", "PN", "HEADER"]);

export function normalizePersistedLineType(value: string | null | undefined): PersistedLineType | null {
  return value && LINE_TYPES.has(value as PersistedLineType) ? (value as PersistedLineType) : null;
}

export function asStructuredUtterance(
  utterance: EditorDocument["utterances"][number],
): StructuredUtterance {
  return utterance as StructuredUtterance;
}

export function hasStructuredLineTypes(document: EditorDocument | null | undefined): boolean {
  if (!document) {
    return false;
  }

  return document.utterances.some((utterance) => normalizePersistedLineType(asStructuredUtterance(utterance).line_type) != null);
}

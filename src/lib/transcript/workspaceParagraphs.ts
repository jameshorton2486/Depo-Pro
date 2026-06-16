import type { EditorDocument, Speaker } from "../../api/types";
import type { CaseRecord } from "../../types/case";
import type { ResolvedSpeakerView } from "./resolvedSpeakers";
import { buildTranscriptSpeakerIdentityMap } from "./speakerIdentity";

export type WorkspaceParagraphMode = "COLLOQUY" | "Q" | "A" | "PARENTHETICAL";
export type TranscriptParagraphKind =
  | WorkspaceParagraphMode
  | "BY_LINE"
  | "EXAMINATION";

export interface WorkspaceParagraphDescriptor {
  mode: WorkspaceParagraphMode;
  label: string;
  examinationHeader: boolean;
  byLine: string | null;
}

export interface TranscriptParagraph {
  kind: TranscriptParagraphKind;
  label: string;
  text: string;
  sourceUtteranceIds: string[];
  utteranceId: string | null;
}

interface SpeakerView {
  role: Speaker["role"] | undefined;
  label: string;
}

interface RenderState {
  inExamination: boolean;
  currentExaminerLabel: string | null;
  hasQuestion: boolean;
}

const QUESTION_PATTERNS = [
  /\?\s*$/,
  /^(please|would you|will you|can you|could you|did you|do you|were you|have you|has anyone|what|when|where|who|why|how)\b/i,
  /^(state|tell|describe|identify|explain|mark|read)\b/i,
] as const;

export function buildWorkspaceParagraphs(
  document: EditorDocument,
  resolvedSpeakers: ResolvedSpeakerView[],
  record?: CaseRecord | null,
): Map<string, WorkspaceParagraphDescriptor> {
  return buildParagraphDescriptorMap(document, resolvedSpeakers, record);
}

export function buildTranscriptParagraphs(
  document: EditorDocument,
  resolvedSpeakers: ResolvedSpeakerView[],
  record?: CaseRecord | null,
): TranscriptParagraph[] {
  const descriptorByUtteranceId = buildParagraphDescriptorMap(document, resolvedSpeakers, record);
  const wordById = new Map(document.words.map((word) => [word.word_id, word]));
  const paragraphs: TranscriptParagraph[] = [];

  for (const utterance of document.utterances) {
    const descriptor = descriptorByUtteranceId.get(utterance.utterance_id);
    if (!descriptor) {
      continue;
    }

    const text = utterance.word_ids
      .map((wordId) => wordById.get(wordId)?.text ?? "")
      .join(" ")
      .trim();

    if (descriptor.examinationHeader) {
      paragraphs.push({
        kind: "EXAMINATION",
        label: "",
        text: "EXAMINATION",
        sourceUtteranceIds: [utterance.utterance_id],
        utteranceId: null,
      });
    }

    if (descriptor.byLine) {
      paragraphs.push({
        kind: "BY_LINE",
        label: "",
        text: descriptor.byLine,
        sourceUtteranceIds: [utterance.utterance_id],
        utteranceId: null,
      });
    }

    paragraphs.push({
      kind: descriptor.mode,
      label: paragraphLabel(descriptor),
      text,
      sourceUtteranceIds: [utterance.utterance_id],
      utteranceId: utterance.utterance_id,
    });
  }

  return paragraphs;
}

function paragraphLabel(descriptor: WorkspaceParagraphDescriptor): string {
  if (descriptor.mode === "Q") {
    return "Q.";
  }
  if (descriptor.mode === "A") {
    return "A.";
  }
  return descriptor.label;
}

function buildParagraphDescriptorMap(
  document: EditorDocument,
  resolvedSpeakers: ResolvedSpeakerView[],
  record?: CaseRecord | null,
): Map<string, WorkspaceParagraphDescriptor> {
  const descriptorByUtteranceId = new Map<string, WorkspaceParagraphDescriptor>();
  const speakerViews = buildSpeakerViewMap(document, resolvedSpeakers, record);
  const wordById = new Map(document.words.map((word) => [word.word_id, word]));
  let state: RenderState = {
    inExamination: false,
    currentExaminerLabel: null,
    hasQuestion: false,
  };

  for (const utterance of document.utterances) {
    const text = utterance.word_ids
      .map((wordId) => wordById.get(wordId)?.text ?? "")
      .join(" ")
      .trim();
    const speaker = speakerViews.get(utterance.speaker_id) ?? fallbackSpeakerView(utterance.speaker_id);
    const descriptor = classifyParagraph(text, speaker, state);
    descriptorByUtteranceId.set(utterance.utterance_id, descriptor);
    state = advanceRenderState(descriptor, state);
  }

  return descriptorByUtteranceId;
}

function buildSpeakerViewMap(
  document: EditorDocument,
  resolvedSpeakers: ResolvedSpeakerView[],
  record?: CaseRecord | null,
): Map<string, SpeakerView> {
  const identities = buildTranscriptSpeakerIdentityMap(document, resolvedSpeakers, record);

  return new Map(document.speakers.map((speaker) => {
    const identity = identities.get(speaker.speaker_id);
    const role = identity?.role ?? speaker.role;
    const displayName = speaker.display_name;
    return [
      speaker.speaker_id,
      {
        role,
        label: identity?.transcriptLabel ?? speakerLabelForRole(role, displayName),
      },
    ] satisfies [string, SpeakerView];
  }));
}

function fallbackSpeakerView(speakerId: string): SpeakerView {
  return {
    role: undefined,
    label: normalizeSpeakerLabel(speakerId),
  };
}

function classifyParagraph(
  text: string,
  speaker: SpeakerView,
  state: RenderState,
): WorkspaceParagraphDescriptor {
  if (looksLikeParenthetical(text)) {
    return {
      mode: "PARENTHETICAL",
      label: "",
      examinationHeader: false,
      byLine: null,
    };
  }

  if (speaker.role === "ATTORNEY") {
    return classifyAttorneyParagraph(text, speaker.label, state);
  }

  if (speaker.role === "WITNESS") {
    if (state.inExamination && state.hasQuestion) {
      return {
        mode: "A",
        label: speaker.label,
        examinationHeader: false,
        byLine: null,
      };
    }

    return colloquyDescriptor(speaker.label);
  }

  return colloquyDescriptor(speaker.label);
}

function classifyAttorneyParagraph(
  text: string,
  label: string,
  state: RenderState,
): WorkspaceParagraphDescriptor {
  if (!state.inExamination) {
    if (!looksLikeQuestion(text)) {
      return colloquyDescriptor(label);
    }

    return {
      mode: "Q",
      label,
      examinationHeader: true,
      byLine: buildByLine(label),
    };
  }

  const byLine = state.currentExaminerLabel !== label ? buildByLine(label) : null;
  return {
    mode: "Q",
    label,
    examinationHeader: false,
    byLine,
  };
}

function advanceRenderState(
  descriptor: WorkspaceParagraphDescriptor,
  state: RenderState,
): RenderState {
  if (descriptor.mode === "Q") {
    return {
      inExamination: true,
      currentExaminerLabel: descriptor.label,
      hasQuestion: true,
    };
  }

  if (descriptor.mode === "A") {
    return {
      ...state,
      inExamination: true,
      hasQuestion: true,
    };
  }

  return state;
}

function looksLikeQuestion(text: string): boolean {
  const normalized = text.trim();
  return QUESTION_PATTERNS.some((pattern) => pattern.test(normalized));
}

function looksLikeParenthetical(text: string): boolean {
  const normalized = text.trim();
  if (!normalized) {
    return false;
  }

  if (normalized.startsWith("(") && normalized.endsWith(")")) {
    return true;
  }

  return /^recess\b/i.test(normalized);
}

function colloquyDescriptor(label: string): WorkspaceParagraphDescriptor {
  return {
    mode: "COLLOQUY",
    label,
    examinationHeader: false,
    byLine: null,
  };
}

function buildByLine(label: string): string {
  return `BY ${normalizeSpeakerLabel(label).replace(/:+$/, "")}:`;
}

function speakerLabelForRole(
  role: Speaker["role"] | undefined,
  displayName: string,
): string {
  if (role === "REPORTER") return "THE REPORTER";
  if (role === "INTERPRETER") return "THE INTERPRETER";
  if (role === "WITNESS") return "THE WITNESS";
  return normalizeSpeakerLabel(displayName);
}

function normalizeSpeakerLabel(label: string): string {
  const normalized = label.trim().replace(/:+$/, "").replace(/\s+/g, " ").toUpperCase();
  return normalized || "UNIDENTIFIED SPEAKER";
}

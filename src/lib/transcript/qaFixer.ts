import type { TranscriptParagraph } from "./workspacePresentation";

const SHORT_ANSWER_PATTERN = /^(Yes\.|No\.|Correct\.|I did\.|I do\.|I have\.|I don't\.)\s*/i;
const OBJECTION_PATTERN = /\bObjection\.\s*(?:Form\.|Foundation\.)?/i;
const K_PATTERN = /(^|\s)K\.(\s|$)/g;
const DEFAULT_OBJECTION_LABEL = "MR. RAMON";

function normalizeParagraphArtifacts(text: string): string {
  return text.replace(K_PATTERN, (_match, leading: string, trailing: string) => `${leading}Okay.${trailing ? "  " : ""}`);
}

function normalizeObjectionText(text: string): string {
  return text
    .replace(/\bFour\b/g, "Form")
    .replace(/\bfour\b/g, "form");
}

function cloneParagraph(
  paragraph: TranscriptParagraph,
  kind: TranscriptParagraph["kind"],
  label: string,
  text: string,
): TranscriptParagraph {
  return {
    ...paragraph,
    kind,
    label,
    text: normalizeParagraphArtifacts(text.trim()),
    sourceUtteranceIds: [...paragraph.sourceUtteranceIds],
    sourceWordIds: [...paragraph.sourceWordIds],
  };
}

function splitEmbeddedObjections(paragraph: TranscriptParagraph): TranscriptParagraph[] {
  const match = paragraph.text.match(OBJECTION_PATTERN);
  if (!match || match.index === undefined) {
    return [cloneParagraph(paragraph, paragraph.kind, paragraph.label, paragraph.text)];
  }

  const before = paragraph.text.slice(0, match.index).trim();
  const objectionText = normalizeObjectionText(match[0].trim());
  const after = paragraph.text.slice(match.index + match[0].length).trim();
  const result: TranscriptParagraph[] = [];

  if (before) {
    result.push(cloneParagraph(paragraph, "Q", "Q.", before));
  }

  result.push(cloneParagraph(paragraph, "COLLOQUY", DEFAULT_OBJECTION_LABEL, objectionText));

  if (after) {
    result.push(...splitEmbeddedObjections(cloneParagraph(paragraph, "Q", "Q.", after)));
  }

  return result;
}

function splitShortAnswerParagraph(paragraph: TranscriptParagraph): TranscriptParagraph[] {
  const questionMarkIndex = paragraph.text.indexOf("?");
  if (questionMarkIndex === -1) {
    return [cloneParagraph(paragraph, paragraph.kind, paragraph.label, paragraph.text)];
  }

  const questionText = paragraph.text.slice(0, questionMarkIndex + 1).trim();
  const remainder = paragraph.text.slice(questionMarkIndex + 1).trimStart();
  const answerMatch = remainder.match(SHORT_ANSWER_PATTERN);

  if (!answerMatch) {
    return [cloneParagraph(paragraph, paragraph.kind, paragraph.label, paragraph.text)];
  }

  const answerText = answerMatch[1].trim();
  const trailingQuestionText = remainder.slice(answerMatch[0].length).trim();
  const result: TranscriptParagraph[] = [
    cloneParagraph(paragraph, "Q", "Q.", questionText),
    cloneParagraph(paragraph, "A", "A.", answerText),
  ];

  if (trailingQuestionText) {
    result.push(...splitQParagraph(cloneParagraph(paragraph, "Q", "Q.", trailingQuestionText)));
  }

  return result;
}

export function splitQParagraph(paragraph: TranscriptParagraph): TranscriptParagraph[] {
  const normalized = cloneParagraph(paragraph, paragraph.kind, paragraph.label, paragraph.text);
  const objectionMatch = normalized.text.match(OBJECTION_PATTERN);

  if (objectionMatch && objectionMatch.index !== undefined) {
    const beforeObjection = normalized.text.slice(0, objectionMatch.index).trim();
    const afterObjection = normalized.text.slice(objectionMatch.index).trim();
    const leadingParts = beforeObjection
      ? splitShortAnswerParagraph(cloneParagraph(normalized, "Q", "Q.", beforeObjection))
      : [];
    const objectionParts = splitEmbeddedObjections(cloneParagraph(normalized, "Q", "Q.", afterObjection));
    return [...leadingParts, ...objectionParts];
  }

  return splitShortAnswerParagraph(normalized);
}

export function applyQaFixer(paragraphs: TranscriptParagraph[]): TranscriptParagraph[] {
  const result: TranscriptParagraph[] = [];

  for (const paragraph of paragraphs) {
    if (paragraph.kind === "Q") {
      result.push(...splitQParagraph(paragraph));
      continue;
    }

    result.push(cloneParagraph(paragraph, paragraph.kind, paragraph.label, paragraph.text));
  }

  return result;
}

import type { TranscriptParagraph } from "./transcriptParagraphTypes";

const SHORT_ANSWER_PATTERN = /^(Yes\.|No\.|Correct\.|I did\.|I do\.|I have\.|I don't\.)\s*/i;
const OBJECTION_PATTERN = /\bObjection\.\s*(?:Form\.|Foundation\.)?/i;
const K_PATTERN = /(^|\s)K\.(\s|$)/g;

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
  overrides?: Partial<Pick<TranscriptParagraph, "leadingText" | "words">>,
): TranscriptParagraph {
  const words = overrides?.words ?? [...(paragraph.words ?? [])];
  const leadingText = overrides?.leadingText ?? paragraph.leadingText ?? "";
  return {
    ...paragraph,
    kind,
    label,
    text: normalizeParagraphArtifacts(text.trim()),
    leadingText,
    words,
    sourceLines: [...(paragraph.sourceLines ?? [])],
    mode: paragraph.mode ?? "display",
    speakerId: paragraph.speakerId ?? null,
    sourceUtteranceIds: words.length > 0
      ? Array.from(new Set(words.map((word) => word.utterance_id)))
      : [...paragraph.sourceUtteranceIds],
    sourceWordIds: words.length > 0
      ? words.map((word) => word.word_id)
      : [...paragraph.sourceWordIds],
  };
}

function mergeParagraph(left: TranscriptParagraph, right: TranscriptParagraph): TranscriptParagraph {
  const leftWords = [...(left.words ?? [])];
  if (leftWords.length > 0) {
    const lastWord = leftWords[leftWords.length - 1];
    leftWords[leftWords.length - 1] = {
      ...lastWord,
      trailing_space: lastWord.trailing_space.length > 0 ? lastWord.trailing_space : " ",
    };
  }

  return {
    ...left,
    text: `${left.text} ${right.text}`.trim(),
    words: [...leftWords, ...(right.words ?? [])],
    sourceLines: [...(left.sourceLines ?? []), ...(right.sourceLines ?? [])],
    sourceUtteranceIds: Array.from(new Set([
      ...left.sourceUtteranceIds,
      ...right.sourceUtteranceIds,
    ])),
    sourceWordIds: [...left.sourceWordIds, ...right.sourceWordIds],
  };
}

function serializeParagraphWords(paragraph: TranscriptParagraph): string {
  return (paragraph.words ?? [])
    .map((word) => {
      const flag = paragraph.mode === "display" && word.inline_flag
        ? ` ${word.inline_flag}`
        : "";
      return `${word.text}${flag}${word.trailing_space}`;
    })
    .join("");
}

function sliceParagraphWords(
  paragraph: TranscriptParagraph,
  startIndex: number,
  endIndex: number,
): TranscriptParagraph["words"] {
  const prefixLength = paragraph.leadingText.length;
  const serializedWords = serializeParagraphWords(paragraph);
  const wordStart = Math.max(0, startIndex - prefixLength);
  const wordEnd = Math.max(0, endIndex - prefixLength);

  if (wordEnd <= 0 || wordStart >= serializedWords.length) {
    return [];
  }

  const selected: TranscriptParagraph["words"] = [];
  let offset = 0;

  for (const word of paragraph.words ?? []) {
    const flag = paragraph.mode === "display" && word.inline_flag
      ? ` ${word.inline_flag}`
      : "";
    const chunk = `${word.text}${flag}${word.trailing_space}`;
    const nextOffset = offset + chunk.length;
    if (nextOffset > wordStart && offset < wordEnd) {
      selected.push(word);
    }
    offset = nextOffset;
  }

  return selected;
}

function sliceParagraph(
  paragraph: TranscriptParagraph,
  kind: TranscriptParagraph["kind"],
  label: string,
  startIndex: number,
  endIndex: number,
  leadingText = "",
): TranscriptParagraph {
  const text = paragraph.text.slice(startIndex, endIndex).trim();
  return cloneParagraph(paragraph, kind, label, text, {
    leadingText,
    words: sliceParagraphWords(paragraph, startIndex, endIndex),
  });
}

function canMergeParagraphs(current: TranscriptParagraph | null, next: TranscriptParagraph): current is TranscriptParagraph {
  if (!current) {
    return false;
  }

  return current.kind === next.kind
    && current.region === next.region
    && current.kind !== "SECTION_HEADER"
    && current.kind !== "BY_LINE"
    && current.kind !== "DOCUMENT_BLOCK"
    && current.label === next.label;
}

function remergeConsecutive(paragraphs: TranscriptParagraph[]): TranscriptParagraph[] {
  const merged: TranscriptParagraph[] = [];

  for (const paragraph of paragraphs) {
    const previous = merged[merged.length - 1] ?? null;
    if (canMergeParagraphs(previous, paragraph)) {
      merged[merged.length - 1] = mergeParagraph(previous, paragraph);
      continue;
    }

    merged.push(paragraph);
  }

  return merged;
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
    result.push(sliceParagraph(paragraph, "Q", "Q.", 0, match.index, paragraph.leadingText));
  }

  result.push(sliceParagraph(
    paragraph,
    "COLLOQUY",
    paragraph.speakerLabel,
    match.index,
    match.index + match[0].length,
  ));
  result[result.length - 1].text = objectionText;

  if (after) {
    const afterParagraph = sliceParagraph(
      paragraph,
      "Q",
      "Q.",
      match.index + match[0].length,
      paragraph.text.length,
    );
    afterParagraph.text = after;
    result.push(...splitEmbeddedObjections(afterParagraph));
  }

  return result;
}

function splitShortAnswerParagraph(paragraph: TranscriptParagraph): TranscriptParagraph[] {
  const questionMarkIndex = paragraph.text.indexOf("?");
  if (questionMarkIndex === -1) {
    return [cloneParagraph(paragraph, paragraph.kind, paragraph.label, paragraph.text)];
  }

  const questionText = paragraph.text.slice(0, questionMarkIndex + 1).trim();
  const rawRemainder = paragraph.text.slice(questionMarkIndex + 1);
  const remainderTrimStart = rawRemainder.length - rawRemainder.trimStart().length;
  const remainder = rawRemainder.trimStart();
  const answerMatch = remainder.match(SHORT_ANSWER_PATTERN);

  if (!answerMatch) {
    return [cloneParagraph(paragraph, paragraph.kind, paragraph.label, paragraph.text)];
  }

  const answerText = answerMatch[1].trim();
  const trailingQuestionText = remainder.slice(answerMatch[0].length).trim();
  const answerStartIndex = questionMarkIndex + 1 + remainderTrimStart;
  const answerEndIndex = answerStartIndex + answerMatch[1].length;
  const trailingStartIndex = answerStartIndex + answerMatch[0].length;
  const result: TranscriptParagraph[] = [
    sliceParagraph(paragraph, "Q", "Q.", 0, questionMarkIndex + 1, paragraph.leadingText),
    sliceParagraph(paragraph, "A", "A.", answerStartIndex, answerEndIndex),
  ];

  result[0].text = questionText;
  result[1].text = answerText;

  if (trailingQuestionText) {
    const trailingParagraph = sliceParagraph(
      paragraph,
      "Q",
      "Q.",
      trailingStartIndex,
      paragraph.text.length,
    );
    trailingParagraph.text = trailingQuestionText;
    result.push(...splitQParagraph(trailingParagraph));
  }

  return result;
}

export function splitQParagraph(paragraph: TranscriptParagraph): TranscriptParagraph[] {
  const normalized = cloneParagraph(paragraph, paragraph.kind, paragraph.label, paragraph.text);
  const objectionMatch = normalized.text.match(OBJECTION_PATTERN);

  if (objectionMatch && objectionMatch.index !== undefined) {
    const beforeObjection = normalized.text.slice(0, objectionMatch.index).trim();
    const leadingParts = beforeObjection
      ? splitShortAnswerParagraph(sliceParagraph(
        normalized,
        "Q",
        "Q.",
        0,
        objectionMatch.index,
        normalized.leadingText,
      ))
      : [];
    const objectionParts = splitEmbeddedObjections(sliceParagraph(
      normalized,
      "Q",
      "Q.",
      objectionMatch.index,
      normalized.text.length,
    ));
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

  return remergeConsecutive(result);
}

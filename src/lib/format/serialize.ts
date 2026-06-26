import type { FormattedDocument, FormattedLine, FormattedWord } from "./types";

function serializeWord(word: FormattedWord): string {
  const inlineFlag = word.inline_flag ? ` ${word.inline_flag}` : "";
  return `${word.text}${inlineFlag}${word.trailing_space}`;
}

function serializeWords(line: FormattedLine): string {
  return line.words.map(serializeWord).join("");
}

function serializeWordsClean(line: FormattedLine): string {
  return line.words.map((word) => `${word.text}${word.trailing_space}`).join("");
}

function lineSeparator(line: FormattedLine): string {
  return line.role === "speaker_label" ? "  " : " ";
}

export function serializeFormattedLine(line: FormattedLine): string {
  const body = serializeWords(line);
  const flags = line.flags.length > 0 ? ` [${line.flags.join(", ")}]` : "";
  return `${line.prefix_text}${lineSeparator(line)}${body}${flags}`.trimEnd();
}

export function serializeFormattedDocument(document: FormattedDocument): string {
  return document.lines.map(serializeFormattedLine).join("\n");
}

export function serializeFormattedLineClean(line: FormattedLine): string {
  const body = serializeWordsClean(line);
  return `${line.prefix_text}${lineSeparator(line)}${body}`.trimEnd();
}

export function serializeFormattedDocumentClean(document: FormattedDocument): string {
  return document.lines.map(serializeFormattedLineClean).join("\n");
}

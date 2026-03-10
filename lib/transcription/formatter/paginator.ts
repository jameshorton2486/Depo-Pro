import type { JurisdictionConfig, PaginatedParagraph, Paragraph } from './types';

export function paginateParagraphs(
  paragraphs: Paragraph[],
  jurisdiction: JurisdictionConfig
): PaginatedParagraph[] {
  const limit = jurisdiction.lines_per_page;
  const result: PaginatedParagraph[] = [];
  let page = 1;
  let line = 1;

  for (const paragraph of paragraphs) {
    const lineCount = countParagraphLines(paragraph, jurisdiction);
    if (line + lineCount - 1 > limit) {
      page += 1;
      line = 1;
    }

    result.push({
      ...paragraph,
      line_count: lineCount,
      page_number: page,
      line_number_start: line,
      line_number_end: line + lineCount - 1,
    });
    line += lineCount;
  }

  return result;
}

function countParagraphLines(paragraph: Paragraph, jurisdiction: JurisdictionConfig): number {
  const charsPerLine = jurisdiction.min_chars_per_line;

  switch (paragraph.paragraph_type) {
    case 'QUESTION':
    case 'ANSWER':
      return countWrappedLines(
        paragraph.text,
        charsPerLine - jurisdiction.qa_text_offset_spaces - ((paragraph.speaker_label?.length ?? 2) + 1),
        charsPerLine - jurisdiction.qa_text_offset_spaces
      );
    case 'COLLOQUY':
      return countWrappedLines(
        paragraph.text,
        charsPerLine - jurisdiction.colloquy_indent_spaces - ((paragraph.speaker_label?.length ?? 2) + 1),
        charsPerLine - jurisdiction.colloquy_indent_spaces
      );
    case 'PARENTHETICAL':
      return countWrappedLines(paragraph.text, charsPerLine, charsPerLine);
    default:
      return Math.max(paragraph.line_count, 1);
  }
}

function countWrappedLines(text: string, firstMax: number, continuationMax: number): number {
  if (!text.trim()) return 1;
  const words = text.split(/\s+/);
  let lines = 1;
  let currentLength = 0;
  let max = Math.max(firstMax, 1);

  for (const word of words) {
    if (currentLength === 0) {
      currentLength = word.length;
      continue;
    }

    if (currentLength + 1 + word.length <= max) {
      currentLength += 1 + word.length;
      continue;
    }

    lines += 1;
    currentLength = word.length;
    max = Math.max(continuationMax, 1);
  }

  return lines;
}

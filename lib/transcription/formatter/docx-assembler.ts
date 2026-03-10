import {
  AlignmentType,
  Document,
  Footer,
  Header,
  Packer,
  PageNumber,
  Paragraph as DocxParagraph,
  TextRun,
  convertInchesToTwip,
} from 'docx';
import type { JurisdictionConfig, PaginatedParagraph } from './types';
import type { InclusionPages } from './inclusion-pages';

export interface DocxAssemblerOptions {
  transcriptionId: string;
  jobMetadata: {
    caseName: string;
    deponentName: string;
    depositionDate: string;
    reporterName: string;
    reporterCsrNumber: string;
  };
  jurisdiction: JurisdictionConfig;
}

export async function assembleDocx(
  paragraphs: PaginatedParagraph[],
  inclusionPages: InclusionPages,
  options: DocxAssemblerOptions
): Promise<Buffer> {
  const children: DocxParagraph[] = [];

  for (const block of [
    inclusionPages.title,
    inclusionPages.appearance,
    inclusionPages.index,
  ]) {
    pushMultiline(children, block);
    children.push(new DocxParagraph({ pageBreakBefore: true }));
  }

  let currentPage = 1;
  for (const paragraph of paragraphs) {
    if (paragraph.page_number > currentPage) {
      children.push(new DocxParagraph({ pageBreakBefore: true }));
      currentPage = paragraph.page_number;
    }

    const renderedLines = formatParagraphLines(paragraph, options.jurisdiction);
    let lineNumber = paragraph.line_number_start;

    for (const line of renderedLines) {
      children.push(
        new DocxParagraph({
          spacing: { before: 0, after: 0, line: 240 },
          children: [
            new TextRun({
              text: `${String(lineNumber).padStart(2, ' ')}  ${line}`,
              font: 'Courier New',
              size: 24,
            }),
          ],
        })
      );
      lineNumber += 1;
    }
  }

  children.push(new DocxParagraph({ pageBreakBefore: true }));
  pushMultiline(children, inclusionPages.certification);

  const document = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(options.jurisdiction.left_margin_inches),
              right: convertInchesToTwip(options.jurisdiction.right_margin_inches),
            },
            size: {
              width: convertInchesToTwip(8.5),
              height: convertInchesToTwip(11),
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new DocxParagraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: options.jobMetadata.caseName,
                    font: 'Courier New',
                    size: 24,
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new DocxParagraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: '- ', font: 'Courier New', size: 24 }),
                  new TextRun({ children: [PageNumber.CURRENT], font: 'Courier New', size: 24 }),
                  new TextRun({ text: ' -', font: 'Courier New', size: 24 }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  const buffer = await Packer.toBuffer(document);
  return Buffer.from(buffer);
}

function pushMultiline(target: DocxParagraph[], block: string) {
  for (const line of block.split(/\r?\n/)) {
    target.push(
      new DocxParagraph({
        children: [new TextRun({ text: line, font: 'Courier New', size: 24 })],
      })
    );
  }
}

function formatParagraphLines(
  paragraph: PaginatedParagraph,
  jurisdiction: JurisdictionConfig
): string[] {
  const tab1 = ' '.repeat(jurisdiction.qa_signifier_spaces);
  const tab3 = ' '.repeat(jurisdiction.colloquy_indent_spaces);

  switch (paragraph.paragraph_type) {
    case 'QUESTION':
    case 'ANSWER':
      return [`${tab1}${paragraph.speaker_label ?? 'Q.'}  ${paragraph.text}`];
    case 'COLLOQUY':
      return [`${tab3}${paragraph.speaker_label ?? ''}  ${paragraph.text}`.trimEnd()];
    default:
      return [paragraph.text];
  }
}

import type { ValidationBlock } from "./correctionValidator";
import { applyEditorialRules } from "./editorialEngine";
import { checkGeometry, renderBlock, type FormattedParagraph, type GeometryViolation } from "./geometryEngine";

export type { FormattedParagraph, GeometryViolation } from "./geometryEngine";

export interface FormattingResult {
  formatted_text: string;
  docx_paragraphs: FormattedParagraph[];
  geometry_violations: GeometryViolation[];
  metrics: {
    engine: "formatting_engine";
    blocks_formatted: number;
    q_lines: number;
    a_lines: number;
    sp_lines: number;
    pn_lines: number;
    header_lines: number;
    total_characters: number;
    geometry_violations: { errors: number; warnings: number; auto_fixed: number };
    punctuation_corrections: number;
    number_formatting_applied: number;
    output_ready: boolean;
  };
}

export { checkGeometry } from "./geometryEngine";
export function formatTranscriptBlocks(blocks: ValidationBlock[]): FormattingResult {
  let punctuationCorrections = 0;
  let numberFormattingApplied = 0;
  const rendered = blocks.flatMap((block) => {
    const editorial = applyEditorialRules(block.text);
    punctuationCorrections += editorial.punctuationCorrections;
    numberFormattingApplied += editorial.numberFormattingApplied;
    return renderBlock({ ...block, text: editorial.text });
  });

  const geometryViolations = checkGeometry(rendered);
  const formattedText = rendered.map((paragraph) => paragraph.text).join("\n");
  const errorCount = geometryViolations.filter((issue) => issue.severity === "ERROR").length;
  const warningCount = geometryViolations.filter((issue) => issue.severity === "WARNING").length;

  return {
    formatted_text: formattedText,
    docx_paragraphs: rendered,
    geometry_violations: geometryViolations,
    metrics: {
      engine: "formatting_engine",
      blocks_formatted: blocks.length,
      q_lines: blocks.filter((block) => block.block_type === "Q").length,
      a_lines: blocks.filter((block) => block.block_type === "A").length,
      sp_lines: blocks.filter((block) => block.block_type === "SP").length,
      pn_lines: blocks.filter((block) => block.block_type === "PN").length,
      header_lines: blocks.filter((block) => block.block_type === "HEADER").length,
      total_characters: formattedText.length,
      geometry_violations: {
        errors: errorCount,
        warnings: warningCount,
        auto_fixed: punctuationCorrections + numberFormattingApplied,
      },
      punctuation_corrections: punctuationCorrections,
      number_formatting_applied: numberFormattingApplied,
      output_ready: errorCount === 0,
    },
  };
}

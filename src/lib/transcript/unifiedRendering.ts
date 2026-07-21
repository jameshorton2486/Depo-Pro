import type { EntityRegistry } from "./entityRegistry";
import type { GeometryLayoutLine, GeometryLayoutModel } from "./geometryEngine";
import type { StructuredTranscriptPackage } from "./structuredTranscriptPackage";
import type { TranscriptParagraph, TranscriptParagraphKind } from "./transcriptParagraphTypes";

export interface UnifiedRenderModelInput {
  transcriptPackage: StructuredTranscriptPackage;
  geometry: GeometryLayoutModel;
  entityRegistry?: EntityRegistry | null;
}

export interface UnifiedRenderLine {
  paragraphId: string;
  kind: TranscriptParagraphKind;
  content: string;
  sourceUtteranceIds: string[];
  sourceWordIds: string[];
  geometry: GeometryLayoutLine;
}

export interface UnifiedRenderModel {
  transcriptId: string;
  geometry: Omit<GeometryLayoutModel, "lines">;
  lines: UnifiedRenderLine[];
  entityRegistryEntryCount: number;
}

export interface WorkspaceRenderModel {
  transcriptId: string;
  lines: UnifiedRenderLine[];
}

export interface TxtRender {
  content: string;
  lineContents: string[];
}

export function buildUnifiedRenderModel(input: UnifiedRenderModelInput | null | undefined): UnifiedRenderModel {
  const transcriptPackage = input?.transcriptPackage;
  const geometry = input?.geometry;
  const geometryByParagraphId = new Map(
    (geometry?.lines ?? [])
      .filter((line): line is GeometryLayoutLine & { paragraph_id: string } => line?.paragraph_id !== null)
      .map((line) => [line.paragraph_id, line]),
  );

  return {
    transcriptId: transcriptPackage?.transcriptId ?? "",
    geometry: {
      format_box_width_inches: geometry?.format_box_width_inches ?? 0,
      left_margin_inches: geometry?.left_margin_inches ?? 0,
      right_margin_inches: geometry?.right_margin_inches ?? 0,
      line_spacing_points: geometry?.line_spacing_points ?? 0,
      lines_per_page: geometry?.lines_per_page ?? 0,
    },
    lines: (transcriptPackage?.paragraphs ?? []).map((entry) => {
      const paragraph = entry?.paragraph;
      const paragraphId = entry?.id ?? "";

      return {
        paragraphId,
        kind: paragraph?.kind ?? "COLLOQUY",
        content: renderParagraphContent(paragraph),
        sourceUtteranceIds: [...(entry?.sourceUtteranceIds ?? [])],
        sourceWordIds: [...(entry?.sourceWordIds ?? [])],
        geometry: geometryByParagraphId.get(paragraphId) ?? fallbackGeometry(paragraphId),
      };
    }),
    entityRegistryEntryCount: input?.entityRegistry?.entries?.length ?? 0,
  };
}

export function renderWorkspace(model: UnifiedRenderModel): WorkspaceRenderModel {
  return {
    transcriptId: model.transcriptId,
    lines: model.lines.map((line) => ({
      ...line,
      sourceUtteranceIds: [...line.sourceUtteranceIds],
      sourceWordIds: [...line.sourceWordIds],
      geometry: { ...line.geometry },
    })),
  };
}

export function renderTxt(model: UnifiedRenderModel): TxtRender {
  const lineContents = model.lines.map((line) => line.content);
  return {
    content: lineContents.join("\n\n"),
    lineContents,
  };
}

export function validateRenderParity(model: UnifiedRenderModel): string[] {
  const workspace = renderWorkspace(model);
  const txt = renderTxt(model);
  const errors: string[] = [];

  if (workspace.lines.length !== txt.lineContents.length) {
    errors.push("workspace and TXT line counts differ");
  }

  workspace.lines.forEach((line, index) => {
    const txtContent = txt.lineContents[index];
    if (txtContent !== undefined && line.content !== txtContent) {
      errors.push(`workspace and TXT content differ for paragraph ${line.paragraphId}`);
    }
    if (line.geometry.paragraph_index < 0) {
      errors.push(`geometry is missing for paragraph ${line.paragraphId}`);
    }
  });

  return errors;
}

function renderParagraphContent(paragraph: TranscriptParagraph | null | undefined): string {
  if (!paragraph) {
    return "";
  }

  if (paragraph.kind === "SECTION_HEADER" || paragraph.kind === "BY_LINE" || paragraph.kind === "PARENTHETICAL") {
    return paragraph.text;
  }

  if (paragraph.kind === "Q" || paragraph.kind === "A") {
    return `${paragraph.label} ${paragraph.text}`.trim();
  }

  return paragraph.label ? `${paragraph.label}:  ${paragraph.text}`.trim() : paragraph.text;
}

function fallbackGeometry(paragraphId: string): GeometryLayoutLine {
  return {
    paragraph_index: -1,
    paragraph_id: paragraphId,
    role: "speaker",
    first_line_tab_inches: 0,
    text_tab_inches: null,
    continuation_indent_inches: 0,
  };
}

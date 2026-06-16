import { loadOrderedTranscriptSnapshotsForCase } from "../../api/transcriptRepository";
import { buildResolvedSpeakerViews } from "../../lib/transcript/resolvedSpeakers";
import { buildTranscriptParagraphs } from "../../lib/transcript/workspaceParagraphs";
import type { CaseRecord } from "../../types/case";
import {
  buildTranscriptDocxBlob,
  buildTranscriptDocxBlobFromParagraphSpecs,
  buildTranscriptDocxParagraphSpecsFromParagraphModel,
  type TranscriptDocxParagraphSpec,
} from "./docxFormatter";
import type { ExportSegmentDocument } from "./exportAssembly";

const USE_STAGE_S_EXPORT = (
  import.meta as ImportMeta & {
    env?: Record<string, string | undefined>;
  }
).env?.VITE_USE_STAGE_S_EXPORT === "true";

type TranscriptSnapshot = Awaited<ReturnType<typeof loadOrderedTranscriptSnapshotsForCase>>[number];

export interface ExportTranscriptSegment extends ExportSegmentDocument {
  snapshot?: TranscriptSnapshot;
}

interface BuildExportDocxBlobOptions {
  useStageSExport?: boolean;
  buildLegacyBlob?: (segments: ExportSegmentDocument[]) => Promise<Blob>;
  buildStageSBlob?: (segments: ExportTranscriptSegment[], record: CaseRecord) => Promise<Blob>;
}

export async function buildExportDocxBlob(
  segments: ExportTranscriptSegment[],
  record: CaseRecord,
  options: BuildExportDocxBlobOptions = {},
): Promise<Blob> {
  const useStageSExport = options.useStageSExport ?? USE_STAGE_S_EXPORT;

  if (!useStageSExport) {
    return (options.buildLegacyBlob ?? buildTranscriptDocxBlob)(segments);
  }

  return (options.buildStageSBlob ?? buildStageSDocxBlob)(segments, record);
}

export async function buildStageSDocxBlob(
  segments: ExportTranscriptSegment[],
  record: CaseRecord,
): Promise<Blob> {
  const paragraphSpecs = buildStageSDocxParagraphSpecs(segments, record);
  return buildTranscriptDocxBlobFromParagraphSpecs(paragraphSpecs);
}

export function buildStageSDocxParagraphSpecs(
  segments: ExportTranscriptSegment[],
  record: CaseRecord,
): TranscriptDocxParagraphSpec[] {
  const ordered = segments
    .slice()
    .sort((left, right) => left.sequenceIndex - right.sequenceIndex);

  return ordered.flatMap((segment) => {
    const resolvedSpeakers = segment.snapshot
      ? buildResolvedSpeakerViews(segment.snapshot.speakers, segment.snapshot.speakerResolutionOverlay)
      : [];
    const paragraphModel = buildTranscriptParagraphs(segment.document, resolvedSpeakers, record);
    return buildTranscriptDocxParagraphSpecsFromParagraphModel(paragraphModel);
  });
}

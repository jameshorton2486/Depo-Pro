import type { SpeakerMapConfirmationResult } from "../../api/workspaceService";

export const UNCONFIRMED_SPEAKER_MAP_DRAFT_BANNER =
  "DRAFT - UNCONFIRMED SPEAKER MAP - NOT FOR CERTIFICATION";

export type ExportFormat = "txt" | "docx" | "package" | (string & {});
export type ExportLane = "draft" | "certified";

export interface GuardedExportContext {
  banner: string | null;
}

export type GuardedExportResult<T> =
  | {
      ok: false;
      lane: ExportLane;
      message: string;
      cta: ExportBlockCallToAction | null;
    }
  | {
      ok: true;
      lane: ExportLane;
      artifact: T;
      banner: string | null;
    };

export interface ExportBlockCallToAction {
  label: "Map Speakers Now";
  transcriptId: string;
  caseId: string;
  sidebarTab: "speakers";
}

export function classifyExportLane(format: ExportFormat): ExportLane {
  return format === "txt" ? "draft" : "certified";
}

export function prependDraftBanner(text: string, banner: string = UNCONFIRMED_SPEAKER_MAP_DRAFT_BANNER): string {
  return `${banner}\n\n${text}`;
}

export function buildSpeakerMappingCallToAction(
  speakerMap: SpeakerMapConfirmationResult,
): ExportBlockCallToAction | null {
  if (speakerMap.confirmed || !speakerMap.transcriptId || !speakerMap.caseId) {
    return null;
  }

  return {
    label: "Map Speakers Now",
    transcriptId: speakerMap.transcriptId,
    caseId: speakerMap.caseId,
    sidebarTab: "speakers",
  };
}

export async function executeGuardedExport<T>(
  format: ExportFormat,
  speakerMap: SpeakerMapConfirmationResult,
  produce: (context: GuardedExportContext) => Promise<T> | T,
): Promise<GuardedExportResult<T>> {
  const lane = classifyExportLane(format);

  if (lane === "certified" && !speakerMap.confirmed) {
    return {
      ok: false,
      lane,
      message: "Certified export is unavailable because speaker roles have not been confirmed.",
      cta: buildSpeakerMappingCallToAction(speakerMap),
    };
  }

  const banner = !speakerMap.confirmed && lane === "draft"
    ? UNCONFIRMED_SPEAKER_MAP_DRAFT_BANNER
    : null;

  return {
    ok: true,
    lane,
    artifact: await produce({ banner }),
    banner,
  };
}

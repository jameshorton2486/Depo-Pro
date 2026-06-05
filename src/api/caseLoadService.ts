import { loadCase } from "./caseService";
import { listCaseAudio, listCaseFiles, type CaseAudioRecord, type CaseFileRecord } from "./fileService";
import type { CaseRecord } from "../types/case";

// Intake uses this now; workspace, exhibits, and export should restore through
// the same bundle seam instead of re-implementing case/file/audio hydration.
export interface CaseBundle {
  record: CaseRecord;
  files: CaseFileRecord[];
  audio: CaseAudioRecord[];
}

export async function loadCaseBundle(caseId: string): Promise<CaseBundle | null> {
  const [record, files, audio] = await Promise.all([
    loadCase(caseId),
    listCaseFiles(caseId),
    listCaseAudio(caseId),
  ]);

  if (!record) {
    return null;
  }

  return {
    record,
    files,
    audio,
  };
}

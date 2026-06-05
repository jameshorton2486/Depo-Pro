import { loadCase } from "./caseService";
import { listCaseAudio, listCaseFiles, type CaseAudioRecord, type CaseFileRecord } from "./fileService";
import { listFieldProvenance } from "./provenanceService";
import type { FieldProvenanceRow } from "../components/conflict/types";
import type { CaseRecord } from "../types/case";

// Intake uses this now; workspace, exhibits, and export should restore through
// the same bundle seam instead of re-implementing case/file/audio hydration.
export interface CaseBundle {
  record: CaseRecord;
  files: CaseFileRecord[];
  audio: CaseAudioRecord[];
  provenance: FieldProvenanceRow[];
}

export async function loadCaseBundle(caseId: string): Promise<CaseBundle | null> {
  const [record, files, audio, provenance] = await Promise.all([
    loadCase(caseId),
    listCaseFiles(caseId),
    listCaseAudio(caseId),
    listFieldProvenance(caseId),
  ]);

  if (!record) {
    return null;
  }

  return {
    record,
    files,
    audio,
    provenance,
  };
}

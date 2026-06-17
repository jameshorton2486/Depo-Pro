import { loadCase } from "./caseService";
import { listCaseAudio, listCaseFiles, type CaseAudioRecord, type CaseFileRecord } from "./fileService";
import { listFieldProvenance } from "./provenanceService";
import { listCompletedTranscriptJobs, type TranscriptJobRow } from "./transcriptRepository";
import type { FieldProvenanceRow } from "../components/conflict/types";
import type { CaseRecord } from "../types/case";

// Intake uses this now; workspace, exhibits, and export should restore through
// the same bundle seam instead of re-implementing case/file/audio hydration.
export interface CaseBundle {
  record: CaseRecord;
  files: CaseFileRecord[];
  audio: CaseAudioRecord[];
  transcripts: TranscriptJobRow[];
  provenance: FieldProvenanceRow[];
}

export async function loadCaseBundle(caseId: string): Promise<CaseBundle | null> {
  const [record, files, audio, transcripts, provenance] = await Promise.all([
    loadCase(caseId),
    listCaseFiles(caseId),
    listCaseAudio(caseId),
    listCompletedTranscriptJobs(caseId),
    listFieldProvenance(caseId),
  ]);

  if (!record) {
    return null;
  }

  return {
    record,
    files,
    audio,
    transcripts,
    provenance,
  };
}
